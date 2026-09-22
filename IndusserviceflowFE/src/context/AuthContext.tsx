import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthContextType, User } from '../types'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [orgId, setOrgId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('access')
    const username = localStorage.getItem('username') || localStorage.getItem('name') || ''
    const storedOrgId = localStorage.getItem('org_id') || ''
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expired = payload.exp * 1000 < Date.now()
        if (expired) {
          localStorage.clear()
        } else if (username) {
          setUser({ username })
          setOrgId(storedOrgId)
        }
      } catch {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const logout = () => {
    localStorage.clear()
    setUser(null)
    setOrgId('')
  }

  return (
    <AuthContext.Provider value={{ user, orgId, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
