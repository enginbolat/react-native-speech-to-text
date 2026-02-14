package com.margelo.nitro.speechtotext

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactContext
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.margelo.nitro.speechtotext.HybridSpeechRecognizerSpec
import com.margelo.nitro.speechtotext.SpeechCallbacks
import com.margelo.nitro.speechtotext.SpeechErrorResult
import com.margelo.nitro.speechtotext.SpeechRecognitionOptions
import com.margelo.nitro.speechtotext.TranscriptionCallbacks
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

class SpeechRecognizerImpl : HybridSpeechRecognizerSpec() {
  private var engine: SpeechRecognitionEngine? = null

  override fun isAvailable(): Promise<Boolean> {
    val context = NitroModules.applicationContext ?: return Promise.resolved(false)
    val isAvailable = android.speech.SpeechRecognizer.isRecognitionAvailable(context)
    return Promise.resolved(isAvailable)
  }

  override fun startListening(
    locale: String,
    callbacks: SpeechCallbacks?,
    options: SpeechRecognitionOptions?
  ): Promise<Unit> {
    return Promise.async {
      suspendCoroutine { continuation ->
        runOnMainThread {
          val context = NitroModules.applicationContext
          if (context == null) {
            continuation.resumeWithException(Error("Context is null"))
            return@runOnMainThread
          }

          // Permission check
          if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
             val activity = (context as? ReactContext)?.currentActivity
             if (activity != null) {
               ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.RECORD_AUDIO), 101)
               // We reject so the JS logic can handle the UI state (e.g. show a button to open settings or ask again)
               continuation.resumeWithException(Error("Permission missing. Please request RECORD_AUDIO permission from JavaScript."))
             } else {
               continuation.resumeWithException(Error("Permission denied and no Activity found to request it."))
             }
             return@runOnMainThread
          }

          val newEngine = SpeechRecognitionEngine(context)
          this.engine = newEngine
          
          newEngine.onReady = {
             try {
               continuation.resume(Unit)
             } catch (e: Exception) { }
          }
          newEngine.onStartError = {
             try {
               continuation.resumeWithException(it)
             } catch (e: Exception) { }
          }
          
          newEngine.startListening(locale, callbacks, options) {
            this.engine = null
          }
        }
      }
    }
  }

  override fun startTranscription(
    filePath: String,
    locale: String,
    callbacks: TranscriptionCallbacks?,
    options: SpeechRecognitionOptions?
  ): Promise<Unit> {
    return Promise.async {
      suspendCoroutine { continuation ->
        continuation.resumeWithException(Error("File transcription is not supported on Android."))
      }
    }
  }

  override fun stop(): Promise<Unit> {
    return Promise.async {
      suspendCoroutine { continuation ->
        runOnMainThread {
          engine?.finish()
           try {
             continuation.resume(Unit)
           } catch (e: Exception) { }
        }
      }
    }
  }

  override fun cancel(): Promise<Unit> {
    return Promise.async {
      suspendCoroutine { continuation ->
        runOnMainThread {
          engine?.cancel()
           try {
             continuation.resume(Unit)
           } catch (e: Exception) { }
        }
      }
    }
  }

  private fun runOnMainThread(action: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      action()
    } else {
      Handler(Looper.getMainLooper()).post(action)
    }
  }
}
