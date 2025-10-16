import React, { useState, useEffect } from 'react'
import { Trash2, Ban } from 'lucide-react'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayers()
    const interval = setInterval(fetchPlayers, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchPlayers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/players', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setPlayers(data.players)
      }
    } catch (error) {
      console.error('Failed to fetch players:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKickPlayer = async (playerId) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/players/kick/${playerId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchPlayers()
    } catch (error) {
      console.error('Failed to kick player:', error)
    }
  }

  const handleBanPlayer = async (playerId) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`/api/players/ban/${playerId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchPlayers()
    } catch (error) {
      console.error('Failed to ban player:', error)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-xl font-semibold text-white mb-4">Connected Players</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Player Name</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Level</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Playtime (hrs)</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No players online
                  </td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr key={player.id} className="border-b border-dark-700 hover:bg-dark-700 transition">
                    <td className="py-3 px-4 text-white">{player.name}</td>
                    <td className="py-3 px-4 text-gray-300">{player.level}</td>
                    <td className="py-3 px-4 text-gray-300">{player.playtime}</td>
                    <td className="py-3 px-4 flex justify-end gap-2">
                      <button
                        onClick={() => handleKickPlayer(player.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                        title="Kick"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleBanPlayer(player.id)}
                        className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition"
                        title="Ban"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}