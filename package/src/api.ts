import { getHybridObjectConstructor } from 'react-native-nitro-modules'
import type { SpeechRecognizer as SpeechRecognizerSpec } from './specs/SpeechRecognizer.nitro'

export type {
  SpeechCallbacks,
  SpeechErrorResult,
  SpeechRecognitionOptions,
  TaskHint,
  TranscriptionCallbacks,
  TranscriptionSegment,
} from './specs/SpeechRecognizer.nitro'

export type SpeechRecognizer = SpeechRecognizerSpec

export const SpeechRecognizer =
  getHybridObjectConstructor<SpeechRecognizerSpec>('SpeechRecognizer')
