import { Table, Button, Input, Select, Switch } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

interface Variable {
  name: string
  type: string
  required: boolean
}

interface Props {
  value: Variable[]
  onChange: (value: Variable[]) => void
}

export default function VariableSchemaEditor({ value, onChange }: Props) {
  const update = (index: number, field: keyof Variable, val: unknown) => {
    const next = [...value]
    next[index] = { ...next[index], [field]: val }
    onChange(next)
  }

  const add = () => {
    onChange([...value, { name: '', type: 'string', required: false }])
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (_: unknown, __: unknown, index: number) => (
        <Input value={value[index].name} onChange={(e) => update(index, 'name', e.target.value)} size="small" />
      ),
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 120,
      render: (_: unknown, __: unknown, index: number) => (
        <Select value={value[index].type} onChange={(v) => update(index, 'type', v)} size="small" style={{ width: '100%' }}
          options={[{ value: 'string', label: '字符串' }, { value: 'number', label: '数字' }, { value: 'boolean', label: '布尔' }]}
        />
      ),
    },
    {
      title: '必填', dataIndex: 'required', key: 'required', width: 72,
      render: (_: unknown, __: unknown, index: number) => (
        <Switch checked={value[index].required} onChange={(v) => update(index, 'required', v)} size="small" />
      ),
    },
    {
      title: '', key: 'action', width: 40,
      render: (_: unknown, __: unknown, index: number) => (
        <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => remove(index)} />
      ),
    },
  ]

  return (
    <div>
      <Table rowKey={(_, i) => String(i)} dataSource={value} columns={columns} pagination={false} size="small" />
      <Button type="dashed" icon={<PlusOutlined />} onClick={add} style={{ marginTop: 8 }} block>添加变量</Button>
    </div>
  )
}
