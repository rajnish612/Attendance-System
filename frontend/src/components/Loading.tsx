import React from 'react'
import { useUiStore } from '../store/uiStore'

export default function Loading() {
  const isLoading = useUiStore((s) => s.isLoading)
  if (!isLoading) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-md bg-black/80 px-6 py-6 text-sm text-white">
        <div className="h-12 w-12 rounded-full border-4 border-t-transparent border-white/80 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )
}
