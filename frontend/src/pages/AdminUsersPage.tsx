import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Switch, message, Popconfirm, Space, Select } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { listUsers, createUser, updateUser, deleteUser, type UserDetail } from '../api/admin'
import { listProjects } from '../api/projects'
import { listConfigs } from '../api/modelConfigs'

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserDetail[]>([])
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([])
  const [models, setModels] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserDetail | null>(null)
  const [form] = Form.useForm()

  const loadAll = async () => {
    setLoading(true)
    try {
      const [u, p, m] = await Promise.all([listUsers(), listProjects(), listConfigs()])
      setUsers(u.data)
      setProjects(p.data.map((x: { id: number; name: string }) => ({ id: x.id, name: x.name })))
      setModels(m.data.map((x: { id: number; name: string }) => ({ id: x.id, name: x.name })))
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } }
      if (err.response?.status === 403) {
        navigate('/projects')
        return
      }
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ is_admin: false, project_ids: [], model_config_ids: [] })
    setModalOpen(true)
  }

  const openEdit = (r: UserDetail) => {
    setEditing(r)
    form.setFieldsValue({
      username: r.username,
      is_admin: r.is_admin,
      project_ids: r.project_ids,
      model_config_ids: r.model_config_ids,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        const { password, ...rest } = values
        const pwd = typeof password === 'string' && password.length > 0 ? password : undefined
        await updateUser(editing.id, {
          ...rest,
          ...(pwd ? { password: pwd } : {}),
        })
        message.success('已更新')
      } else {
        await createUser(values)
        message.success('已创建')
      }
      setModalOpen(false)
      loadAll()
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } }
      if (err.response?.status === 409) message.error('用户名已存在')
      else message.error('保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id)
      message.success('已删除')
      loadAll()
    } catch {
      message.error('删除失败')
    }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '角色',
      dataIndex: 'is_admin',
      key: 'is_admin',
      render: (v: boolean) => (v ? '管理员' : '用户'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, r: UserDetail) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} aria-label="编辑" />
          <Popconfirm title="确定删除？" okText="删除" cancelText="取消" onConfirm={() => handleDelete(r.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} aria-label="删除" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="opc-page-title" style={{ marginBottom: 0 }}>
          用户管理
        </h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建用户
        </Button>
      </div>
      <Table rowKey="id" dataSource={users} columns={columns} loading={loading} />
      <Modal
        title={editing ? '编辑用户' : '新建用户'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={520}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '新密码（留空不修改）' : '密码'}
            rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="is_admin" label="管理员" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="project_ids" label="可访问项目">
            <Select mode="multiple" placeholder="选择项目" options={projects.map((p) => ({ label: p.name, value: p.id }))} />
          </Form.Item>
          <Form.Item name="model_config_ids" label="可用模型配置">
            <Select mode="multiple" placeholder="选择模型配置" options={models.map((m) => ({ label: m.name, value: m.id }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
