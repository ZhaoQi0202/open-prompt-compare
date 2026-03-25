import { useState, useEffect, useMemo } from 'react'
import { Layout, Menu, Button, Typography, Space, Breadcrumb } from 'antd'
import { ProjectOutlined, SettingOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getProject, listPrompts } from '../api/projects'

const { Header, Sider, Content } = Layout

type Crumb = { title: string; href?: string }

function buildProjectBreadcrumbs(
  path: string,
  projectName: string | null,
  promptName: string | null,
): Crumb[] | null {
  if (!path.startsWith('/projects')) return null
  if (path === '/projects') {
    return [{ title: '项目' }]
  }

  const compare = /^\/projects\/(\d+)\/runs\/(\d+)\/compare$/.exec(path)
  if (compare) {
    const [, projectId, rid] = compare
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…', href: `/projects/${projectId}` },
      { title: `运行 #${rid}`, href: `/projects/${projectId}/runs/${rid}` },
      { title: '对比' },
    ]
  }

  const prompt = /^\/projects\/(\d+)\/prompts\/(\d+)$/.exec(path)
  if (prompt) {
    const [, projectId] = prompt
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…', href: `/projects/${projectId}` },
      { title: `提示词: ${promptName ?? '…'}` },
    ]
  }

  const testSuites = /^\/projects\/(\d+)\/test-suites$/.exec(path)
  if (testSuites) {
    const [, projectId] = testSuites
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…', href: `/projects/${projectId}` },
      { title: '测试集管理' },
    ]
  }

  const newRun = /^\/projects\/(\d+)\/new-run$/.exec(path)
  if (newRun) {
    const [, projectId] = newRun
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…', href: `/projects/${projectId}` },
      { title: '新建运行' },
    ]
  }

  const runDetail = /^\/projects\/(\d+)\/runs\/(\d+)$/.exec(path)
  if (runDetail) {
    const [, projectId, rid] = runDetail
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…', href: `/projects/${projectId}` },
      { title: `运行 #${rid}` },
    ]
  }

  const runs = /^\/projects\/(\d+)\/runs$/.exec(path)
  if (runs) {
    const [, projectId] = runs
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…', href: `/projects/${projectId}` },
      { title: '运行历史' },
    ]
  }

  const projectOnly = /^\/projects\/(\d+)$/.exec(path)
  if (projectOnly) {
    return [
      { title: '项目', href: '/projects' },
      { title: projectName ?? '…' },
    ]
  }

  return null
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const username = useAuthStore((s) => s.username)

  const [projectName, setProjectName] = useState<string | null>(null)
  const [promptName, setPromptName] = useState<string | null>(null)

  const path = location.pathname

  useEffect(() => {
    const projectMatch = path.match(/^\/projects\/(\d+)/)
    if (!projectMatch) {
      setProjectName(null)
      setPromptName(null)
      return
    }
    const pid = Number(projectMatch[1])
    let cancelled = false
    getProject(pid)
      .then((res) => {
        if (!cancelled) setProjectName(res.data.name)
      })
      .catch(() => {
        if (!cancelled) setProjectName(null)
      })

    const promptMatch = path.match(/^\/projects\/\d+\/prompts\/(\d+)/)
    if (promptMatch) {
      const prid = Number(promptMatch[1])
      listPrompts(pid)
        .then((res) => {
          if (cancelled) return
          const p = (res.data as { id: number; name: string }[]).find((x) => x.id === prid)
          setPromptName(p?.name ?? null)
        })
        .catch(() => {
          if (!cancelled) setPromptName(null)
        })
    } else {
      setPromptName(null)
    }

    return () => {
      cancelled = true
    }
  }, [path])

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

  const breadcrumbItems = useMemo(
    () => buildProjectBreadcrumbs(path, projectName, promptName),
    [path, projectName, promptName],
  )

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
          {breadcrumbItems && breadcrumbItems.length > 0 ? (
            <Breadcrumb
              style={{ marginBottom: 16 }}
              items={breadcrumbItems.map((c) => ({
                title:
                  c.href !== undefined ? (
                    <span
                      role="presentation"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(c.href!)}
                    >
                      {c.title}
                    </span>
                  ) : (
                    c.title
                  ),
              }))}
            />
          ) : null}
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
