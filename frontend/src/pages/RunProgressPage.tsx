import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Progress, Tag, Button, List, Typography, message, Space } from 'antd'
import { getRun } from '../api/runs'
import { cancelRun } from '../api/runs'
import { runStatusLabel } from '../runStatus'

const { Text } = Typography

export default function RunProgressPage() {
  const { projectId, runId } = useParams()
  const pid = Number(projectId)
  const rid = Number(runId)
  const navigate = useNavigate()

  const [run, setRun] = useState<any>(null)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [errors, setErrors] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [cancelling, setCancelling] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchRun = useCallback(async () => {
    try {
      const res = await getRun(rid)
      setRun(res.data)
      if (res.data.completed != null) setCompleted(res.data.completed)
      if (res.data.total != null) setTotal(res.data.total)
      if (res.data.errors != null) setErrors(res.data.errors)
    } catch {
      message.error('加载运行信息失败')
    }
  }, [rid])

  const connectWs = useCallback(() => {
    const token = localStorage.getItem('token') || ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/runs/${rid}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'progress') {
          setCompleted(msg.completed ?? 0)
          setTotal(msg.total ?? 0)
          setErrors(msg.errors ?? 0)
          if (msg.completed === msg.total && msg.total > 0) {
            setRun((prev: any) => prev ? { ...prev, status: 'completed' } : prev)
          }
        } else if (msg.type === 'result') {
          setResults(prev => [msg, ...prev].slice(0, 50))
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(() => connectWs(), 3000)
    }

    ws.onerror = () => ws.close()
  }, [rid])

  useEffect(() => {
    fetchRun()
    connectWs()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [fetchRun, connectWs])

  const handleCancel = async () => {
    try {
      setCancelling(true)
      await cancelRun(rid)
      message.success('已取消运行')
      setRun((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev)
    } catch {
      message.error('取消失败')
    } finally {
      setCancelling(false)
    }
  }

  const statusColor: Record<string, string> = {
    pending: 'default',
    running: 'processing',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning',
  }

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>{run?.name || '运行任务'}</Typography.Title>
          {run && <Tag color={statusColor[run.status] || 'default'}>{runStatusLabel[run.status] || run.status}</Tag>}
        </Space>
        <Space>
          {run?.status === 'running' && (
            <Button danger onClick={handleCancel} loading={cancelling}>取消运行</Button>
          )}
          {run?.status === 'completed' && (
            <Button type="primary" onClick={() => navigate(`/projects/${pid}/runs/${rid}/compare`)}>查看结果</Button>
          )}
        </Space>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 12 }}>
        <Progress percent={pct} status={run?.status === 'failed' ? 'exception' : undefined} />
        <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
          <Text>已完成：{completed}/{total}</Text>
          {errors > 0 && <Text type="danger">错误数：{errors}</Text>}
        </div>
      </Card>

      <Card title="最新输出" styles={{ body: { paddingTop: 12 } }}>
        <List
          dataSource={results}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={item.test_case_name || `用例 #${item.test_case_id}`}
                description={<Text ellipsis style={{ maxWidth: 600 }}>{item.output || item.error || '-'}</Text>}
              />
            </List.Item>
          )}
          locale={{ emptyText: '等待结果…' }}
        />
      </Card>
    </div>
  )
}
