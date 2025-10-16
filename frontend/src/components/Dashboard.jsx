import React, { useState, useEffect } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Console from './Console'
import Players from './Players'
import Settings from './Settings'
import FileManager from './FileManager'
import ServerStatus from './ServerStatus'

export default function Dashboard({ setIsAuthenticated }) {
  const [currentPage, setCurrentPage] = useState('status')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'status':
        return <ServerStatus />
      case 'console':
        return <Console />
      case 'players':
        return <Players />
      case 'settings':
        return <Settings />
      case 'files':
        return <FileManager />
      default:
        return <ServerStatus />
    }
  }

  return (
    <div className="flex h-screen bg-dark-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out`}>
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-dark-700 rounded-lg transition"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-xl font-semibold text-white">Palworld Server Panel</h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Welcome, <strong>{user?.username}</strong></span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-dark-700 rounded-lg transition text-red-400 hover:text-red-300"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  )
}