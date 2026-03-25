import client from './client'

export const createPrompt = (projectId: number, data: { name: string; content?: string }) => client.post(`/api/projects/${projectId}/prompts`, data)
export const updatePrompt = (id: number, data: { name?: string; content?: string }) => client.put(`/api/prompts/${id}`, data)
export const deletePrompt = (id: number) => client.delete(`/api/prompts/${id}`)
export const createVersion = (promptId: number, data: { template_content: string; variables_schema?: unknown; change_note?: string }) => client.post(`/api/prompts/${promptId}/versions`, data)
export const listVersions = (promptId: number) => client.get(`/api/prompts/${promptId}/versions`)
export const diffVersions = (v1: number, v2: number) => client.get(`/api/prompt-versions/${v1}/diff/${v2}`)
