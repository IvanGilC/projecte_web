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
  const [formNameError, setFormNameError] = useState(false)
  const [formDescriptionError, setFormDescriptionError] = useState(false)
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
    setFormNameError(false)
    setFormDescriptionError(false)
    setShowForm(true)
  }

  const handleOpenEdit = (vg) => {
    setEditingVg(vg)
    setFormName(vg.name)
    setFormDescription(vg.description || '')
    setFormError(null)
    setFormNameError(false)
    setFormDescriptionError(false)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingVg(null)
    setFormError(null)
    setFormNameError(false)
    setFormDescriptionError(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormNameError(false)
    setFormDescriptionError(false)
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
      const message = err.response?.data?.error || 'Error saving videogame'
      setFormError(message)
      const lower = message.toLowerCase()
      setFormNameError(lower.includes('name'))
      setFormDescriptionError(lower.includes('description'))
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
    <div className="page-container-mid">
      <div className="flex flex-between">
        <h1>Videogames</h1>
        {user?.role === 'admin' && (
          <button onClick={handleOpenCreate}>+ New Videogame</button>
        )}
      </div>

      <div className="form-group">
        <input
          type="text"
          placeholder="Search by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No videogames found.</p>
      )}

      {!loading && !error && filtered.map(vg => (
        <div key={vg.id} className="card flex flex-between align-start">
          <div>
            <strong>{vg.name}</strong>
            {vg.description && (
              <p className="text-muted mb-05">{vg.description}</p>
            )}
          </div>
          {user?.role === 'admin' && (
            <div className="card-actions ml-1">
              <button onClick={() => handleOpenEdit(vg)}>Edit</button>
              <button
                onClick={() => handleDelete(vg)}
                className="button-danger"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingVg ? 'Edit Videogame' : 'New Videogame'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label><br />
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    setFormNameError(false)
                  }}
                  className={formNameError ? 'input-error' : ''}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label><br />
                <textarea
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value)
                    setFormDescriptionError(false)
                  }}
                  className={formDescriptionError ? 'input-error' : ''}
                  rows={3}
                />
              </div>
              {formError && <p className="text-error">{formError}</p>}
              <div className="form-actions gap-05">
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