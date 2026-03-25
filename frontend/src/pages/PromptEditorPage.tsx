import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { List, Button, Input, Select, Card, message, Divider, Space, Typography } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { listVersions, createVersion, diffVersions } from '../api/prompts'
import VariableSchemaEditor from '../components/VariableSchemaEditor'

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

  const versionOptions = versions.map((v: any) => ({ value: v.id, label: `v${v.version_number}` }))

  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 'calc(100vh - 64px - 80px - 56px)' }}>
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
  )
}
