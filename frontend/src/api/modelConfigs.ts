import client from './client'

export const listConfigs = () => client.get('/api/model-configs')
export const createConfig = (data: Record<string, unknown>) => client.post('/api/model-configs', data)
export const updateConfig = (id: number, data: Record<string, unknown>) => client.put(`/api/model-configs/${id}`, data)
export const deleteConfig = (id: number) => client.delete(`/api/model-configs/${id}`)
export const testConfig = (id: number) => client.post(`/api/model-configs/${id}/test`)
