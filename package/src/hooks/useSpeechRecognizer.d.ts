import type { UseSpeechRecognizerOptions, UseSpeechRecognizerReturn } from '../types'

/**
 * Hook for real-time speech recognition with built-in state and permission handling.
 */
export function useSpeechRecognizer(
  options?: UseSpeechRecognizerOptions
): UseSpeechRecognizerReturn 
