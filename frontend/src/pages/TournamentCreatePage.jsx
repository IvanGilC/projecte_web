import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTournament } from '../services/tournamentsService.js'
import { getVideogames } from '../services/videogamesService.js'

function TournamentCreatePage() {
  const navigate = useNavigate()
  const [videogames, setVideogames] = useState([])
  const [loadingVg, setLoadingVg] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [videogameId, setVideogameId] = useState('')
  const [type, setType] = useState('elimination')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoadingVg(true)
        const res = await getVideogames()
        if (!cancelled) {
          setVideogames(res.data)
          if (res.data.length > 0) setVideogameId(res.data[0].id)
        }
      } catch {
        if (!cancelled) setError('Error loading videogames')
      } finally {
        if (!cancelled) setLoadingVg(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await createTournament({
        name,
        description,
        videogame_id: Number(videogameId),
        type,
        start_date: startDate,
        end_date: endDate || undefined,
        max_players: Number(maxPlayers)
      })
      navigate(`/tournaments/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating tournament')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem' }}>
      <h1>Create Tournament</h1>

      {loadingVg && <p>Loading videogames...</p>}

      {!loadingVg && videogames.length === 0 && (
        <p style={{ color: 'red' }}>No videogames available. Ask an admin to create one first.</p>
      )}

      {!loadingVg && videogames.length > 0 && (
        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: '1rem' }}>
            <label>Name *</label><br />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Description</label><br />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Videogame *</label><br />
            <select
              value={videogameId}
              onChange={(e) => setVideogameId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            >
              {videogames.map(vg => (
                <option key={vg.id} value={vg.id}>{vg.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Type *</label><br />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            >
              <option value="elimination">Elimination</option>
              <option value="league">League</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Start Date *</label><br />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>End Date <span style={{ color: '#888', fontSize: '0.85rem' }}>(optional)</span></label><br />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Max Players * <span style={{ color: '#888', fontSize: '0.85rem' }}>(must be a power of 2 for elimination)</span></label><br />
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              min={2}
              max={64}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>

        </form>
      )}
    </div>
  )
}

export default TournamentCreatePage