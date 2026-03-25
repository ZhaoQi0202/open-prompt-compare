import client from './client'

export const judgeRun = (runId: number, data: Record<string, unknown>) => client.post(`/api/runs/${runId}/judge`, data)
export const updateJudgeResult = (id: number, data: Record<string, unknown>) => client.put(`/api/judge-results/${id}`, data)
export const listJudgeTemplates = () => client.get('/api/judge-templates')
