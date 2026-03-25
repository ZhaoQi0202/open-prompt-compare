import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, Card, Button, Modal, Form, Input, Select, Table, message, Popconfirm, Typography, Space } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { getProject, updateProject, listPrompts, listRuns } from '../api/projects'
import { createPrompt, deletePrompt } from '../api/prompts'
import { listSuites, createSuite, deleteSuite } from '../api/testSuites'
import { runStatusLabel } from '../runStatus'
import { useAuthStore } from '../stores/authStore'

const { Text } = Typography

export default function ProjectOverviewPage() {
  const { projectId } = useParams()
  const pid = Number(projectId)
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const [project, setProject] = useState<any>(null)
  const [prompts, setPrompts] = useState<any[]>([])
  const [suites, setSuites] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [suiteOpen, setSuiteOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [promptForm] = Form.useForm()
  const [suiteForm] = Form.useForm()

  const fetchProject = async () => {
    try {
      const res = await getProject(pid)
      setProject(res.data)
    } catch {
      message.error('加载项目失败')
    }
  }

  const fetchPrompts = async () => {
    try {
      const res = await listPrompts(pid)
      setPrompts(res.data)
    } catch {
      message.error('加载提示词失败')
    }
  }

  const fetchSuites = async () => {
    try {
      const res = await listSuites(pid)
      setSuites(res.data)
    } catch {
      message.error('加载测试集失败')
    }
  }

  const fetchRuns = async () => {
    try {
      const res = await listRuns(pid)
      setRuns(res.data)
    } catch {
      message.error('加载运行记录失败')
    }
  }

  useEffect(() => {
    fetchProject()
    fetchPrompts()
    fetchSuites()
    fetchRuns()
  }, [pid])

  const handleEditProject = async () => {
    try {
      const values = await editForm.validateFields()
      await updateProject(pid, values)
      message.success('项目已更新')
      setEditOpen(false)
      fetchProject()
    } catch {
      message.error('更新项目失败')
    }
  }

  const handleCreatePrompt = async () => {
    try {
      const values = await promptForm.validateFields()
      await createPrompt(pid, values)
      message.success('提示词已创建')
      setPromptOpen(false)
      promptForm.resetFields()
      fetchPrompts()
    } catch {
      message.error('创建提示词失败')
    }
  }

  const handleDeletePrompt = async (id: number) => {
    try {
      await deletePrompt(id)
      message.success('提示词已删除')
      fetchPrompts()
    } catch {
      message.error('删除提示词失败')
    }
  }

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
      setSuiteOpen(false)
      suiteForm.resetFields()
      fetchSuites()
    } catch {
      message.error('创建测试集失败')
    }
  }

  const handleDeleteSuite = async (id: number) => {
    try {
      await deleteSuite(id)
      message.success('测试集已删除')
      fetchSuites()
    } catch {
      message.error('删除测试集失败')
    }
  }

  const runColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => runStatusLabel[v] || v,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ]

  if (!project) return null

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 className="opc-page-title" style={{ marginBottom: 4 }}>{project.name}</h2>
          <Text type="secondary">{project.description || '暂无描述'}</Text>
        </div>
        {isAdmin ? (
          <Button icon={<EditOutlined />} onClick={() => { editForm.setFieldsValue(project); setEditOpen(true) }}>编辑</Button>
        ) : null}
      </div>

      <Tabs items={[
        {
          key: 'prompts',
          label: '提示词',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setPromptOpen(true)} style={{ marginBottom: 16 }}>新建提示词</Button>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {prompts.map((p: any) => (
                  <Card
                    key={p.id}
                    hoverable
                    style={{ width: 260, borderRadius: 16 }}
                    onClick={() => navigate(`/projects/${pid}/prompts/${p.id}`)}
                  >
                    <Card.Meta title={p.name} description={p.description || '无描述'} />
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <Popconfirm title="确定删除？" okText="删除" cancelText="取消" onConfirm={(e) => { e?.stopPropagation(); handleDeletePrompt(p.id) }} onCancel={(e) => e?.stopPropagation()}>
                        <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ),
        },
        {
          key: 'suites',
          label: '测试集',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setSuiteOpen(true)} style={{ marginBottom: 16 }}>新建测试集</Button>
              <Table
                rowKey="id"
                dataSource={suites}
                columns={[
                  { title: '名称', dataIndex: 'name', key: 'name' },
                  { title: '描述', dataIndex: 'description', key: 'description' },
                  {
                    title: '操作', key: 'action', width: 80,
                    render: (_: unknown, record: any) => (
                      <Popconfirm title="确定删除？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteSuite(record.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ),
                  },
                ]}
                onRow={(record) => ({ onClick: () => navigate(`/projects/${pid}/test-suites?suite=${record.id}`), style: { cursor: 'pointer' } })}
              />
            </>
          ),
        },
        {
          key: 'runs',
          label: '运行记录',
          children: (
            <>
              <Space style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/projects/${pid}/new-run`)}>新建运行</Button>
                <Button onClick={() => navigate(`/projects/${pid}/runs`)}>查看全部</Button>
              </Space>
              <Table
                rowKey="id"
                dataSource={runs}
                columns={runColumns}
                onRow={(record) => ({ onClick: () => navigate(`/projects/${pid}/runs/${record.id}`), style: { cursor: 'pointer' } })}
              />
            </>
          ),
        },
      ]} />

      <Modal title="编辑项目" open={editOpen} onOk={handleEditProject} onCancel={() => setEditOpen(false)} okText="保存" cancelText="取消">
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建提示词" open={promptOpen} onOk={handleCreatePrompt} onCancel={() => setPromptOpen(false)} okText="创建" cancelText="取消" forceRender afterClose={() => promptForm.resetFields()}>
        <Form form={promptForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建测试集" open={suiteOpen} onOk={handleCreateSuite} onCancel={() => setSuiteOpen(false)} okText="创建" cancelText="取消" forceRender afterClose={() => suiteForm.resetFields()}>
        <Form form={suiteForm} layout="vertical">
          <Form.Item name="prompt_id" label="关联 Prompt" rules={[{ required: true, message: '请选择 Prompt' }]}>
            <Select placeholder="选择 Prompt" options={prompts.map((p: any) => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
