import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { List, Button, Table, Input, Modal, Form, Select, message, Popconfirm, Upload, Space, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { listSuites, createSuite, deleteSuite, listCases, createCase, updateCase, deleteCase, importCases } from '../api/testSuites'
import { listPrompts } from '../api/projects'

export default function TestSuiteManagePage() {
  const { projectId } = useParams()
  const pid = Number(projectId)
  const [searchParams] = useSearchParams()

  const [suites, setSuites] = useState<any[]>([])
  const [selectedSuite, setSelectedSuite] = useState<number | null>(null)
  const [cases, setCases] = useState<any[]>([])
  const [suiteModalOpen, setSuiteModalOpen] = useState(false)
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [prompts, setPrompts] = useState<any[]>([])
  const [suiteForm] = Form.useForm()
  const [caseForm] = Form.useForm()

  const fetchSuites = async () => {
    try {
      const res = await listSuites(pid)
      setSuites(res.data)
      const suiteParam = searchParams.get('suite')
      if (suiteParam && res.data.find((s: any) => s.id === Number(suiteParam))) {
        setSelectedSuite(Number(suiteParam))
      } else if (res.data.length > 0 && !selectedSuite) {
        setSelectedSuite(res.data[0].id)
      }
    } catch {
      message.error('加载测试集失败')
    }
  }

  const fetchCases = async (suiteId: number) => {
    try {
      const res = await listCases(suiteId)
      setCases(res.data)
    } catch {
      message.error('加载用例失败')
    }
  }

  const fetchPrompts = async () => {
    try {
      const res = await listPrompts(pid)
      setPrompts(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchSuites(); fetchPrompts() }, [pid])
  useEffect(() => { if (selectedSuite) fetchCases(selectedSuite) }, [selectedSuite])

  const handleCreateSuite = async () => {
    let values: any
    try {
      values = await suiteForm.validateFields()
    } catch {
      return
    }
    try {
      await createSuite(pid, {
        prompt_id: values.prompt_id,
        name: values.name,
        description: values.description ?? '',
      })
      message.success('测试集已创建')
      setSuiteModalOpen(false)
      suiteForm.resetFields()
      fetchSuites()
    } catch (e: any) {
      console.error('[createSuite error]', e?.response?.status, e?.response?.data, e)
      message.error(e?.response?.data?.detail?.[0]?.msg || '创建测试集失败')
    }
  }

  const handleDeleteSuite = async (id: number) => {
    try {
      await deleteSuite(id)
      message.success('测试集已删除')
      if (selectedSuite === id) { setSelectedSuite(null); setCases([]) }
      fetchSuites()
    } catch {
      message.error('删除测试集失败')
    }
  }

  const handleCreateCase = async () => {
    if (!selectedSuite) return
    try {
      const values = await caseForm.validateFields()
      await createCase(selectedSuite, values)
      message.success('用例已创建')
      setCaseModalOpen(false)
      caseForm.resetFields()
      fetchCases(selectedSuite)
    } catch {
      message.error('创建用例失败')
    }
  }

  const handleUpdateCase = async (id: number, field: string, value: string) => {
    try {
      await updateCase(id, { [field]: value })
      if (selectedSuite) fetchCases(selectedSuite)
    } catch {
      message.error('更新用例失败')
    }
  }

  const handleDeleteCase = async (id: number) => {
    try {
      await deleteCase(id)
      message.success('用例已删除')
      if (selectedSuite) fetchCases(selectedSuite)
    } catch {
      message.error('删除用例失败')
    }
  }

  const handleImport = (file: File) => {
    if (!selectedSuite) return false
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        await importCases(selectedSuite, Array.isArray(data) ? data : [data])
        message.success('导入成功')
        fetchCases(selectedSuite)
      } catch {
        message.error('导入失败，请检查 JSON 格式')
      }
    }
    reader.readAsText(file)
    return false
  }

  const caseColumns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (text: string, record: any) => (
        <Input defaultValue={text} onBlur={(e) => { if (e.target.value !== text) handleUpdateCase(record.id, 'name', e.target.value) }} size="small" />
      ),
    },
    {
      title: '期望输出', dataIndex: 'expected_output', key: 'expected_output',
      render: (text: string, record: any) => (
        <Input defaultValue={text || ''} onBlur={(e) => { if (e.target.value !== (text || '')) handleUpdateCase(record.id, 'expected_output', e.target.value) }} size="small" />
      ),
    },
    { title: '标签', dataIndex: 'tags', key: 'tags', render: (v: string[]) => v?.join(', ') || '' },
    {
      title: '', key: 'action', width: 48,
      render: (_: unknown, record: any) => (
        <Popconfirm title="确定删除该用例？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteCase(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 'calc(100vh - 64px - 80px - 56px)' }}>
      <div style={{ width: 260, borderRight: '1px solid #e8e8e6', paddingRight: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography.Text strong>测试集</Typography.Text>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setSuiteModalOpen(true)} />
        </div>
        <List
          dataSource={suites}
          size="small"
          renderItem={(s: any) => (
            <List.Item
              style={{ cursor: 'pointer', background: s.id === selectedSuite ? '#f0f0ed' : undefined, padding: '8px 10px', borderRadius: 8 }}
              onClick={() => setSelectedSuite(s.id)}
              extra={
                <Popconfirm title="确定删除？" okText="删除" cancelText="取消" onConfirm={(e) => { e?.stopPropagation(); handleDeleteSuite(s.id) }} onCancel={(e) => e?.stopPropagation()}>
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              }
            >
              {s.name}
            </List.Item>
          )}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {selectedSuite ? (
          <>
            <Space style={{ marginBottom: 16 }} wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCaseModalOpen(true)}>新建用例</Button>
              <Upload accept=".json" showUploadList={false} beforeUpload={handleImport}>
                <Button icon={<UploadOutlined />}>导入 JSON</Button>
              </Upload>
            </Space>
            <Table rowKey="id" dataSource={cases} columns={caseColumns} size="small" />
          </>
        ) : (
          <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 64 }}>请选择一个测试集</Typography.Text>
        )}
      </div>

      <Modal title="新建测试集" open={suiteModalOpen} onOk={handleCreateSuite} onCancel={() => setSuiteModalOpen(false)} okText="创建" cancelText="取消" forceRender afterClose={() => suiteForm.resetFields()}>
        <Form form={suiteForm} layout="vertical">
          <Form.Item name="prompt_id" label="关联 Prompt" rules={[{ required: true, message: '请选择 Prompt' }]}>
            <Select placeholder="选择 Prompt" options={prompts.map((p: any) => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建用例" open={caseModalOpen} onOk={handleCreateCase} onCancel={() => setCaseModalOpen(false)} okText="创建" cancelText="取消" forceRender afterClose={() => caseForm.resetFields()}>
        <Form form={caseForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="input_data" label="输入数据（JSON）"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="expected_output" label="期望输出"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
