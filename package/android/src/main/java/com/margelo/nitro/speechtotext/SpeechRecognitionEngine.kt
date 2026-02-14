package com.margelo.nitro.speechtotext

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.margelo.nitro.speechtotext.SpeechCallbacks
import com.margelo.nitro.speechtotext.SpeechErrorResult
import com.margelo.nitro.speechtotext.SpeechRecognitionOptions
import java.util.Locale

class SpeechRecognitionEngine(private val context: Context) {
  private var speechRecognizer: SpeechRecognizer? = null
  private var isTearingDown = false
  private var onTeardown: (() -> Unit)? = null
  
  var onReady: (() -> Unit)? = null
  var onStartError: ((Throwable) -> Unit)? = null

  fun startTranscription(
    filePath: String,
    localeStr: String,
    callbacks: TranscriptionCallbacks?,
    options: SpeechRecognitionOptions?,
    onTeardownComplete: () -> Unit
  ) {
    teardown()
    onTeardown = onTeardownComplete

    if (!SpeechRecognizer.isRecognitionAvailable(context)) {
      onStartError?.invoke(Error("Speech recognition is not available on this device"))
      teardown()
      return
    }

    try {
      speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
      speechRecognizer?.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {
          callbacks?.onStart?.invoke()
        }
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}

        override fun onError(error: Int) {
          val errorInfo = getErrorText(error)
          val parts = errorInfo.split("|")
          val code = parts[0]
          val message = parts.getOrElse(1) { "Unknown error" }

          callbacks?.onError?.invoke(SpeechErrorResult(code, message))
          teardown()
        }

        override fun onResults(results: Bundle?) {
          val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val transcript = matches?.getOrNull(0) ?: ""
          // Convert to segments (dummy segments for Android as it doesn't provide them easily)
          val segments = if (transcript.isNotEmpty()) {
            arrayOf(TranscriptionSegment(transcript, 0.0, 0.0))
          } else {
            emptyArray()
          }
          
          callbacks?.onResult?.invoke(segments, transcript, true)
          callbacks?.onEnd?.invoke()
          teardown()
        }

        override fun onPartialResults(partialResults: Bundle?) {
          val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val transcript = matches?.getOrNull(0) ?: ""
          if (transcript.isNotEmpty()) {
            val segments = arrayOf(TranscriptionSegment(transcript, 0.0, 0.0))
            callbacks?.onResult?.invoke(segments, transcript, false)
          }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
      })

      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
      intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      
      if (localeStr.isNotEmpty()) {
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeStr)
      }

      // Android 13+ support for file transcription
      if (android.os.Build.VERSION.SDK_INT >= 33) {
        try {
          val file = java.io.File(filePath)
          if (file.exists()) {
             val pfd = android.os.ParcelFileDescriptor.open(file, android.os.ParcelFileDescriptor.MODE_READ_ONLY)
             // EXTRA_AUDIO_SOURCE is "android.speech.extra.AUDIO_SOURCE"
             intent.putExtra("android.speech.extra.AUDIO_SOURCE", pfd)
          }
        } catch (e: Exception) {
          Log.e("SpeechRecognition", "Failed to set audio source PFD", e)
        }
      }

      speechRecognizer?.startListening(intent)
      onReady?.invoke()

    } catch (e: Exception) {
      onStartError?.invoke(e)
      teardown()
    }
  }

  fun startListening(
    localeStr: String,
    callbacks: SpeechCallbacks?,
    options: SpeechRecognitionOptions?,
    onTeardownComplete: () -> Unit
  ) {
    teardown()
    onTeardown = onTeardownComplete
    
    if (!SpeechRecognizer.isRecognitionAvailable(context)) {
      onStartError?.invoke(Error("Speech recognition is not available on this device"))
      teardown()
      return
    }

    try {
      speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
      speechRecognizer?.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}

        override fun onBeginningOfSpeech() {
           callbacks?.onStart?.invoke()
        }

        override fun onRmsChanged(rmsdB: Float) {
          callbacks?.onVolumeChanged?.invoke(rmsdB.toDouble())
        }

        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {}

        override fun onError(error: Int) {
          val errorInfo = getErrorText(error)
          val parts = errorInfo.split("|")
          val code = parts[0]
          val message = parts.getOrElse(1) { "Unknown error" }

          callbacks?.onError?.invoke(SpeechErrorResult(code, message))
          teardown()
        }

        override fun onResults(results: Bundle?) {
          val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          if (matches != null && matches.isNotEmpty()) {
             callbacks?.onResult?.invoke(matches.toTypedArray())
          }
          callbacks?.onEnd?.invoke()
          teardown()
        }

        override fun onPartialResults(partialResults: Bundle?) {
           val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
           if (matches != null && matches.isNotEmpty()) {
             callbacks?.onPartialResult?.invoke(matches.toTypedArray())
           }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
      })

      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
      intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
      intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
      
      if (localeStr.isNotEmpty()) {
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeStr)
      } else {
         intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toString())
      }
      
      speechRecognizer?.startListening(intent)
      onReady?.invoke()

    } catch (e: Exception) {
      onStartError?.invoke(e)
      teardown()
    }
  }

  fun finish() {
    speechRecognizer?.stopListening()
  }

  fun cancel() {
    speechRecognizer?.cancel()
    teardown()
  }

  private fun teardown() {
    if (isTearingDown) return
    isTearingDown = true
    speechRecognizer?.destroy()
    speechRecognizer = null
    onTeardown?.invoke()
    onTeardown = null
    isTearingDown = false
  }

  private fun getErrorText(errorCode: Int): String {
    val (code, message) = when (errorCode) {
      SpeechRecognizer.ERROR_AUDIO -> Pair("audio", "Audio recording error")
      SpeechRecognizer.ERROR_CLIENT -> Pair("client", "Client side error")
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> Pair("permissions", "Insufficient permissions")
      SpeechRecognizer.ERROR_NETWORK -> Pair("network", "Network error")
      SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> Pair("network", "Network timeout")
      SpeechRecognizer.ERROR_NO_MATCH -> Pair("no_match", "No match")
      SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> Pair("busy", "Recognizer busy")
      SpeechRecognizer.ERROR_SERVER -> Pair("server", "Error from server")
      SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> Pair("speech_timeout", "No speech input")
      else -> Pair("recognition_fail", "Unknown error ($errorCode)")
    }
    return "$code|$message"
  }
}
