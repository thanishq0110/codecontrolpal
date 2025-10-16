import React, { useState, useEffect } from 'react'
import { Play, Square, RotateCcw, Activity } from 'lucide-react'

export default function ServerStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/server/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleServerAction = async (action) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/server/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        fetchStatus()
      }
    } catch (error) {
      console.error(`Failed to ${action} server:`, error)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Server Status
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status?.running
              ? 'bg-green-900 text-green-200'
              : 'bg-red-900 text-red-200'
          }`}>
            {status?.running ? '🟢 Running' : '🔴 Stopped'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-dark-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Players Online</p>
            <p className="text-2xl font-bold text-white">{status?.players_online || 0}</p>
          </div>
          <div className="bg-dark-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Server FPS</p>
            <p className="text-2xl font-bold text-white">{status?.fps || 0}</p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleServerAction('start')}
            disabled={status?.running}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition font-medium"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
          <button
            onClick={() => handleServerAction('stop')}
            disabled={!status?.running}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition font-medium"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
          <button
            onClick={() => handleServerAction('restart')}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
        </div>
      </div>
    </div>
  )
}