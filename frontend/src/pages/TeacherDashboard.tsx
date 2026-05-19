import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { createSubject, getAttendanceRecords, getTeacherSubjects, takeAttendance, deleteSubject, deleteTeacherAccount } from '../utils/api'
import { useUiStore } from '../store/uiStore'

type Subject = {
  id: number | string
  code: string
  name: string
  description?: string
  total_enrolled?: number
  total_classes?: number
}

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const user = useAuthStore((state) => state.user)

  const [activePanel, setActivePanel] = useState<'create' | 'take' | 'record'>('create')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | number | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null)
  const [attendanceResult, setAttendanceResult] = useState<null | {
    message: string
    present_count?: number
    absent_count?: number
    total_enrolled?: number
    total_classes?: number
    present_students?: Array<{ student_id: string; full_name: string; distance: number }>
    absent_students?: Array<{ student_id: string; full_name: string }>
  }>(null)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [recordSessions, setRecordSessions] = useState<Array<{
    recorded_at: string | null
    present_count: number
    absent_count: number
    total_enrolled: number
    present_students: Array<{ student_id: string; full_name: string }>
    absent_students: Array<{ student_id: string; full_name: string }>
  }>>([])
  const [recordError, setRecordError] = useState<string | null>(null)
  const setMessage = useUiStore((s) => s.setMessage)
  const setLoading = useUiStore((s) => s.setLoading)
  const [deletingSubjectId, setDeletingSubjectId] = useState<number | null>(null)

  async function handleDeleteSubject(subjectId: number) {
    if (!confirm('Delete this subject? This will remove attendance and enrollments.')) return
    setLoading(true)
    setDeletingSubjectId(subjectId)
    try {
      await deleteSubject({ subjectId })
      const data = await getTeacherSubjects()
      setSubjects(data.subjects || [])
      setMessage('Subject deleted', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setMessage(e.detail || e.message || 'Unable to delete subject', 'error')
    } finally {
      setDeletingSubjectId(null)
      setLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Delete your teacher account? This action cannot be undone.')) return
    setLoading(true)
    try {
      await deleteTeacherAccount()
      clearAuth()
      navigate('/teacher', { replace: true })
      setMessage('Teacher account deleted', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setMessage(e.detail || e.message || 'Unable to delete account', 'error')
    } finally {
      setLoading(false)
    }
  }
  

  // create form
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTeacherSubjects()
        if (!mounted) return
        setSubjects(data.subjects || [])
      } catch (err) {
        const e = err as { detail?: string; message?: string }
        setFetchError(e.detail || e.message || 'Unable to load subjects — are you logged in as a teacher?')
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [setLoading])

  async function handleCreateSubject() {
    setLoading(true)
    try {
      const resp = await createSubject({ code, name, description: '' })
      const subject = resp.subject
      setSubjects((cur) => (cur.some((s) => s.id === subject.id) ? cur : [...cur, subject]))
      setSelectedSubjectId(subject.id)
      setActivePanel('take')
      setCode('')
      setName('')
      setMessage('Subject created', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setMessage(e.detail || e.message || 'Unable to create subject', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleTakeAttendance() {
    if (!selectedSubjectId || !attendanceFile) {
      setAttendanceError('Select a subject and upload one image first.')
      return
    }

    setLoading(true)
    try {
      setAttendanceError(null)
      setAttendanceResult(null)
      setShowAttendanceModal(false)
      const resp = await takeAttendance({ subjectId: Number(selectedSubjectId), image: attendanceFile })
      setAttendanceResult(resp)
      setShowAttendanceModal(true)
      setAttendanceFile(null)
      const data = await getTeacherSubjects()
      setSubjects(data.subjects || [])
      setMessage('Attendance recorded', 'success')
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setAttendanceError(e.detail || e.message || 'Unable to record attendance')
      setMessage(e.detail || e.message || 'Unable to record attendance', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleViewRecords(subjectId: number | string) {
    setLoading(true)
    try {
      setRecordError(null)
      const data = await getAttendanceRecords({ subjectId: Number(subjectId) })
      setSelectedSubjectId(subjectId)
      setRecordSessions(data.sessions || [])
    } catch (err) {
      const e = err as { detail?: string; message?: string }
      setRecordError(e.detail || e.message || 'Unable to load attendance records')
      setRecordSessions([])
      setMessage(e.detail || e.message || 'Unable to load attendance records', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10">
      <div className="grid gap-8">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">Teacher Dashboard</p>
              <h1 className="text-2xl font-semibold">Manage Subjects</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  clearAuth()
                  navigate('/teacher', { replace: true })
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

          {user?.role === 'teacher' && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-300/70">Logged in teacher</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Name: {user.fullName}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Username: {user.username}</span>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setActivePanel('create')}
              className={`rounded-xl border border-white/10 p-4 text-left transition ${
                activePanel === 'create' ? 'bg-white/15' : 'bg-black/30 hover:bg-white/10'
              }`}
            >
              <p className="text-xs text-slate-300/70">Create Subject</p>
              <p className="mt-2 text-sm text-slate-300/90">Create a persistent subject (code + name).</p>
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('take')}
              className={`rounded-xl border border-white/10 p-4 text-left transition ${
                activePanel === 'take' ? 'bg-white/15' : 'bg-black/30 hover:bg-white/10'
              }`}
            >
              <p className="text-xs text-slate-300/70">Take Attendance</p>
              <p className="mt-2 text-sm text-slate-300/90">Start a live attendance scan for a subject.</p>
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('record')}
              className={`rounded-xl border border-white/10 p-4 text-left transition ${
                activePanel === 'record' ? 'bg-white/15' : 'bg-black/30 hover:bg-white/10'
              }`}
            >
              <p className="text-xs text-slate-300/70">Attendance Record</p>
              <p className="mt-2 text-sm text-slate-300/90">Review recent attendance logs.</p>
            </button>
          </div>

          {activePanel === 'create' && (
            <form className="mt-6 grid gap-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-300/70">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  placeholder="CS101"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-300/70">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  placeholder="Data Structures"
                />
              </div>


              <button
                type="button"
                onClick={handleCreateSubject}
                className="rounded-xl bg-linear-to-r from-emerald-300 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20"
              >
                Create Subject
              </button>
            </form>
          )}

          {activePanel === 'take' && (
            <div className="mt-8 grid gap-4">
              {fetchError && (
                <div className="mb-4 rounded-md bg-red-600/10 p-3 text-sm text-red-400">{fetchError}</div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-300/70">Choose a subject to take attendance</label>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(subjects.length ? subjects : []).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`text-left rounded-xl border p-4 transition ${
                        String(selectedSubjectId) === String(sub.id) ? 'border-emerald-400 bg-white/5' : 'border-white/10 bg-black/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{sub.code} - {sub.name}</p>
                          <p className="mt-1 text-sm text-slate-300/80">{sub.description}</p>
                        </div>
                        <div className="ml-4 shrink-0">
                          <div className="rounded-full bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-200">
                            {typeof sub.total_enrolled === 'number' ? sub.total_enrolled : 0} enrolled
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubject(Number(sub.id)) }}
                          disabled={deletingSubjectId === Number(sub.id)}
                          className="rounded-full px-3 py-1 text-xs text-rose-200 bg-rose-600/10"
                        >
                          {deletingSubjectId === Number(sub.id) ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-slate-300/70">Upload photos</label>
                <div className="mt-2 rounded-xl border border-dashed border-white/20 bg-black/30 p-4 text-sm text-slate-300/90">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)}
                  />
                  <p className="mt-2 text-xs text-slate-400">Upload one image containing one or more student faces.</p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  disabled={!selectedSubjectId || !attendanceFile}
                  onClick={handleTakeAttendance}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg ${
                    selectedSubjectId && attendanceFile
                      ? 'bg-linear-to-r from-blue-300 to-cyan-300 shadow-cyan-500/20'
                      : 'bg-slate-700/40 cursor-not-allowed'
                  }`}
                >
                  Take Attendance
                </button>
                {attendanceError && <p className="mt-3 text-sm text-red-300">{attendanceError}</p>}
              </div>
            </div>
          )}

          {activePanel === 'record' && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300/90">
              {subjects.length === 0 ? (
                <p>No subjects have been created yet.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                  <div className="space-y-3">
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleViewRecords(s.id)}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          String(selectedSubjectId) === String(s.id) ? 'border-emerald-400 bg-white/5' : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <p className="font-semibold text-white">{s.code} - {s.name}</p>
                        <p className="mt-1 text-slate-300/80">{s.description}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {typeof s.total_enrolled === 'number' ? s.total_enrolled : 0} enrolled, {typeof s.total_classes === 'number' ? s.total_classes : 0} classes
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-300/70">Attendance Record</p>
                    {recordError && <p className="mt-3 text-sm text-red-300">{recordError}</p>}
                    {!recordError && recordSessions.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-300/80">Click a subject to view the latest attendance sessions.</p>
                    ) : null}

                    <div className="mt-4 space-y-3">
                      {recordSessions.map((session, index) => (
                        <div key={`${session.recorded_at || 'session'}-${index}`} className="rounded-lg border border-white/10 bg-black/30 p-4">
                          <p className="text-sm font-semibold text-white">
                            Present: {session.present_count} / {session.total_enrolled}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Absent: {session.absent_count}</p>
                          <p className="mt-1 text-xs text-slate-400">{session.recorded_at ? new Date(session.recorded_at).toLocaleString() : 'Unknown time'}</p>
                          <div className="mt-3 space-y-1 text-sm text-slate-200">
                            {session.present_students.map((student) => (
                              <p key={student.student_id}>{student.full_name} ({student.student_id})</p>
                            ))}
                          </div>
                          {session.absent_students.length ? (
                            <div className="mt-4 space-y-1 text-sm text-slate-400">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Absent students</p>
                              {session.absent_students.map((student) => (
                                <p key={student.student_id}>{student.full_name} ({student.student_id})</p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </section>
      </div>

      {showAttendanceModal && attendanceResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">Attendance Result</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{attendanceResult.message}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-100/70">Present</p>
                <p className="mt-2 text-3xl font-bold text-emerald-100">
                  {attendanceResult.present_count || 0} / {attendanceResult.total_enrolled || 0}
                </p>
              </div>
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-100/70">Absent</p>
                <p className="mt-2 text-3xl font-bold text-rose-100">{attendanceResult.absent_count || 0}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-100/70">Total Classes</p>
                <p className="mt-2 text-3xl font-bold text-cyan-100">{attendanceResult.total_classes || 0}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Present Students</p>
                <div className="mt-3 space-y-1 text-sm text-slate-200">
                  {attendanceResult.present_students?.length ? (
                    attendanceResult.present_students.map((student) => (
                      <p key={student.student_id}>{student.full_name} ({student.student_id})</p>
                    ))
                  ) : (
                    <p className="text-slate-400">No students marked present.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Absent Students</p>
                <div className="mt-3 space-y-1 text-sm text-slate-200">
                  {attendanceResult.absent_students?.length ? (
                    attendanceResult.absent_students.map((student) => (
                      <p key={student.student_id}>{student.full_name} ({student.student_id})</p>
                    ))
                  ) : (
                    <p className="text-slate-400">No absentees.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
