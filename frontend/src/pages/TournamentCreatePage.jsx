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
    <div className="page-container-mid">
      <h1>Create Tournament</h1>

      {loadingVg && <p>Loading videogames...</p>}

      {!loadingVg && videogames.length === 0 && (
        <p className="text-error">No videogames available. Ask an admin to create one first.</p>
      )}

      {!loadingVg && videogames.length > 0 && (
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Name *</label><br />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label><br />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Videogame *</label><br />
            <select
              value={videogameId}
              onChange={(e) => setVideogameId(e.target.value)}
              required
            >
              {videogames.map(vg => (
                <option key={vg.id} value={vg.id}>{vg.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Type *</label><br />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="elimination">Elimination</option>
              <option value="league">League</option>
            </select>
          </div>

          <div className="form-group">
            <label>Start Date *</label><br />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>End Date <span className="text-muted text-small">(optional)</span></label><br />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Max Players * <span className="text-muted text-small">(must be a power of 2 for elimination)</span></label><br />
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              min={2}
              max={64}
              required
            />
          </div>

          {error && <p className="text-error">{error}</p>}

          <div className="form-actions gap-05">
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