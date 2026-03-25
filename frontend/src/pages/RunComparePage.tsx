import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs, Table, Tag, Card, List, Typography, Tooltip, message } from 'antd'
import { getRun, getCompare } from '../api/runs'
import CompareMatrix from '../components/CompareMatrix'
import JudgePanel from '../components/JudgePanel'

const { Text } = Typography

function scoreColor(score: number | null | undefined) {
  if (score == null) return 'default'
  if (score >= 7) return 'green'
  if (score >= 4) return 'orange'
  return 'red'
}

export default function RunComparePage() {
  const { runId } = useParams()
  const rid = Number(runId)

  const [run, setRun] = useState<any>(null)
  const [compareData, setCompareData] = useState<any>(null)
  const [page, setPage] = useState(1)

  const fetchRun = useCallback(async () => {
    try {
      const res = await getRun(rid)
      setRun(res.data)
    } catch {
      message.error('加载运行信息失败')
    }
  }, [rid])

  const fetchCompare = useCallback(async (p: number) => {
    try {
      const res = await getCompare(rid, { page: p, page_size: 20 })
      setCompareData(res.data)
    } catch {
      message.error('加载对比数据失败')
    }
  }, [rid])

  useEffect(() => { fetchRun() }, [fetchRun])
  useEffect(() => { fetchCompare(page) }, [fetchCompare, page])

  const summary = compareData?.summary || []
  const matrix = compareData?.matrix || []
  const totalPages = compareData?.total_pages || 1

  const cols = summary.length > 0
    ? [...new Set(summary.map((s: any) => JSON.stringify({ version_id: s.prompt_version_id, model_id: s.model_config_id, version_label: s.version_label || `v${s.prompt_version_id}`, model_label: s.model_label || `model${s.model_config_id}` })))].map((s: any) => JSON.parse(s))
    : []

  const summaryColumns = [
    { title: '版本', dataIndex: 'version_label', key: 'version_label', render: (v: string, r: any) => v || `v${r.prompt_version_id}` },
    { title: '模型', dataIndex: 'model_label', key: 'model_label', render: (v: string, r: any) => v || `model${r.model_config_id}` },
    { title: '平均分', dataIndex: 'avg_score', key: 'avg_score', render: (v: number | null) => v != null ? <Tag color={scoreColor(v)}>{v.toFixed(2)}</Tag> : '-' },
    { title: '通过率', dataIndex: 'pass_rate', key: 'pass_rate', render: (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{run?.name || '对比结果'}</Typography.Title>
      </div>

      <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }}>
        <JudgePanel runId={rid} onJudged={() => fetchCompare(page)} />
      </Card>

      <Tabs items={[
        {
          key: 'summary',
          label: '汇总',
          children: (
            <Table
              rowKey={(r) => `${r.prompt_version_id}_${r.model_config_id}`}
              dataSource={summary}
              columns={summaryColumns}
              pagination={false}
            />
          ),
        },
        {
          key: 'matrix',
          label: '矩阵',
          children: (
            <CompareMatrix
              matrix={matrix}
              columns={cols}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onRefresh={() => fetchCompare(page)}
            />
          ),
        },
        {
          key: 'detail',
          label: '明细',
          children: (
            <List
              dataSource={matrix}
              renderItem={(item: any) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <Text strong>{item.test_case_name || `用例 #${item.test_case_id}`}</Text>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      {item.results?.map((r: any, i: number) => (
                        <Card key={i} size="small" style={{ width: 300, borderRadius: 12 }} title={`${r.version_label || `v${r.prompt_version_id}`} × ${r.model_label || `m${r.model_config_id}`}`}>
                          <Tooltip title={r.output}>
                            <Text ellipsis style={{ maxWidth: 260 }}>{r.output || '-'}</Text>
                          </Tooltip>
                          {r.judge_score != null && <Tag color={scoreColor(r.judge_score)} style={{ marginTop: 4 }}>分数：{r.judge_score}</Tag>}
                        </Card>
                      ))}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          ),
        },
      ]} />
    </div>
  )
}
