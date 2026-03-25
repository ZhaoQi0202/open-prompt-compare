import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Table, Tag, Select, message, Typography } from 'antd'
import { listProjectRuns } from '../api/runs'
import { runStatusLabel } from '../runStatus'

const statusColors: Record<string, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
}

export default function RunHistoryPage() {
  const { projectId } = useParams()
  const pid = Number(projectId)
  const navigate = useNavigate()

  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>()

  const fetchRuns = async (status?: string) => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = {}
      if (status) params.status = status
      const res = await listProjectRuns(pid, params)
      setRuns(Array.isArray(res.data) ? res.data : [])
    } catch {
      message.error('加载运行记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRuns(statusFilter) }, [pid, statusFilter])

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{runStatusLabel[v] || v}</Tag>,
    },
    { title: '提示词', dataIndex: 'prompt_name', key: 'prompt_name' },
    { title: '版本数', dataIndex: 'versions_count', key: 'versions_count' },
    { title: '模型数', dataIndex: 'models_count', key: 'models_count' },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at',
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>运行历史</Typography.Title>
        <Select
          allowClear
          placeholder="按状态筛选"
          style={{ width: 200 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: runStatusLabel.pending, value: 'pending' },
            { label: runStatusLabel.running, value: 'running' },
            { label: runStatusLabel.completed, value: 'completed' },
            { label: runStatusLabel.failed, value: 'failed' },
            { label: runStatusLabel.cancelled, value: 'cancelled' },
          ]}
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={runs}
        columns={columns}
        onRow={(record) => ({
          onClick: () => navigate(`/projects/${pid}/runs/${record.id}/compare`),
          style: { cursor: 'pointer' },
        })}
      />
    </div>
  )
}
