import React, { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'

export default function Console() {
  const [logs, setLogs] = useState([])
  const [autoScroll, setAutoScroll] = useState(true)
  const consoleEndRef = useRef(null)

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/console/logs?lines=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  const handleClearLogs = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/console/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Server Console</h3>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>

        <div className="bg-black rounded-lg p-4 font-mono text-sm text-gray-200 h-96 overflow-y-auto border border-dark-700">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No logs yet...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="text-green-400 whitespace-pre-wrap break-words">
                {log}
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>

        <label className="mt-4 flex items-center gap-2 text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4"
          />
          Auto-scroll
        </label>
      </div>
    </div>
  )
}