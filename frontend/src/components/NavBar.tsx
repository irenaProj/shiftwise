import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import { api } from '../lib/api'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Team' },
  { to: '/skills', label: 'Skills' },
  { to: '/shift-templates', label: 'Templates' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/availability', label: 'Availability' },
]

export function NavBar() {
  const { user, workspace, clear } = useAuthStore()
  const { pathname } = useLocation()

  async function handleLogout() {
    await api.post('/auth/logout')
    clear()
    window.location.href = '/login'
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900">ShiftWise</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 text-sm">{workspace?.name}</span>
          <span className="text-slate-300 hidden sm:block">|</span>
          <div className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.to
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:block">{user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
