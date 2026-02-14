import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  SpeechRecognizer,
  type SpeechCallbacks,
  type SpeechErrorResult,
} from '../api'
import type { PermissionStatus } from '../specs/SpeechRecognizer.nitro'
import type {
  UseSpeechRecognizerOptions,
  UseSpeechRecognizerReturn,
  SpeechRecognitionOptions,
} from '../types'

/**
 * A professional hook for handling real-time speech recognition.
 * Manages native instance lifecycle, state, and permissions.
 */
export function useSpeechRecognizer(
  options: UseSpeechRecognizerOptions = {}
): UseSpeechRecognizerReturn {
  const { locale: defaultLocale = 'en-US', contextualStrings } = options

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [result, setResult] = useState('')
  const [volume, setVolume] = useState(0)
  const [error, setError] = useState<SpeechErrorResult | null>(null)

  const recognizerRef = useRef<SpeechRecognizer | null>(null)

  // Initialize recognizer lazily
  const getRecognizer = useCallback(() => {
    if (!recognizerRef.current) {
      recognizerRef.current = new SpeechRecognizer()
    }
    return recognizerRef.current as SpeechRecognizer
  }, [])

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const recognizer = getRecognizer()
        const available = await recognizer.isAvailable()
        setIsAvailable(available)
      } catch (e) {
        setIsAvailable(false)
      }
    }
    checkStatus()

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.cancel().catch(() => {})
      }
    }
  }, [getRecognizer])

  const requestPermission = useCallback(async () => {
    try {
      const recognizer = getRecognizer()
      const status = await recognizer.requestPermission()
      setPermissionStatus(status)
      return status
    } catch (e) {
      setPermissionStatus('denied')
      return 'denied' as PermissionStatus
    }
  }, [getRecognizer])

  const start = useCallback(
    async (overrideOptions?: SpeechRecognitionOptions) => {
      const recognizer = getRecognizer()

      // Reset state for new session
      setResult('')
      setError(null)
      setIsListening(true)

      const callbacks: SpeechCallbacks = {
        onStart: () => {
          // Notified when recognition actually begins
        },
        onResult: (results) => {
          setResult(results?.[0] ?? '')
        },
        onError: (err) => {
          setError(err)
          setIsListening(false)
          setVolume(0)
        },
        onEnd: () => {
          setIsListening(false)
          setVolume(0)
        },
        onVolumeChanged: (v) => {
          setVolume(v)
        },
      }

      const mergedOptions: SpeechRecognitionOptions = {
        contextualStrings,
        ...overrideOptions,
      }

      try {
        await recognizer.startListening(defaultLocale, callbacks, mergedOptions)
      } catch (e) {
        setError({
          code: 'start_failed',
          message: e instanceof Error ? e.message : String(e),
        })
        setIsListening(false)
      }
    },
    [getRecognizer, defaultLocale, contextualStrings]
  )

  const stop = useCallback(async () => {
    const recognizer = getRecognizer()
    await recognizer.stop().catch(() => {})
    setIsListening(false)
    setVolume(0)
  }, [getRecognizer])

  const cancel = useCallback(async () => {
    const recognizer = getRecognizer()
    await recognizer.cancel().catch(() => {})
    setIsListening(false)
    setVolume(0)
  }, [getRecognizer])

  const reset = useCallback(() => {
    setResult('')
    setError(null)
    setVolume(0)
  }, [])

  return useMemo(
    () => ({
      isAvailable,
      permissionStatus,
      isListening,
      result,
      volume,
      error,
      requestPermission,
      start,
      stop,
      cancel,
      reset,
    }),
    [
      isAvailable,
      permissionStatus,
      isListening,
      result,
      volume,
      error,
      requestPermission,
      start,
      stop,
      cancel,
      reset,
    ]
  )
}
