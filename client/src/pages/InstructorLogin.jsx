import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// Instructor Portal login. This portal is separate from the student JWT auth
// (AuthContext) — it has its own simple session stored in localStorage.
//
// The form sends plain strings; the backing endpoint validates them.
export default function InstructorLogin() {
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/instructors/login', { username, password })
      localStorage.setItem('instructor', JSON.stringify(res.data.instructor))
      nav('/portal/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-1">Instructor Portal</h1>
      <p className="text-sm text-zinc-600 mb-4">Staff sign-in</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn" type="submit">Sign in</button>
      </form>
    </div>
  )
}
