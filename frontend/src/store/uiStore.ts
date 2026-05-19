import { create } from 'zustand'

type MessageType = 'info' | 'success' | 'error'

type UIState = {
  message: string | null
  type: MessageType
  isLoading: boolean
  setMessage: (message: string, type?: MessageType) => void
  clearMessage: () => void
  setLoading: (v: boolean) => void
}

export const useUiStore = create<UIState>((set) => ({
  message: null,
  type: 'info',
  isLoading: false,
  setMessage: (message: string, type: MessageType = 'info') => set({ message, type }),
  clearMessage: () => set({ message: null }),
  setLoading: (v: boolean) => set({ isLoading: v }),
}))
