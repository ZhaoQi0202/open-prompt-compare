import client from './client'

export const listSuites = (projectId: number) => client.get(`/api/projects/${projectId}/test-suites`)
export const createSuite = (projectId: number, data: { prompt_id: number; name: string; description?: string }) => client.post(`/api/projects/${projectId}/test-suites`, data)
export const deleteSuite = (id: number) => client.delete(`/api/test-suites/${id}`)
export const listCases = (suiteId: number) => client.get(`/api/test-suites/${suiteId}/test-cases`)
export const createCase = (suiteId: number, data: Record<string, unknown>) => client.post(`/api/test-suites/${suiteId}/test-cases`, data)
export const updateCase = (id: number, data: Record<string, unknown>) => client.put(`/api/test-cases/${id}`, data)
export const deleteCase = (id: number) => client.delete(`/api/test-cases/${id}`)
export const importCases = (suiteId: number, data: unknown[]) => client.post(`/api/test-suites/${suiteId}/import`, data)
