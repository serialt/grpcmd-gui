import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Editor from '@monaco-editor/react'
import { useState } from 'react'

export default function MetadataPopup({
  metadata,
  setMetadata,
  theme,
}: {
  metadata: string
  setMetadata: (val: string) => void
  theme: string
}) {
  const [open, setOpen] = useState(false)
  const [tempMetadata, setTempMetadata] = useState(metadata) // 临时保存编辑内容

  const handleOpen = () => {
    setTempMetadata(metadata) // 每次打开弹窗时重置为当前 metadata
    setOpen(true)
  }

  const handleSave = () => {
    setMetadata(tempMetadata)
    setOpen(false)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(tempMetadata)
      const formatted = JSON.stringify(parsed, null, 2)
      setTempMetadata(formatted)
    } catch (err) {
      alert('Invalid JSON, cannot format.')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          Set Metadata
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-2">
        <h3 className="text-sm font-semibold mb-2">Metadata JSON</h3>
        <Editor
          height="200px"
          language="json"
          value={tempMetadata}
          onChange={(v) => setTempMetadata(v ?? '')}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            theme: theme === 'light' ? 'vs' : 'vs-dark',
            tabSize: 2,
          }}
        />
        <div className="flex justify-center items-center mt-2 px-2">
          {/* 左侧 Format 按钮 */}
          <Button variant="outline" size="sm" onClick={handleFormat}>
            Format
          </Button>

          {/* 中间间距 */}
          <div className="w-6" />

          {/* 右侧 Cancel 和 Save */}
          <div className="flex space-x-2">
            <Button variant="default" size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>

          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
