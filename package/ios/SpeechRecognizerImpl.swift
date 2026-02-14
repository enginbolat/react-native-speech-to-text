//
//  SpeechRecognizerImpl.swift
//  NitroSpeechToText
//
//  Public Nitro implementation; delegates to SpeechRecognitionEngine.
//

import NitroModules
import Speech

public final class SpeechRecognizerImpl: HybridSpeechRecognizerSpec {
  private var engine: SpeechRecognitionEngine?

  public override init() {}

  public func isAvailable() throws -> Promise<Bool> {
    Promise.async {
      let status = await withCheckedContinuation { (cont: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
        SFSpeechRecognizer.requestAuthorization { cont.resume(returning: $0) }
      }
      return status == .authorized
    }
  }

  public func startListening(
    locale: String,
    callbacks: SpeechCallbacks?,
    options: SpeechRecognitionOptions?
  ) throws -> Promise<Void> {
    runWithAuthorization { [weak self] promise in
      guard let self else {
        promise.reject(withError: RuntimeError.error(withMessage: "Speech recognizer deallocated"))
        return
      }
      self.runWithNewEngine(promise: promise) { eng in
        eng.startListening(locale: locale, callbacks: callbacks, options: options, onTeardownComplete: { self.engine = nil })
      }
    }
  }

  public func startTranscription(
    filePath: String,
    locale: String,
    callbacks: TranscriptionCallbacks?,
    options: SpeechRecognitionOptions?
  ) throws -> Promise<Void> {
    runWithAuthorization { [weak self] promise in
      guard let self else {
        promise.reject(withError: RuntimeError.error(withMessage: "Speech recognizer deallocated"))
        return
      }
      self.runWithNewEngine(promise: promise) { eng in
        eng.startTranscription(filePath: filePath, locale: locale, callbacks: callbacks, options: options, onTeardownComplete: { self.engine = nil })
      }
    }
  }

  public func stop() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async { [weak self] in
      self?.engine?.finish()
      promise.resolve()
    }
    return promise
  }

  public func cancel() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async { [weak self] in
      self?.engine?.cancel()
      promise.resolve()
    }
    return promise
  }

  // MARK: - Private

  private func runWithAuthorization(block: @escaping (Promise<Void>) -> Void) -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async { [weak self] in
      guard let self else {
        promise.resolve()
        return
      }
      guard self.engine == nil else {
        promise.reject(withError: RuntimeError.error(withMessage: "Speech recognition already started"))
        return
      }
      self.requestAuthorization {
        // Run startListening on main so its 0.25s delay and cancel() share the same queue (avoids race).
        DispatchQueue.main.async { block(promise) }
      } onReject: {
        promise.reject(withError: $0)
      }
    }
    return promise
  }

  private func requestAuthorization(onAuthorized: @escaping () -> Void, onReject: @escaping (Error) -> Void) {
    SFSpeechRecognizer.requestAuthorization { status in
      switch status {
      case .authorized:
        onAuthorized()
      case .denied:
        onReject(RuntimeError.error(withMessage: "User denied access to speech recognition"))
      case .restricted:
        onReject(RuntimeError.error(withMessage: "Speech recognition restricted on this device"))
      case .notDetermined:
        onReject(RuntimeError.error(withMessage: "Speech recognition not yet authorized"))
      @unknown default:
        onReject(RuntimeError.error(withMessage: "Unknown authorization status"))
      }
    }
  }

  private func runWithNewEngine(promise: Promise<Void>, block: (SpeechRecognitionEngine) -> Void) {
    let eng = SpeechRecognitionEngine()
    engine = eng
    eng.onReady = { promise.resolve() }
    eng.onStartError = { promise.reject(withError: $0) }
    block(eng)
  }
}
