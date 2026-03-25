import client from './client'

export const createRun = (data: Record<string, unknown>) => client.post('/api/runs', data)
export const getRun = (id: number) => client.get(`/api/runs/${id}`)
export const getResults = (id: number, params?: Record<string, unknown>) => client.get(`/api/runs/${id}/results`, { params })
export const getCompare = (id: number, params?: Record<string, unknown>) => client.get(`/api/runs/${id}/compare`, { params })
export const cancelRun = (id: number) => client.post(`/api/runs/${id}/cancel`)
export const listProjectRuns = (projectId: number, params?: Record<string, unknown>) => client.get(`/api/projects/${projectId}/runs`, { params })
