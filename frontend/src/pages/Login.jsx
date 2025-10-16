import React, { useState } from 'react'
import { Lock, Server } from 'lucide-react'

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-800 rounded-lg shadow-2xl p-8 border border-dark-700">
          {/* Logo/Header */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-white">Palworld Panel</h1>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-3 text-red-200 text-sm flex items-gap gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-dark-700 text-center">
            <p className="text-gray-400 text-sm">
              Default credentials: admin / changeme123
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}