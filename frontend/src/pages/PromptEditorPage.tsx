import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { List, Button, Input, Select, Card, message, Divider, Space, Typography, Collapse } from 'antd'
import { SaveOutlined, PlayCircleOutlined, CopyOutlined, RightOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { listVersions, createVersion, diffVersions } from '../api/prompts'
import { listConfigs } from '../api/modelConfigs'
import { playgroundRun } from '../api/playground'
import VariableSchemaEditor from '../components/VariableSchemaEditor'

const { Text } = Typography

export default function PromptEditorPage() {
  const { promptId } = useParams()
  const pid = Number(promptId)

  const [versions, setVersions] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [variables, setVariables] = useState<{ name: string; type: string; required: boolean }[]>([])
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [diffV1, setDiffV1] = useState<number | undefined>(undefined)
  const [diffV2, setDiffV2] = useState<number | undefined>(undefined)
  const [diffResult, setDiffResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [playgroundOpen, setPlaygroundOpen] = useState(true)
  const [modelConfigs, setModelConfigs] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<number | undefined>()
  const [playgroundVars, setPlaygroundVars] = useState<Record<string, string>>({})
  const [playgroundResult, setPlaygroundResult] = useState<any>(null)
  const [playgroundLoading, setPlaygroundLoading] = useState(false)
  const [playgroundHistory, setPlaygroundHistory] = useState<any[]>([])

  const fetchVersions = async () => {
    try {
      const res = await listVersions(pid)
      setVersions(res.data)
      if (res.data.length > 0) {
        const latest = res.data[0]
        setContent(latest.template_content || '')
        setVariables(latest.variables_schema || [])
        setSelectedVersion(latest.id)
      }
    } catch {
      message.error('加载版本失败')
    }
  }

  useEffect(() => { fetchVersions() }, [pid])
  useEffect(() => { listConfigs().then(r => setModelConfigs(r.data)).catch(() => {}) }, [])
  useEffect(() => {
    setPlaygroundVars(prev => {
      const next: Record<string, string> = {}
      for (const v of variables) { next[v.name] = prev[v.name] || '' }
      return next
    })
  }, [variables])

  const handleSave = async () => {
    setLoading(true)
    try {
      await createVersion(pid, { template_content: content, variables_schema: variables, change_note: changeNote })
      message.success('已保存新版本')
      setChangeNote('')
      fetchVersions()
    } catch {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  const loadVersion = (v: any) => {
    setContent(v.template_content || '')
    setVariables(v.variables_schema || [])
    setSelectedVersion(v.id)
  }

  const handleDiff = async () => {
    if (!diffV1 || !diffV2) return
    try {
      const res = await diffVersions(diffV1, diffV2)
      const d = res.data as { diff?: string }
      setDiffResult(d.diff ?? (typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)))
    } catch {
      message.error('对比失败')
    }
  }

  const handlePlaygroundRun = async () => {
    if (!selectedModel) { message.warning('请选择模型'); return }
    setPlaygroundLoading(true)
    try {
      const res = await playgroundRun({ template_content: content, variables: playgroundVars, model_config_id: selectedModel })
      const result = { ...res.data, timestamp: Date.now() }
      setPlaygroundResult(result)
      setPlaygroundHistory(prev => [result, ...prev].slice(0, 5))
    } catch {
      message.error('运行失败')
    } finally {
      setPlaygroundLoading(false)
    }
  }

  const versionOptions = versions.map((v: any) => ({ value: v.id, label: `v${v.version_number}` }))

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 64px - 80px - 56px)' }}>
      <div style={{ flex: 1, display: 'flex', gap: 20, minWidth: 0 }}>
        <Card title="版本" style={{ width: 220, overflow: 'auto', flexShrink: 0 }} styles={{ body: { padding: 12 } }}>
          <List
            dataSource={versions}
            size="small"
            renderItem={(v: any) => (
              <List.Item
                style={{ cursor: 'pointer', background: v.id === selectedVersion ? '#f0f0ed' : undefined, padding: '8px 10px', borderRadius: 8 }}
                onClick={() => loadVersion(v)}
              >
                <div>
                  <Typography.Text strong>v{v.version_number}</Typography.Text>
                  <div style={{ fontSize: 12, color: '#525252' }}>{v.change_note || ''}</div>
                </div>
              </List.Item>
            )}
          />
        </Card>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ flex: 1, border: '1px solid #e8e8e6', borderRadius: 12, overflow: 'hidden', minHeight: 320 }}>
            <Editor
              language="handlebars"
              value={content}
              onChange={(v) => setContent(v || '')}
              options={{ minimap: { enabled: false }, wordWrap: 'on', fontSize: 14 }}
            />
          </div>
          <Space wrap>
            <Input placeholder="变更说明" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} style={{ width: 300 }} />
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>保存为新版本</Button>
          </Space>
          <Divider style={{ margin: '4px 0' }} />
          <Space wrap>
            <Select placeholder="版本 A" options={versionOptions} value={diffV1} onChange={setDiffV1} style={{ width: 140 }} />
            <Select placeholder="版本 B" options={versionOptions} value={diffV2} onChange={setDiffV2} style={{ width: 140 }} />
            <Button onClick={handleDiff}>显示差异</Button>
          </Space>
          {diffResult && <pre style={{ background: '#fafaf8', padding: 14, borderRadius: 10, overflow: 'auto', maxHeight: 200, fontSize: 12, border: '1px solid #e8e8e6' }}>{diffResult}</pre>}
        </div>

        <Card title="变量模式" style={{ width: 300, overflow: 'auto', flexShrink: 0 }} styles={{ body: { padding: 12 } }}>
          <VariableSchemaEditor value={variables} onChange={setVariables} />
        </Card>
      </div>

      {playgroundOpen ? (
        <Card
          title="Playground"
          extra={<Button type="text" size="small" onClick={() => setPlaygroundOpen(false)}>收起</Button>}
          style={{ width: 360, flexShrink: 0, marginLeft: 20, overflow: 'auto' }}
          styles={{ body: { padding: 16 } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Select
              placeholder="选择模型"
              options={modelConfigs.map((m: any) => ({ label: `${m.provider_type} / ${m.model_name}`, value: m.id }))}
              value={selectedModel}
              onChange={setSelectedModel}
              style={{ width: '100%' }}
            />

            {variables.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>变量</Text>
                {variables.map(v => (
                  <Input
                    key={v.name}
                    addonBefore={v.name}
                    value={playgroundVars[v.name] || ''}
                    onChange={e => setPlaygroundVars(prev => ({ ...prev, [v.name]: e.target.value }))}
                    size="small"
                    style={{ marginTop: 4 }}
                  />
                ))}
              </div>
            )}

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={playgroundLoading}
              onClick={handlePlaygroundRun}
              block
            >
              运行
            </Button>

            {playgroundResult && (
              <Card size="small" style={{ borderRadius: 8 }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, margin: 0, maxHeight: 300, overflow: 'auto' }}>
                  {playgroundResult.output}
                </pre>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#888' }}>
                  <span>{playgroundResult.latency_ms}ms</span>
                  <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(playgroundResult.output); message.success('已复制') }} />
                </div>
              </Card>
            )}

            {playgroundHistory.length > 1 && (
              <Collapse
                size="small"
                items={[{
                  key: 'history',
                  label: `历史 (${playgroundHistory.length})`,
                  children: playgroundHistory.slice(1).map((h, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0', fontSize: 12 }}>
                      <Text ellipsis style={{ maxWidth: '100%' }}>{h.output}</Text>
                      <div style={{ color: '#888' }}>{h.latency_ms}ms</div>
                    </div>
                  ))
                }]}
              />
            )}
          </div>
        </Card>
      ) : (
        <Button
          type="text"
          icon={<RightOutlined />}
          onClick={() => setPlaygroundOpen(true)}
          style={{ alignSelf: 'flex-start', marginLeft: 8, marginTop: 8 }}
        >
          Playground
        </Button>
      )}
    </div>
  )
}
