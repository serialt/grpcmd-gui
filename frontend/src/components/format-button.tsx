import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function FormatButton({ request, setRequest }: { request: string, setRequest: (v: string) => void }) {
  const [showWarning, setShowWarning] = useState(false)

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(request), null, 2)
      setRequest(formatted)
    } catch (err) {
      setShowWarning(true)
    }
  }

  return (
    <>
      <Button id="format-request-json" variant="outline" onClick={handleFormat}>
        Format JSON
      </Button>

      {/* 弹窗 */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80 text-center">
            <p className="mb-4 text-red-600 font-semibold">Invalid JSON, cannot format.</p>
            <Button onClick={() => setShowWarning(false)}>OK</Button>
          </div>
        </div>
      )}
    </>
  )
}
