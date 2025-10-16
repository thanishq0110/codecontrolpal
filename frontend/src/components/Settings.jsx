import React, { useState } from 'react'
import { Save } from 'lucide-react'

export default function Settings() {
  const [serverName, setServerName] = useState('Palworld Server')
  const [maxPlayers, setMaxPlayers] = useState(32)
  const [difficulty, setDifficulty] = useState('Normal')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch('/api/server/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverName,
          maxPlayers,
          difficulty
        })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-xl font-semibold text-white mb-6">Server Settings</h3>

        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Players
            </label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option>Easy</option>
              <option>Normal</option>
              <option>Hard</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>

          {saved && (
            <div className="bg-green-900 border border-green-700 rounded-lg p-3 text-green-200">
              ✓ Settings saved successfully
            </div>
          )}
        </div>
      </div>
    </div>
  )
}