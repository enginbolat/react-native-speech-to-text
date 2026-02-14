import type { HybridObject } from 'react-native-nitro-modules'

/**
 * Status of speech recognition and microphone permissions.
 */
export type PermissionStatus =
  | 'denied'
  | 'granted'
  | 'restricted'
  | 'undetermined'

/**
 * Known error codes for speech recognition.
 */
export type SpeechErrorCode =
  | 'audio'
  | 'permissions'
  | 'network'
  | 'no_match'
  | 'busy'
  | 'server'
  | 'speech_timeout'
  | 'unsupported'
  | 'recognition_fail'
  | string

/**
 * Error payload sent to onError callbacks.
 */
export interface SpeechErrorResult {
  code: SpeechErrorCode
  message: string
}

/**
 * Callbacks for live speech recognition (microphone).
 */
export interface SpeechCallbacks {
  onStart?: () => void
  onResult?: (value: string[]) => void
  onPartialResult?: (value: string[]) => void
  onError?: (error: SpeechErrorResult) => void
  onEnd?: () => void
  onVolumeChanged?: (value: number) => void
}

/**
 * Single segment in a transcription result.
 */
export interface TranscriptionSegment {
  transcription: string
  timestamp: number
  duration: number
}

/**
 * Hint for the type of speech recognition task, maps to SFSpeechRecognitionTaskHint (iOS)
 * or RecognizerIntent.EXTRA_LANGUAGE_MODEL (Android).
 */
export type TaskHint = 'unspecified' | 'dictation' | 'search' | 'confirmation'

/**
 * Configuration options for speech recognition.
 */
export interface SpeechRecognitionOptions {
  /** Phrases/words to prioritize during recognition (iOS 17+). Not supported on Android. */
  contextualStrings?: string[]
  /** Force on-device recognition (iOS 13+). Fails if no on-device model is available. */
  requiresOnDeviceRecognition?: boolean
  /** Hint for the type of speech recognition task. */
  taskHint?: TaskHint
  /** Automatically add punctuation to recognition results (iOS 16+). */
  addsPunctuation?: boolean
}

/**
 * Callbacks for file transcription.
 */
export interface TranscriptionCallbacks {
  onStart?: () => void
  onResult?: (
    segments: TranscriptionSegment[],
    transcription: string,
    isFinal: boolean
  ) => void
  onError?: (error: SpeechErrorResult) => void
  onEnd?: () => void
}

/**
 * Speech recognizer for iOS (SFSpeechRecognizer) and Android (SpeechRecognizer).
 * One instance = one recognition session; create a new instance for each session.
 */
export interface SpeechRecognizer extends HybridObject<{
  ios: 'swift'
  android: 'kotlin'
}> {
  /**
   * Requests both microphone and speech recognition permissions.
   */
  requestPermission(): Promise<PermissionStatus>

  /**
   * Checks if speech recognition is available on the current device.
   */
  isAvailable(): Promise<boolean>

  /**
   * Starts listening from the microphone. Resolves when recognition has started;
   * use callbacks for results, partial results, and errors.
   */
  startListening(
    locale: string,
    callbacks?: SpeechCallbacks,
    options?: SpeechRecognitionOptions
  ): Promise<void>

  /**
   * Starts transcribing an audio file.
   * ⚠️ Note: Currently only supported on iOS. Android will reject with an 'unsupported' error.
   */
  startTranscription(
    filePath: string,
    locale: string,
    callbacks?: TranscriptionCallbacks,
    options?: SpeechRecognitionOptions
  ): Promise<void>

  /**
   * Stops the current recognition session gracefully.
   */
  stop(): Promise<void>

  /**
   * Cancels the current recognition session.
   */
  cancel(): Promise<void>
}
