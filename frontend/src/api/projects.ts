import client from './client'

export const listProjects = () => client.get('/api/projects')
export const createProject = (data: { name: string; description?: string }) => client.post('/api/projects', data)
export const getProject = (id: number) => client.get(`/api/projects/${id}`)
export const updateProject = (id: number, data: { name?: string; description?: string }) => client.put(`/api/projects/${id}`, data)
export const deleteProject = (id: number) => client.delete(`/api/projects/${id}`)
export const listPrompts = (projectId: number) => client.get(`/api/projects/${projectId}/prompts`)
export const listRuns = (projectId: number) => client.get(`/api/projects/${projectId}/runs`)
