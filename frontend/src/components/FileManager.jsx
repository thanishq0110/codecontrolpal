import React, { useState, useEffect } from 'react'
import { Download, Trash2, FolderOpen, File } from 'lucide-react'

export default function FileManager() {
  const [files, setFiles] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFiles()
  }, [currentPath])

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/files/list?path=${currentPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
        <h3 className="text-xl font-semibold text-white mb-4">File Manager</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Size</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Modified</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No files
                  </td>
                </tr>
              ) : (
                files.map((file, idx) => (
                  <tr key={idx} className="border-b border-dark-700 hover:bg-dark-700 transition">
                    <td className="py-3 px-4 text-white flex items-center gap-2">
                      {file.isDirectory ? (
                        <FolderOpen className="w-4 h-4 text-blue-400" />
                      ) : (
                        <File className="w-4 h-4 text-gray-400" />
                      )}
                      {file.name}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {file.size ? `${(file.size / 1024).toFixed(2)} KB` : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {new Date(file.modified).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 flex justify-end">
                      {!file.isDirectory && (
                        <button className="p-2 hover:bg-dark-600 text-gray-400 hover:text-white rounded transition">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
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