import { useState } from 'react'
import { Table, Tag, Tooltip, InputNumber, Modal, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { updateJudgeResult } from '../api/judge'

interface Props {
  matrix: any[]
  columns: { version_id: number; model_id: number; version_label: string; model_label: string }[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onRefresh?: () => void
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return 'default'
  if (score >= 7) return 'green'
  if (score >= 4) return 'orange'
  return 'red'
}

export default function CompareMatrix({ matrix, columns, page, totalPages, onPageChange, onRefresh }: Props) {
  const [expandedOutput, setExpandedOutput] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editScore, setEditScore] = useState<number | null>(null)

  const saveHumanScore = async () => {
    if (editingId == null) return
    try {
      await updateJudgeResult(editingId, { human_score: editScore })
      message.success('分数已保存')
      setEditingId(null)
      onRefresh?.()
    } catch {
      message.error('保存分数失败')
    }
  }

  const tableCols: ColumnsType<any> = [
    {
      title: '用例',
      dataIndex: 'test_case_name',
      key: 'test_case_name',
      width: 180,
      fixed: 'left',
    },
    ...columns.map(col => ({
      title: `${col.version_label} × ${col.model_label}`,
      key: `${col.version_id}_${col.model_id}`,
      width: 260,
      render: (_: unknown, row: any) => {
        const cell = row.results?.find(
          (r: any) => r.version_id === col.version_id && r.model_id === col.model_id
        )
        if (!cell) return '-'
        const output = cell.output || ''
        const truncated = output.length > 100 ? output.slice(0, 100) + '...' : output
        return (
          <div>
            <Tooltip title={output}>
              <span style={{ cursor: 'pointer', fontSize: 12 }} onClick={() => setExpandedOutput(output)}>
                {truncated}
              </span>
            </Tooltip>
            <div style={{ marginTop: 4 }}>
              {cell.auto_score != null && (
                <Tag
                  color={scoreColor(cell.auto_score)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setEditingId(cell.judge_result_id ?? cell.id); setEditScore(cell.human_score ?? cell.auto_score) }}
                >
                  分数：{cell.auto_score}
                </Tag>
              )}
              {cell.human_score != null && (
                <Tag color="blue">人工：{cell.human_score}</Tag>
              )}
            </div>
          </div>
        )
      },
    })),
  ]

  return (
    <>
      <Table
        rowKey="test_case_id"
        dataSource={matrix}
        columns={tableCols}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          total: totalPages * 20,
          pageSize: 20,
          onChange: onPageChange,
          showSizeChanger: false,
        }}
      />
      <Modal title="完整输出" open={expandedOutput !== null} onCancel={() => setExpandedOutput(null)} footer={null} width={720}>
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>{expandedOutput}</pre>
      </Modal>
      <Modal title="编辑人工分数" open={editingId !== null} onOk={saveHumanScore} onCancel={() => setEditingId(null)} okText="保存" cancelText="取消">
        <InputNumber value={editScore} onChange={v => setEditScore(v)} min={0} max={10} style={{ width: '100%' }} />
      </Modal>
    </>
  )
}
