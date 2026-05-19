import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { enrollInSubject, getSubjects, unenrollFromSubject } from '../utils/api'
import { useUiStore } from '../store/uiStore'

type SessionItem = {
  id: number
  code: string
  name: string
  description?: string
  total_enrolled?: number
  total_classes?: number
  teacher_username?: string | null
  teacher_full_name?: string | null
  is_enrolled?: boolean
  present_classes?: number
}

export default function StudentEnroll() {
  
  const [sessions, setSessions] = useState<SessionItem[] | null>(null)
  const [isFetchingSessions, setIsFetchingSessions] = useState<boolean>(true)
  const [enrolling, setEnrolling] = useState<number | null>(null)
  const [unenrolling, setUnenrolling] = useState<number | null>(null)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const setMessage = useUiStore((s) => s.setMessage)
  const setGlobalLoading = useUiStore((s) => s.setLoading)
  
  async function handleDeleteAccount() {
    if (!confirm('Delete your student account? This action cannot be undone.')) return
    setGlobalLoading(true)
    try {
      const { deleteStudentAccount } = await import('../utils/api')
      await deleteStudentAccount()
      clearAuth()
      navigate('/student', { replace: true })
      setMessage('Student account deleted', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setMessage(e.detail || e.message || 'Unable to delete account', 'error')
    } finally {
      setGlobalLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setIsFetchingSessions(true)
      try {
        const data = await getSubjects()
        if (!mounted) return
        setSessions(data.subjects || [])
      } catch (e) {
        void e
      } finally {
        setIsFetchingSessions(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  async function handleEnroll(sessionId: number) {
    try {
      setGlobalLoading(true)
      // optimistic UI update
      setEnrolling(sessionId)
      setSessions((cur) => (cur ? cur.map((s) => (s.id === sessionId ? { ...s, is_enrolled: true } : s)) : cur))
      const resp = await enrollInSubject({ subjectId: sessionId })
      const total = resp.total_enrolled
      setSessions((cur) => (cur ? cur.map((s) => (s.id === sessionId ? { ...s, total_enrolled: total, is_enrolled: true } : s)) : cur))
      setMessage(resp.message || 'Enrolled', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setMessage(e.detail || e.message || 'Unable to enroll', 'error')
    } finally {
      setEnrolling(null)
      setGlobalLoading(false)
    }
  }

  async function handleUnenroll(sessionId: number) {
    try {
      setGlobalLoading(true)
      setUnenrolling(sessionId)
      const resp = await unenrollFromSubject({ subjectId: sessionId })
      setSessions((cur) =>
        cur
          ? cur.map((s) =>
              s.id === sessionId
                ? { ...s, total_enrolled: resp.total_enrolled, is_enrolled: false, present_classes: 0 }
                : s,
            )
          : cur,
      )
      setMessage(resp.message || 'Unenrolled', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setMessage(e.detail || e.message || 'Unable to unenroll', 'error')
    } finally {
      setUnenrolling(null)
      setGlobalLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">
            Student Portal
          </p>
          <h1 className="text-2xl font-semibold">Enroll in subjects</h1>
        </div>
        <Link
          to="/student"
          className="rounded-full border border-white/15 px-4 py-1 text-xs text-white/80 hover:bg-white/10"
        >
          Back to login
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              clearAuth()
              navigate('/student', { replace: true })
            }}
            className="rounded-full border border-white/15 px-4 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Logout
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="rounded-full border border-rose-400/20 px-4 py-1 text-xs text-rose-300 hover:bg-rose-500/5"
          >
            Delete Account
          </button>
        </div>
      </div>

      {user?.role === 'student' && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Logged in student</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Name: {user.fullName}</span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Student ID: {user.studentId}</span>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
        <h2 className="text-sm uppercase tracking-[0.2em] text-slate-300/70">Available Sessions</h2>
        <div className="mt-4 grid gap-3">
          {isFetchingSessions || sessions === null ? (
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full border-4 border-t-transparent border-white/80 animate-spin" />
              <p>Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-slate-300/80">No sessions available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{s.code} - {s.name}</p>
                      <p className="mt-1 text-sm text-slate-300/80">{s.description}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Teacher: {s.teacher_full_name || 'Unknown'}{s.teacher_username ? ` (${s.teacher_username})` : ''}
                        </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm text-slate-300/80">{s.total_enrolled ?? 0} enrolled</p>
                        <p className="text-sm text-slate-300/80">
                          {typeof s.present_classes === 'number' ? s.present_classes : 0} / {typeof s.total_classes === 'number' ? s.total_classes : 0} classes present
                        </p>
                    </div>
                  </div>
                  <div className="mt-4">
                      {s.is_enrolled ? (
                        <button
                          type="button"
                          onClick={() => handleUnenroll(s.id)}
                          disabled={unenrolling === s.id}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${unenrolling === s.id ? 'bg-slate-700/40 cursor-not-allowed' : 'bg-linear-to-r from-rose-300 to-orange-300 text-slate-900'}`}
                        >
                          {unenrolling === s.id ? 'Unenrolling...' : 'Unenroll'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEnroll(s.id)}
                          disabled={enrolling === s.id}
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${enrolling === s.id ? 'bg-slate-700/40 cursor-not-allowed' : 'bg-linear-to-r from-emerald-300 to-cyan-300 text-slate-900'}`}
                        >
                          {enrolling === s.id ? 'Enrolling...' : 'Enroll'}
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
