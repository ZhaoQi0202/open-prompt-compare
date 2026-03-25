import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Radio, InputNumber, message, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { listConfigs, createConfig, updateConfig, deleteConfig, testConfig } from '../api/modelConfigs'
import { useAuthStore } from '../stores/authStore'

export default function ModelConfigPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form] = Form.useForm()
  const providerType = Form.useWatch('provider_type', form)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await listConfigs()
      setConfigs(res.data)
    } catch {
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldValue('provider_type', 'openai_compatible')
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await updateConfig(editingId, values)
        message.success('配置已更新')
      } else {
        await createConfig(values)
        message.success('配置已创建')
      }
      setModalOpen(false)
      fetch()
    } catch {
      message.error('保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteConfig(id)
      message.success('配置已删除')
      fetch()
    } catch (err: any) {
      if (err.response?.status === 409) {
        message.error('无法删除：该配置仍被运行任务引用')
      } else {
        message.error('删除失败')
      }
    }
  }

  const handleTest = async (id: number) => {
    try {
      const res = await testConfig(id)
      if (res.data?.success) {
        message.success('连接测试通过')
        fetch()
      } else {
        message.error(typeof res.data?.error === 'string' ? res.data.error : '连接测试失败')
      }
    } catch {
      message.error('连接测试失败')
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: any) =>
        record.connectivity_verified_at ? <Tag color="success">可用</Tag> : <Tag>未验证</Tag>,
    },
    { title: '提供方', dataIndex: 'provider_type', key: 'provider_type' },
    { title: '模型', dataIndex: 'model_name', key: 'model_name' },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: unknown, record: any) => (
        <Space>
          {isAdmin ? (
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} aria-label="编辑" />
          ) : null}
          <Button type="text" icon={<ThunderboltOutlined />} onClick={() => handleTest(record.id)} aria-label="测试连接" />
          {isAdmin ? (
            <Popconfirm title="确定删除该配置？" okText="删除" cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="删除" />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="opc-page-title" style={{ marginBottom: 0 }}>模型配置</h2>
        {isAdmin ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建配置</Button>
        ) : null}
      </div>
      <Table rowKey="id" dataSource={configs} columns={columns} loading={loading} />
      <Modal title={editingId ? '编辑配置' : '新建配置'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} width={600} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ provider_type: 'openai_compatible' }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
          <Form.Item name="provider_type" label="提供方类型">
            <Radio.Group>
              <Radio.Button value="openai_compatible">OpenAI 兼容</Radio.Button>
              <Radio.Button value="custom_http">自定义 HTTP</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="base_url" label="Base URL"><Input /></Form.Item>
          <Form.Item name="api_key" label="API Key"><Input.Password /></Form.Item>
          <Form.Item name="model_name" label="模型名称"><Input /></Form.Item>
          {providerType === 'custom_http' && (
            <>
              <Form.Item name="custom_headers" label="自定义请求头（JSON）"><Input.TextArea rows={3} /></Form.Item>
              <Form.Item name="custom_body_template" label="自定义请求体模板"><Input.TextArea rows={4} /></Form.Item>
              <Form.Item name="response_extract_path" label="响应提取路径"><Input /></Form.Item>
            </>
          )}
          <Form.Item name="max_concurrency" label="最大并发"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}
