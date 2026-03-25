import { useState, useEffect } from 'react'
import { Select, Button, Popconfirm, Space, Typography, message, Spin } from 'antd'
import { listConfigs } from '../api/modelConfigs'
import { listJudgeTemplates, judgeRun } from '../api/judge'

const { Text } = Typography

interface Props {
  runId: number
  onJudged?: () => void
}

export default function JudgePanel({ runId, onJudged }: Props) {
  const [models, setModels] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [modelId, setModelId] = useState<number>()
  const [templateId, setTemplateId] = useState<number>()
  const [judgedCount, setJudgedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [judging, setJudging] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    listConfigs().then(r => setModels(r.data)).catch(() => {})
    listJudgeTemplates().then(r => setTemplates(r.data)).catch(() => {})
  }, [])

  const checkCounts = async () => {
    if (!modelId || !templateId) {
      message.warning('请先选择评测模型与模板')
      return
    }
    try {
      const res = await judgeRun(runId, {
        judge_model_id: modelId,
        judge_template_id: templateId,
        mode: 'check',
      })
      setJudgedCount(res.data.judged ?? 0)
      setPendingCount(res.data.pending ?? 0)
      setChecked(true)
    } catch {
      message.error('查询评测状态失败')
    }
  }

  useEffect(() => {
    if (modelId && templateId) {
      setChecked(false)
      checkCounts()
    }
  }, [modelId, templateId])

  const doJudge = async (mode: string) => {
    if (!modelId || !templateId) return
    try {
      setJudging(true)
      await judgeRun(runId, {
        judge_model_id: modelId,
        judge_template_id: templateId,
        mode,
      })
      message.success('评测任务已提交')
      onJudged?.()
      checkCounts()
    } catch {
      message.error('评测请求失败')
    } finally {
      setJudging(false)
    }
  }

  return (
    <div style={{ padding: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Select
        style={{ width: 220 }}
        placeholder="评测模型"
        options={models.map((m: any) => ({ label: `${m.provider_type}/${m.model_name}`, value: m.id }))}
        value={modelId}
        onChange={setModelId}
      />
      <Select
        style={{ width: 220 }}
        placeholder="评测模板"
        options={templates.map((t: any) => ({ label: t.name, value: t.id }))}
        value={templateId}
        onChange={setTemplateId}
      />
      {checked && (
        <Space wrap>
          <Text type="secondary">已评 {judgedCount}，待评 {pendingCount}</Text>
          {judging ? <Spin size="small" /> : (
            <>
              <Button type="primary" size="small" onClick={() => doJudge('incremental')} disabled={pendingCount === 0}>
                仅评新增（{pendingCount}）
              </Button>
              <Popconfirm title="确定对所有结果重新评测？" okText="确定" cancelText="取消" onConfirm={() => doJudge('full')}>
                <Button size="small" danger>全部重评（{judgedCount + pendingCount}）</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      )}
    </div>
  )
}
