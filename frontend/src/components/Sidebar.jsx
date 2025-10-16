import React from 'react'
import { Activity, Users, Settings, Folder, Terminal, Server } from 'lucide-react'

const menuItems = [
  { id: 'status', label: 'Server Status', icon: Activity },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'files', label: 'File Manager', icon: Folder },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export default function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <div className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col h-screen">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-blue-500" />
          <span className="font-bold text-lg text-white">Palworld</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700">
        <p className="text-xs text-gray-500 text-center">Palworld Panel v1.0</p>
      </div>
    </div>
  )
}