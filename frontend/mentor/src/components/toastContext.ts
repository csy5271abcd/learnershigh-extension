import { createContext, useContext } from 'react'

export const ToastContext = createContext<(text: string) => void>(() => {})

/** 성공 알림을 띄운다. (ToastProvider 안에서만 보인다) */
export const useToast = () => useContext(ToastContext)
