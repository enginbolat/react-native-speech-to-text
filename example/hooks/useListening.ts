import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SpeechRecognizer,
  type SpeechCallbacks,
  type SpeechErrorResult,
  type SpeechRecognitionOptions,
} from 'react-native-speech-to-text'

export interface UseListeningOptions {
  defaultLocale?: string
  contextualStrings?: string[]
}

export interface UseListeningReturn {
  available: boolean | null
  isListening: boolean
  result: string
  volume: number
  locale: string
  error: string | null
  setLocale: (locale: string) => void
  checkAvailable: () => Promise<void>
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  cancelListening: () => Promise<void>
}

export function useListening(
  options: UseListeningOptions = {}
): UseListeningReturn {
  const { defaultLocale = 'en-US', contextualStrings } = options

  const [available, setAvailable] = useState<boolean | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [result, setResult] = useState('')
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [locale, setLocale] = useState(defaultLocale)
  
  const recognizerRef = useRef<SpeechRecognizer | null>(null)
  const startInProgressRef = useRef(false)

  useEffect(() => {
    return () => {
      recognizerRef.current?.cancel().catch(() => {})
    }
  }, [])

  const checkAvailable = useCallback(async () => {
    try {
      const r = new SpeechRecognizer()
      recognizerRef.current = r
      const ok = await r.isAvailable()
      setAvailable(ok)
      setError(null)
      if (!ok) setError('Speech recognition not available or not authorized.')
    } catch (e) {
      setAvailable(false)
      setError(String(e))
    }
  }, [])

  const startListening = useCallback(async () => {
    if (available !== true) return
    if (startInProgressRef.current) return
    startInProgressRef.current = true
    setError(null)
    setResult('')
    setIsListening(true)
    const r = new SpeechRecognizer()
    recognizerRef.current = r
    const callbacks: SpeechCallbacks = {
      onStart: () => setResult('Listening…'),
      onResult: (value: string[]) => setResult(value?.[0] ?? ''),
      onError: (e: SpeechErrorResult) => {
        setError(`${e.code}: ${e.message}`)
        setIsListening(false)
      },
      onEnd: () => {
        setIsListening(false)
        setVolume(0)
      },
      onVolumeChanged: (v: number) => setVolume(v),
    }
    const opts: SpeechRecognitionOptions | undefined = contextualStrings?.length
      ? { contextualStrings }
      : undefined
    try {
      await r.startListening(locale, callbacks, opts)
    } catch (e) {
      setError(String(e))
      setIsListening(false)
    } finally {
      startInProgressRef.current = false
    }
  }, [available, locale, contextualStrings])

  const stopListening = useCallback(async () => {
    const r = recognizerRef.current
    if (!r) return
    try {
      await r.stop()
    } catch {
      // ignore
    }
    setIsListening(false)
    setVolume(0)
  }, [])

  const cancelListening = useCallback(async () => {
    const r = recognizerRef.current
    if (!r) return
    try {
      await r.cancel()
    } catch {
      // ignore
    }
    setIsListening(false)
    setVolume(0)
  }, [])

  return {
    available,
    isListening,
    result,
    volume,
    locale,
    setLocale,
    error,
    checkAvailable,
    startListening,
    stopListening,
    cancelListening,
  }
}
