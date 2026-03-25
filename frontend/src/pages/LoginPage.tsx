import { Form, Input, Button, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password)
      navigate('/projects')
    } catch {
      message.error('登录失败，请检查用户名与密码')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0f0f0f',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '40px 36px 36px',
          background: '#ffffff',
          border: '1px solid #e8e8e6',
          borderRadius: 16,
        }}
      >
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
          Open Prompt Compare
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 28, fontSize: 13 }}>
          使用账号登录以管理项目与对比任务
        </Typography.Paragraph>
        <Form onFinish={onFinish} layout="vertical" requiredMark={false}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" style={{ height: 44 }}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
