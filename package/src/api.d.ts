import type {
  SpeechCallbacks,
  SpeechErrorResult,
  SpeechRecognitionOptions,
  PermissionStatus,
  TranscriptionCallbacks,
  TranscriptionSegment,
  TaskHint,
} from './specs/SpeechRecognizer.nitro'

/**
 * Options for the useSpeechRecognizer hook.
 */
export interface UseSpeechRecognizerOptions {
  /**
   * The default locale to use for recognition (e.g., 'en-US', 'tr-TR').
   */
  locale?: string
  /**
   * List of contextual strings to help the recognition engine (iOS only).
   */
  contextualStrings?: string[]
}

/**
 * The return value of the useSpeechRecognizer hook.
 */
export interface UseSpeechRecognizerReturn {
  /**
   * Whether the speech recognition service is available on this device.
   * `null` while checking.
   */
  isAvailable: boolean | null
  /**
   * Current permission status for microphone and speech recognition.
   * `null` until `requestPermission` is called or status is otherwise determined.
   */
  permissionStatus: PermissionStatus | null
  /**
   * Whether the recognizer is currently listening.
   */
  isListening: boolean
  /**
   * The transcription result (best match).
   */
  result: string
  /**
   * Current audio volume level (normalized, usually 0.0 to 1.0).
   */
  volume: number
  /**
   * Most recent error, if any.
   */
  error: SpeechErrorResult | null

  /**
   * Request microphone and speech recognition permissions.
   */
  requestPermission: () => Promise<PermissionStatus>
  /**
   * Start the listening session.
   * @param options Optional overrides for this specific session.
   */
  start: (options?: SpeechRecognitionOptions) => Promise<void>
  /**
   * Stop the current session and process remaining audio.
   */
  stop: () => Promise<void>
  /**
   * Cancel the current session immediately and discard results.
   */
  cancel: () => Promise<void>
  /**
   * Resets the result, volume, and error states.
   */
  reset: () => void
}

/**
 * The main SpeechRecognizer instance.
 * Best used via the `useSpeechRecognizer` hook.
 */
export interface SpeechRecognizer {
  /** Is the service available? */
  isAvailable(): Promise<boolean>
  /** Request microphone permissions. */
  requestPermission(): Promise<PermissionStatus>
  /** Start live listening. */
  startListening(
    locale: String,
    callbacks: SpeechCallbacks,
    options?: SpeechRecognitionOptions
  ): Promise<void>
  /** Transcribe a file. (iOS only recommended) */
  startTranscription(
    filePath: String,
    locale: String,
    callbacks: TranscriptionCallbacks,
    options?: SpeechRecognitionOptions
  ): Promise<void>
  /** Stop listening. */
  stop(): Promise<void>
  /** Cancel listening. */
  cancel(): Promise<void>
}

export type {
  PermissionStatus,
  SpeechCallbacks,
  SpeechErrorResult,
  SpeechRecognitionOptions,
  TaskHint,
  TranscriptionCallbacks,
  TranscriptionSegment,
}
