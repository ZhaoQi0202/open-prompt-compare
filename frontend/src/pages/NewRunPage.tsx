import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Checkbox, Button, message, Statistic, Typography } from 'antd'
import { listPrompts } from '../api/projects'
import { listVersions } from '../api/prompts'
import { listSuites, listCases } from '../api/testSuites'
import { listConfigs } from '../api/modelConfigs'
import { createRun } from '../api/runs'

export default function NewRunPage() {
  const { projectId } = useParams()
  const pid = Number(projectId)
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [prompts, setPrompts] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [suites, setSuites] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])
  const [selectedModels, setSelectedModels] = useState<number[]>([])
  const [caseCount, setCaseCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listPrompts(pid).then(r => setPrompts(r.data)).catch(() => message.error('加载提示词失败'))
    listConfigs().then(r => setModels(r.data)).catch(() => message.error('加载模型配置失败'))
  }, [pid])

  const onPromptChange = async (promptId: number) => {
    setVersions([])
    setSelectedVersions([])
    setSuites([])
    setCaseCount(0)
    form.setFieldsValue({ prompt_versions: [], test_suite_id: undefined })
    try {
      const [vRes, sRes] = await Promise.all([listVersions(promptId), listSuites(pid)])
      setVersions(vRes.data)
      setSuites(sRes.data)
    } catch {
      message.error('加载提示词数据失败')
    }
  }

  const onSuiteChange = async (suiteId: number) => {
    try {
      const res = await listCases(suiteId)
      setCaseCount(Array.isArray(res.data) ? res.data.length : 0)
    } catch {
      setCaseCount(0)
    }
  }

  const totalCalls = selectedVersions.length * selectedModels.length * caseCount

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const res = await createRun({
        name: values.name,
        project_id: pid,
        prompt_id: values.prompt_id,
        prompt_versions: values.prompt_versions,
        model_configs: values.model_configs,
        test_suite_id: values.test_suite_id,
      })
      message.success('任务已创建')
      navigate(`/projects/${pid}/runs/${res.data.id}`)
    } catch {
      message.error('创建任务失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="opc-page" style={{ maxWidth: 720 }}>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>新建运行</Typography.Title>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
          <Input placeholder="例如：v1 与 v2 对比实验" />
        </Form.Item>

        <Form.Item name="prompt_id" label="提示词" rules={[{ required: true, message: '请选择提示词' }]}>
          <Select
            placeholder="选择提示词"
            options={prompts.map((p: any) => ({ label: p.name, value: p.id }))}
            onChange={onPromptChange}
          />
        </Form.Item>

        {versions.length > 0 && (
          <Form.Item name="prompt_versions" label="提示词版本" rules={[{ required: true, message: '请至少选择一个版本' }]}>
            <Checkbox.Group
              options={versions.map((v: any) => ({ label: `v${v.version_number} ${v.change_note ? `（${v.change_note}）` : ''}`, value: v.id }))}
              onChange={(vals) => setSelectedVersions(vals as number[])}
            />
          </Form.Item>
        )}

        <Form.Item name="test_suite_id" label="测试集" rules={[{ required: true, message: '请选择测试集' }]}>
          <Select
            placeholder="选择测试集"
            options={suites.map((s: any) => ({ label: s.name, value: s.id }))}
            onChange={onSuiteChange}
          />
        </Form.Item>

        <Form.Item name="model_configs" label="模型" rules={[{ required: true, message: '请至少选择一个模型' }]}>
          <Checkbox.Group
            options={models.map((m: any) => ({ label: `${m.provider_type} / ${m.model_name}`, value: m.id }))}
            onChange={(vals) => setSelectedModels(vals as number[])}
          />
        </Form.Item>

        <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '20px 24px' } }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <Statistic title="版本数" value={selectedVersions.length} />
            <Statistic title="模型数" value={selectedModels.length} />
            <Statistic title="用例数" value={caseCount} />
            <Statistic title="总调用次数" value={totalCalls} valueStyle={totalCalls > 0 ? { color: '#1a1a1a' } : undefined} />
          </div>
        </Card>

        <Button type="primary" size="large" onClick={handleSubmit} loading={loading} disabled={totalCalls === 0}>
          开始运行
        </Button>
      </Form>
    </div>
  )
}
