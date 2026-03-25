import re

class TemplateEngine:
    PATTERN = re.compile(r"\{\{(\w+)\}\}")

    def render(self, template: str, variables: dict) -> str:
        def replacer(match):
            key = match.group(1)
            return str(variables.get(key, match.group(0)))
        return self.PATTERN.sub(replacer, template)

    def extract_variables(self, template: str) -> list[str]:
        return sorted(set(self.PATTERN.findall(template)))

    def validate(self, schema: list[dict], variables: dict) -> bool:
        for field in schema:
            if field.get("required", True) and field["name"] not in variables:
                return False
        return True
