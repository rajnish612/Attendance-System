import{ useEffect } from 'react'
import { useUiStore } from '../store/uiStore'

export default function Message() {
  const { message, type, clearMessage } = useUiStore()

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => clearMessage(), 4000)
    return () => clearTimeout(t)
  }, [message, clearMessage])

  if (!message) return null

  const bg = type === 'error' ? 'bg-rose-600' : type === 'success' ? 'bg-emerald-600' : 'bg-slate-700'

  return (
    <div className={`fixed right-4 top-6 z-50 max-w-sm rounded-md px-4 py-2 text-sm text-white ${bg} shadow-lg`}>
      {message}
    </div>
  )
}
