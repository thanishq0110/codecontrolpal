import React, { useState, useEffect, useRef } from 'react'
import { Play, Square, RotateCcw, Activity, Plus, Trash2, ChevronDown, ChevronUp, Terminal, Gauge } from 'lucide-react'
import io from 'socket.io-client'

let socket = null;

export default function ServerStatus() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedServer, setExpandedServer] = useState(null)
  const [serverLogs, setServerLogs] = useState({})
  const [serverStats, setServerStats] = useState({})
  const [consoleInput, setConsoleInput] = useState('')
  const logsEndRef = useRef(null)
  const [formData, setFormData] = useState({
    serverName: '',
    maxPlayers: 32,
    difficulty: 'Normal'
  })
  const [creatingServer, setCreatingServer] = useState(false)

  // Auto-scroll to bottom of logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [serverLogs])

  useEffect(() => {
    fetchServers()
    
    // Connect to WebSocket
    if (!socket) {
      socket = io()
      
      // Server lifecycle events
      socket.on('server:created', (server) => {
        setServers(prev => [server, ...prev])
        setServerLogs(prev => ({ ...prev, [server.id]: [] }))
        setServerStats(prev => ({ ...prev, [server.id]: {} }))
      })
      
      socket.on('server:started', (data) => {
        setServers(prev => prev.map(s => s.id === data.id ? { ...s, running: 1 } : s))
      })
      
      socket.on('server:stopped', (data) => {
        setServers(prev => prev.map(s => s.id === data.id ? { ...s, running: 0 } : s))
      })
      
      socket.on('server:restarted', (data) => {
        setServers(prev => prev.map(s => s.id === data.id ? { ...s, running: 1 } : s))
        setServerLogs(prev => ({ ...prev, [data.id]: [...(prev[data.id] || []), '[Server restarted]'] }))
      })
      
      socket.on('server:deleted', (data) => {
        setServers(prev => prev.filter(s => s.id !== data.id))
        setServerLogs(prev => {
          const { [data.id]: _, ...rest } = prev
          return rest
        })
        setServerStats(prev => {
          const { [data.id]: _, ...rest } = prev
          return rest
        })
      })

      // Console logs
      socket.on('log', (data) => {
        setServerLogs(prev => ({
          ...prev,
          [data.serverId]: [...(prev[data.serverId] || []), data.message]
        }))
      })

      // Dynamic log events
      socket.onAny((eventName, data) => {
        if (eventName.includes(':log')) {
          const serverId = eventName.split(':')[1]
          setServerLogs(prev => ({
            ...prev,
            [serverId]: [...(prev[serverId] || []), data.message]
          }))
        }
      })

      // Real-time stats
      socket.on('server:stats:update', (data) => {
        setServerStats(prev => ({
          ...prev,
          [data.serverId]: data.stats
        }))
      })
    }

    const interval = setInterval(fetchServers, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchServers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/server/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setServers(data)
        
        // Initialize logs and stats
        data.forEach(server => {
          if (!serverLogs[server.id]) {
            setServerLogs(prev => ({ ...prev, [server.id]: [] }))
          }
          if (!serverStats[server.id]) {
            setServerStats(prev => ({ ...prev, [server.id]: {} }))
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServerLogs = async (serverId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/server/${serverId}/logs?lines=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setServerLogs(prev => ({ ...prev, [serverId]: data.logs || [] }))
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    }
  }

  const subscribeToStats = (serverId) => {
    if (socket) {
      socket.emit('subscribe:stats', serverId)
    }
  }

  const handleCreateServer = async () => {
    if (!formData.serverName.trim()) {
      alert('Server name is required')
      return
    }

    setCreatingServer(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/server/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        const newServer = await response.json()
        setServers(prev => [newServer, ...prev])
        setShowCreateModal(false)
        setFormData({ serverName: '', maxPlayers: 32, difficulty: 'Normal' })
      } else {
        alert('Failed to create server')
      }
    } catch (error) {
      console.error('Failed to create server:', error)
      alert('Error creating server')
    } finally {
      setCreatingServer(false)
    }
  }

  const handleServerAction = async (serverId, action) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/server/${serverId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        if (action === 'start') {
          subscribeToStats(serverId)
          fetchServerLogs(serverId)
        }
        fetchServers()
      } else {
        const error = await response.json()
        alert(error.error || 'Action failed')
      }
    } catch (error) {
      console.error(`Failed to ${action} server:`, error)
    }
  }

  const handleDeleteServer = async (serverId) => {
    if (!confirm('Are you sure you want to delete this server?')) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/server/${serverId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        setServers(prev => prev.filter(s => s.id !== serverId))
      }
    } catch (error) {
      console.error('Failed to delete server:', error)
    }
  }

  const sendConsoleCommand = async (serverId, command) => {
    if (!command.trim()) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/server/${serverId}/console`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      })
      if (response.ok) {
        setConsoleInput('')
        fetchServerLogs(serverId)
      }
    } catch (error) {
      console.error('Failed to send command:', error)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Servers ({servers.length})
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Server
        </button>
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-96 border border-dark-700">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Server</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  value={formData.serverName}
                  onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="My Awesome Server"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Players
                </label>
                <input
                  type="number"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  min="1"
                  max="64"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option>Easy</option>
                  <option>Normal</option>
                  <option>Hard</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition"
                disabled={creatingServer}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateServer}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                disabled={creatingServer}
              >
                {creatingServer ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Servers List */}
      <div className="space-y-4">
        {servers.length === 0 ? (
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700 text-center text-gray-400">
            No servers yet. Create one to get started!
          </div>
        ) : (
          servers.map(server => (
            <div key={server.id} className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
              {/* Server Header */}
              <div className="p-6 cursor-pointer hover:bg-dark-750 transition" onClick={() => {
                setExpandedServer(expandedServer === server.id ? null : server.id)
                if (expandedServer !== server.id) {
                  fetchServerLogs(server.id)
                  subscribeToStats(server.id)
                }
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{server.server_name}</h4>
                      <p className="text-sm text-gray-400">Port: {server.port} • Max Players: {server.max_players} • Difficulty: {server.difficulty}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Real-time Stats */}
                    {server.running && serverStats[server.id] && (
                      <div className="flex gap-4 text-sm text-gray-300 mr-4">
                        {serverStats[server.id].cpu_percent !== undefined && (
                          <div className="flex items-center gap-1">
                            <Gauge className="w-4 h-4 text-yellow-500" />
                            <span>{serverStats[server.id].cpu_percent.toFixed(1)}%</span>
                          </div>
                        )}
                        {serverStats[server.id].memory_usage !== undefined && (
                          <div className="flex items-center gap-1">
                            <span className="text-cyan-400">{serverStats[server.id].memory_usage}/{serverStats[server.id].memory_limit}MB</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      server.running
                        ? 'bg-green-900 text-green-200'
                        : 'bg-red-900 text-red-200'
                    }`}>
                      {server.running ? '🟢 Running' : '🔴 Stopped'}
                    </div>
                    
                    {expandedServer === server.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleServerAction(server.id, 'start')}
                    disabled={server.running}
                    className="flex items-center gap-2 flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition font-medium justify-center"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                  <button
                    onClick={() => handleServerAction(server.id, 'stop')}
                    disabled={!server.running}
                    className="flex items-center gap-2 flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition font-medium justify-center"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                  <button
                    onClick={() => handleServerAction(server.id, 'restart')}
                    disabled={!server.running}
                    className="flex items-center gap-2 flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition font-medium justify-center"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </button>
                  <button
                    onClick={() => handleDeleteServer(server.id)}
                    disabled={server.running}
                    className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Console */}
              {expandedServer === server.id && (
                <div className="border-t border-dark-700 p-6 bg-dark-900">
                  <div className="flex items-center gap-2 mb-4">
                    <Terminal className="w-5 h-5 text-cyan-500" />
                    <h5 className="text-lg font-semibold text-white">Console</h5>
                  </div>

                  {/* Console Logs */}
                  <div className="bg-black rounded-lg p-4 mb-4 font-mono text-sm max-h-96 overflow-y-auto border border-dark-600">
                    {(serverLogs[server.id] || []).length === 0 ? (
                      <div className="text-gray-500">No logs yet...</div>
                    ) : (
                      (serverLogs[server.id] || []).map((log, idx) => (
                        <div key={idx} className="text-gray-300 hover:bg-dark-700 px-2 py-1">
                          <span className="text-green-500">&gt;</span> {log}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>

                  {/* Console Input */}
                  {server.running && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={consoleInput}
                        onChange={(e) => setConsoleInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            sendConsoleCommand(server.id, consoleInput)
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="Type command... (Enter to send)"
                      />
                      <button
                        onClick={() => sendConsoleCommand(server.id, consoleInput)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-medium"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}