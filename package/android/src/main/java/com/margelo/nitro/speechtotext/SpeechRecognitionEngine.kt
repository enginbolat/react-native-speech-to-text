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
        override fun onReadyForSpeech(params: Bundle?) {
           // We resolve the start promise when this is called or immediately after startListening?
           // iOS does it when audio engine starts.
           // Here we can consider it "started".
        }

        override fun onBeginningOfSpeech() {
           callbacks?.onStart?.invoke()
        }

        override fun onRmsChanged(rmsdB: Float) {
          callbacks?.onVolumeChanged?.invoke(rmsdB.toDouble())
        }

        override fun onBufferReceived(buffer: ByteArray?) {
          // Android doesn't give easier access to raw audio buffer for accumulation usually
        }

        override fun onEndOfSpeech() {
          // Wait for results
        }

        override fun onError(error: Int) {
          val errorInfo = getErrorText(error)
          val parts = errorInfo.split("|")
          val code = parts[0]
          val message = parts.getOrElse(1) { "Unknown error" }

          callbacks?.onError?.invoke(SpeechErrorResult(code, message))
          // If critical error, teardown. If no match, maybe just notify? 
          // Usually error stops recognition.
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
      // Options? Android doesn't support contextualStrings standardly like iOS 17
      
      speechRecognizer?.startListening(intent)
      onReady?.invoke() // Assuming it starts successfully

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
