import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/teacher', label: 'Teacher Portal' },
  { to: '/student', label: 'Student Portal' },
]

export default function Header() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <header className="sticky top-0 z-20 w-full border-b border-white/5 bg-black/30 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="text-lg font-semibold tracking-wide text-white">
          AttendanceAI
        </Link>
        {!isAuthenticated && (
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-slate-200/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
