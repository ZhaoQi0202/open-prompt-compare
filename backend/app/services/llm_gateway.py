import asyncio
import re
import time
import httpx
from app import crypto
from app.config import settings
from app.services.template_engine import TemplateEngine


class LLMGateway:
    def __init__(self):
        self._semaphores: dict[int, asyncio.Semaphore] = {}
        self._template_engine = TemplateEngine()

    def get_semaphore(self, config_id: int, max_concurrency: int) -> asyncio.Semaphore:
        if config_id not in self._semaphores:
            self._semaphores[config_id] = asyncio.Semaphore(max_concurrency)
        return self._semaphores[config_id]

    async def call(self, model_config, messages: list[dict], max_retries: int = 3, timeout: int = 60) -> str:
        api_key = ""
        if model_config.api_key_encrypted:
            api_key = crypto.decrypt(model_config.api_key_encrypted, settings.encryption_key)

        if model_config.provider_type == "custom_http":
            return await self.call_custom_http(
                base_url=model_config.base_url,
                api_key=api_key,
                model=model_config.model_name,
                messages=messages,
                headers_template=model_config.custom_headers,
                body_template=model_config.custom_body_template,
                response_path=model_config.response_extract_path,
                max_retries=max_retries,
                timeout=timeout,
            )
        return await self.call_openai_compat(
            base_url=model_config.base_url,
            api_key=api_key,
            model=model_config.model_name,
            messages=messages,
            max_retries=max_retries,
            timeout=timeout,
        )

    async def call_openai_compat(self, base_url: str, api_key: str, model: str,
                                  messages: list[dict], max_retries: int = 3, timeout: int = 60) -> str:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        body = {"model": model, "messages": messages}
        data = await self._request_with_retry(base_url, headers, body, max_retries, timeout)
        return self._extract_response(data, "choices[0].message.content")

    async def call_custom_http(self, base_url: str, api_key: str, model: str,
                                messages: list[dict], headers_template: dict | None,
                                body_template: str | None, response_path: str,
                                max_retries: int = 3, timeout: int = 60) -> str:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if headers_template:
            for k, v in headers_template.items():
                headers[k] = self._template_engine.render(str(v), {"api_key": api_key, "model": model})

        if body_template:
            import json
            rendered = self._template_engine.render(body_template, {
                "api_key": api_key,
                "model": model,
                "messages": json.dumps(messages),
            })
            body = json.loads(rendered)
        else:
            body = {"model": model, "messages": messages}

        data = await self._request_with_retry(base_url, headers, body, max_retries, timeout)
        return self._extract_response(data, response_path)

    async def _request_with_retry(self, url: str, headers: dict, body: dict,
                                   max_retries: int, timeout: int) -> dict:
        last_error = None
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=body, headers=headers)
                if resp.status_code == 429 or resp.status_code >= 500:
                    last_error = Exception(f"HTTP {resp.status_code}: {resp.text}")
                    await asyncio.sleep(2 ** attempt)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError:
                raise
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
        raise last_error

    def _extract_response(self, data: dict, path: str) -> str:
        current = data
        for part in re.split(r'\.', path):
            match = re.match(r'^(\w+)\[(\d+)\]$', part)
            if match:
                current = current[match.group(1)][int(match.group(2))]
            else:
                current = current[part]
        return str(current)
