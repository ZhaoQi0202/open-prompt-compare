import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { listProjects, createProject, deleteProject } from '../api/projects'
import { useAuthStore } from '../stores/authStore'

export default function ProjectListPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await listProjects()
      setProjects(res.data)
    } catch {
      message.error('加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await createProject(values)
      message.success('项目已创建')
      setModalOpen(false)
      form.resetFields()
      fetch()
    } catch {
      message.error('创建项目失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteProject(id)
      message.success('项目已删除')
      fetch()
    } catch {
      message.error('删除项目失败')
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    ...(isAdmin
      ? [{
          title: '操作', key: 'action', width: 80,
          render: (_: unknown, record: any) => (
            <Popconfirm title="确定删除该项目？" okText="删除" cancelText="取消" onConfirm={(e) => { e?.stopPropagation(); handleDelete(record.id) }} onCancel={(e) => e?.stopPropagation()}>
              <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          ),
        }]
      : []),
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="opc-page-title" style={{ marginBottom: 0 }}>项目</h2>
        {isAdmin ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建项目</Button>
        ) : null}
      </div>
      <Table
        rowKey="id"
        dataSource={projects}
        columns={columns}
        loading={loading}
        onRow={(record) => ({ onClick: () => navigate(`/projects/${record.id}`), style: { cursor: 'pointer' } })}
      />
      <Modal title="新建项目" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} okText="创建" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
