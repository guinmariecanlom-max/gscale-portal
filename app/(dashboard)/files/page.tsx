'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type FileRecord = {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  category: string
  client_id: string
  created_at: string
  clients?: { business_name: string }
  users?: { full_name: string }
}

type Client = {
  id: string
  business_name: string
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  brief: { bg: '#eff6ff', text: '#3b82f6' },
  asset: { bg: '#faf5ff', text: '#8b5cf6' },
  deliverable: { bg: '#f0fdf4', text: '#16a34a' },
  report: { bg: '#fff7ed', text: '#f59e0b' },
  other: { bg: '#f1f5f9', text: '#64748b' },
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter] = useState('all')
  const [userId, setUserId] = useState<string | null>(null)

  const [form, setForm] = useState({
    client_id: '',
    category: 'other',
    file: null as File | null,
  })

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) setUserId(session.user.id)

    const { data: filesData } = await supabase
      .from('files')
      .select('*, clients(business_name), users:uploaded_by(full_name)')
      .order('created_at', { ascending: false })

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, business_name')
      .order('business_name')

    if (filesData) setFiles(filesData)
    if (clientsData) setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.file || !form.client_id || !userId) return
    setUploading(true)

    const timestamp = Date.now()
    const filePath = `${form.client_id}/${timestamp}-${form.file.name}`

    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, form.file)

    if (uploadError) {
      setUploading(false)
      return
    }

    await supabase.from('files').insert({
      client_id: form.client_id,
      uploaded_by: userId,
      file_name: form.file.name,
      file_path: filePath,
      file_type: form.file.type,
      file_size: form.file.size,
      category: form.category,
    })

    setForm({ client_id: '', category: 'other', file: null })
    setShowUpload(false)
    setUploading(false)
    loadData()
  }

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('files').getPublicUrl(filePath)
    return data.publicUrl
  }

  const deleteFile = async (id: string, filePath: string) => {
    await supabase.storage.from('files').remove([filePath])
    await supabase.from('files').delete().eq('id', id)
    loadData()
  }

  const filteredFiles = filter === 'all' ? files : files.filter(f => f.category === filter)

  if (loading) return <p style={{ color: 'rgba(42,37,32,0.5)' }}>Loading files...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Files</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(42,37,32,0.5)' }}>{files.length} total files</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors">+ Upload File</button>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'brief', 'asset', 'deliverable', 'report', 'other'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors" style={{ backgroundColor: filter === f ? '#2A2520' : '#FFFFFF', color: filter === f ? '#FFFFFF' : 'rgba(42,37,32,0.6)', border: filter === f ? 'none' : '1px solid #EBE3D3' }}>
            {f === 'all' ? `All (${files.length})` : `${f} (${files.filter(x => x.category === f).length})`}
          </button>
        ))}
      </div>

      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-cream text-center">
          <p className="text-sm" style={{ color: 'rgba(42,37,32,0.4)' }}>No files yet. Click &quot;+ Upload File&quot; to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream" style={{ backgroundColor: 'rgba(250,248,240,0.5)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>File</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Category</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Size</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Uploaded</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(42,37,32,0.5)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const cc = categoryColors[file.category] || categoryColors.other
                return (
                  <tr key={file.id} className="border-b border-cream/50 hover:bg-cream-light/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-ink">{file.file_name}</p>
                      <p className="text-xs" style={{ color: 'rgba(42,37,32,0.4)' }}>{file.file_type || 'Unknown type'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: 'rgba(42,37,32,0.7)' }}>{file.clients?.business_name || '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: cc.bg, color: cc.text }}>{file.category}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>{formatSize(file.file_size)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: 'rgba(42,37,32,0.5)' }}>{new Date(file.created_at).toLocaleDateString()}</p>
                      <p className="text-xs" style={{ color: 'rgba(42,37,32,0.35)' }}>{file.users?.full_name || ''}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <a href={getDownloadUrl(file.file_path)} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: '#3b82f6' }}>Download</a>
                        <button onClick={() => deleteFile(file.id, file.file_path)} className="text-xs px-2.5 py-1 rounded border border-cream hover:bg-cream/50" style={{ color: '#ef4444' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-cream flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Upload File</h3>
              <button onClick={() => setShowUpload(false)} className="text-xl" style={{ color: 'rgba(42,37,32,0.3)' }}>x</button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Client *</label>
                <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white" required>
                  <option value="">Select a client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm bg-white">
                  <option value="brief">Brief</option>
                  <option value="asset">Asset</option>
                  <option value="deliverable">Deliverable</option>
                  <option value="report">Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">File *</label>
                <input
                  type="file"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2.5 border border-cream rounded-lg text-sm"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-2.5 border border-cream rounded-lg text-sm font-medium hover:bg-cream/30 transition-colors" style={{ color: 'rgba(42,37,32,0.6)' }}>Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
