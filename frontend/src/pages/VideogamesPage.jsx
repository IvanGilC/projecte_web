import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth.js'
import { getVideogames } from '../services/videogamesService.js'
import api from '../services/api.js'

function VideogamesPage() {
  const { user } = useAuth()
  const [videogames, setVideogames] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [editingVg, setEditingVg] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formError, setFormError] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getVideogames()
        if (!cancelled) setVideogames(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error loading videogames')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [refresh])

  const filtered = videogames.filter(vg =>
    vg.name.toLowerCase().includes(filter.toLowerCase())
  )

  const handleOpenCreate = () => {
    setEditingVg(null)
    setFormName('')
    setFormDescription('')
    setFormError(null)
    setShowForm(true)
  }

  const handleOpenEdit = (vg) => {
    setEditingVg(vg)
    setFormName(vg.name)
    setFormDescription(vg.description || '')
    setFormError(null)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingVg(null)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)
    try {
      if (editingVg) {
        await api.put(`/videogames/${editingVg.id}`, {
          name: formName,
          description: formDescription
        })
      } else {
        await api.post('/videogames', {
          name: formName,
          description: formDescription
        })
      }
      handleCloseForm()
      setRefresh(r => r + 1)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error saving videogame')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (vg) => {
    if (!window.confirm(`Delete "${vg.name}"?`)) return
    try {
      await api.delete(`/videogames/${vg.id}`)
      setRefresh(r => r + 1)
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting videogame')
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Videogames</h1>
        {user?.role === 'admin' && (
          <button onClick={handleOpenCreate}>+ New Videogame</button>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
        />
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No videogames found.</p>
      )}

      {!loading && !error && filtered.map(vg => (
        <div
          key={vg.id}
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <strong>{vg.name}</strong>
            {vg.description && (
              <p style={{ margin: '0.25rem 0 0', color: '#555' }}>{vg.description}</p>
            )}
          </div>
          {user?.role === 'admin' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              <button onClick={() => handleOpenEdit(vg)}>Edit</button>
              <button
                onClick={() => handleDelete(vg)}
                style={{ color: 'red' }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '8px',
            minWidth: '320px', maxWidth: '480px', width: '100%'
          }}>
            <h2>{editingVg ? 'Edit Videogame' : 'New Videogame'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Name *</label><br />
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Description</label><br />
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
                />
              </div>
              {formError && <p style={{ color: 'red' }}>{formError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleCloseForm} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideogamesPage