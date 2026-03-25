import { Layout, Menu, Button, Typography, Space } from 'antd'
import { ProjectOutlined, SettingOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const { Header, Sider, Content } = Layout

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const username = useAuthStore((s) => s.username)

  const path = location.pathname
  const selectedKey = path.startsWith('/admin')
    ? '/admin/users'
    : path.startsWith('/model-configs')
      ? '/model-configs'
      : '/projects'

  const menuItems = [
    { key: '/projects', icon: <ProjectOutlined />, label: '项目' },
    { key: '/model-configs', icon: <SettingOutlined />, label: '模型配置' },
    ...(isAdmin ? [{ key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' }] : []),
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        breakpoint="lg"
        collapsedWidth={72}
        style={{
          background: '#0f0f0f',
          borderRight: '1px solid #1f1f1f',
        }}
      >
        <div
          style={{
            padding: '28px 20px 32px',
            borderBottom: '1px solid #1f1f1f',
          }}
        >
          <Typography.Text
            style={{
              color: '#fafafa',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.04em',
              display: 'block',
            }}
          >
            OPC
          </Typography.Text>
          <Typography.Text
            type="secondary"
            style={{ color: '#737373', fontSize: 12, marginTop: 6, display: 'block', lineHeight: 1.5 }}
          >
            提示词对比与评测
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 12, padding: '0 8px' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#ffffff',
            padding: '0 32px',
            height: 64,
            lineHeight: '64px',
            borderBottom: '1px solid #e8e8e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 600, fontSize: 17 }}>
            Open Prompt Compare
          </Typography.Title>
          <Space>
            {username ? (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {username}
              </Typography.Text>
            ) : null}
            <Button type="text" icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login') }}>
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: '32px 40px 48px', background: '#f4f4f2', minHeight: 'calc(100vh - 64px)' }}>
          <div
            className="opc-panel"
            style={{
              minHeight: 'calc(100vh - 64px - 80px)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
