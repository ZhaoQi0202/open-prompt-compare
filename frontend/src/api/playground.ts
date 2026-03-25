import client from './client'

export const playgroundRun = (data: { template_content: string; variables: Record<string, string>; model_config_id: number }) =>
  client.post('/api/playground/run', data)
