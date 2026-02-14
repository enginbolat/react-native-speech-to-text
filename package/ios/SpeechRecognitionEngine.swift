//
//  SpeechRecognitionEngine.swift
//  NitroSpeechToText
//
//  Runs SFSpeechRecognizer sessions: live microphone or file transcription.
//

import AVFoundation
import Speech

final class SpeechRecognitionEngine {
  private var speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var urlRequest: SFSpeechURLRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var audioEngine: AVAudioEngine?
  private var sessionId: String?
  private var isTearingDown = false
  private var cancelledByUser = false

  private let audioSessionManager = AudioSessionManager()
  private var levelMeter = AudioLevelMeter()

  var onReady: (() -> Void)?
  var onStartError: ((Error) -> Void)?
  private var onTeardown: (() -> Void)?
  private var didSettlePromise = false

  // MARK: - Teardown

  func teardown() {
    // Ensure we run on main thread for all property cleanup and callback safety
    if !Thread.isMainThread {
      DispatchQueue.main.async { [weak self] in
        self?.teardown()
      }
      return
    }

    if !didSettlePromise {
      didSettlePromise = true
      if cancelledByUser {
        onReady?()
      } else if let onStartError = onStartError {
        onStartError(NSError(domain: "SpeechRecognition", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cancelled or torn down before ready"]))
      }
    }
    isTearingDown = true
    didSettlePromise = true
    recognitionTask?.cancel()
    recognitionTask = nil
    // Only stop recording if we were using the microphone
    if recognitionRequest != nil {
      audioSessionManager.restore()
    }
    recognitionRequest?.endAudio()
    if let node = audioEngine?.inputNode {
      node.removeTap(onBus: 0)
      node.reset()
    }
    if audioEngine?.isRunning == true {
      audioEngine?.stop()
      audioEngine?.reset()
    }
    audioEngine = nil
    recognitionRequest = nil
    urlRequest = nil
    let completedTeardown = onTeardown
    sessionId = nil
    onTeardown = nil
    completedTeardown?()
  }

  func finish() {
    DispatchQueue.main.async { [weak self] in
      self?.recognitionTask?.finish()
    }
  }

  func cancel() {
    DispatchQueue.main.async { [weak self] in
      self?.cancelledByUser = true
      self?.recognitionTask?.cancel()
      self?.teardown()
    }
  }

  // MARK: - Live listening (microphone)

  func startListening(
    locale: String,
    callbacks: SpeechCallbacks?,
    options: SpeechRecognitionOptions?,
    onTeardownComplete: @escaping () -> Void
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.didSettlePromise = true
      self.teardown()
      self.onTeardown = onTeardownComplete
      self.didSettlePromise = false
      self.isTearingDown = false
      self.cancelledByUser = false
      self.sessionId = UUID().uuidString

      guard self.audioSessionManager.captureAndConfigure() else {
        self.didSettlePromise = true
        let err = NSError(domain: "SpeechRecognition", code: -1, userInfo: [NSLocalizedDescriptionKey: "Audio session configuration failed"])
        self.onStartError?(err)
        self.notifyError(callbacks?.onError, code: "audio", message: "")
        self.teardown()
        return
      }

      // Short delay so simulator audio session can finish reconfig (avoids "Abandoning I/O cycle because reconfig pending" hang)
      let currentSessionId = self.sessionId
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
        guard let self, self.sessionId == currentSessionId, !self.isTearingDown else {
          self?.didSettlePromise = true
          self?.onStartError?(NSError(domain: "SpeechRecognition", code: -1, userInfo: [NSLocalizedDescriptionKey: "Cancelled or session invalid"]))
          return
        }

        self.speechRecognizer = self.makeRecognizer(locale: locale)
        self.recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        self.recognitionRequest?.shouldReportPartialResults = true
        self.applyOptions(from: options, to: self.recognitionRequest)

        guard let request = self.recognitionRequest else {
          self.didSettlePromise = true
          let err = NSError(domain: "SpeechRecognition", code: -1, userInfo: [NSLocalizedDescriptionKey: "Recognition request init failed"])
          self.onStartError?(err)
          self.notifyError(callbacks?.onError, code: "recognition_init", message: "")
          self.teardown()
          return
        }

        self.audioEngine = AVAudioEngine()
        guard let inputNode = self.audioEngine?.inputNode else {
          self.didSettlePromise = true
          let err = NSError(domain: "SpeechRecognition", code: -1, userInfo: [NSLocalizedDescriptionKey: "Audio input node unavailable"])
          self.onStartError?(err)
          self.notifyError(callbacks?.onError, code: "input", message: "")
          self.teardown()
          return
        }

        callbacks?.onStart?()

        let taskId = self.sessionId!
        self.recognitionTask = self.speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
          guard let self else { return }
          if taskId != self.sessionId { self.teardown(); return }
          self.handleSpeechResult(result: result, error: error, callbacks: callbacks)
        }

        self.installTapAndStartEngine(inputNode: inputNode, callbacks: callbacks)
      }
    }
  }

  // MARK: - File transcription

  func startTranscription(
    filePath: String,
    locale: String,
    callbacks: TranscriptionCallbacks?,
    options: SpeechRecognitionOptions?,
    onTeardownComplete: @escaping () -> Void
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.didSettlePromise = true
      self.teardown()
      self.onTeardown = onTeardownComplete
      self.didSettlePromise = false
      self.isTearingDown = false
      self.cancelledByUser = false
      self.sessionId = UUID().uuidString

      self.speechRecognizer = self.makeRecognizer(locale: locale)
      let url = URL(fileURLWithPath: filePath)
      self.urlRequest = SFSpeechURLRecognitionRequest(url: url)
      self.applyOptions(from: options, to: self.urlRequest)

      guard let request = self.urlRequest else {
        self.didSettlePromise = true
        self.notifyError(callbacks?.onError, code: "recognition_url_init", message: "Failed to create URL request")
        self.teardown()
        return
      }

      callbacks?.onStart?()
      self.didSettlePromise = true
      self.onReady?()

      let taskId = self.sessionId!
      self.recognitionTask = self.speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
        guard let self else { return }
        if taskId != self.sessionId { self.teardown(); return }
        self.handleTranscriptionResult(result: result, error: error, callbacks: callbacks)
      }
    }
  }

  // MARK: - Helpers (apply recognition options)

  private func applyOptions(from options: SpeechRecognitionOptions?, to request: SFSpeechRecognitionRequest?) {
    guard let options = options, let request = request else { return }

    if #available(iOS 17.0, *) {
      if let strings = options.contextualStrings, !strings.isEmpty {
        request.contextualStrings = strings
      }
    }

    if let onDevice = options.requiresOnDeviceRecognition {
      request.requiresOnDeviceRecognition = onDevice
    }

    if let hint = options.taskHint {
      switch hint {
      case .dictation:
        request.taskHint = SFSpeechRecognitionTaskHint.dictation
      case .search:
        request.taskHint = SFSpeechRecognitionTaskHint.search
      case .confirmation:
        request.taskHint = SFSpeechRecognitionTaskHint.confirmation
      default:
        request.taskHint = SFSpeechRecognitionTaskHint.unspecified
      }
    }

    if #available(iOS 16.0, *) {
      if let punctuation = options.addsPunctuation {
        request.addsPunctuation = punctuation
      }
    }
  }

  private func makeRecognizer(locale: String) -> SFSpeechRecognizer? {
    if locale.isEmpty {
      return SFSpeechRecognizer()
    }
    return SFSpeechRecognizer(locale: Locale(identifier: locale))
  }

  private func handleSpeechResult(
    result: SFSpeechRecognitionResult?,
    error: Error?,
    callbacks: SpeechCallbacks?
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if let error = error {
        self.reportErrorAndTeardown(error: error, notify: callbacks?.onError)
        return
      }
      guard let result = result else {
        self.reportEndAndTeardown(callbacks?.onEnd)
        return
      }
      let transcriptions = result.transcriptions.map(\.formattedString)
      callbacks?.onResult?([result.bestTranscription.formattedString])
      callbacks?.onPartialResult?(transcriptions)
      if result.isFinal || self.recognitionTask?.state == .canceling || self.recognitionTask?.state == .finishing {
        self.reportEndAndTeardown(callbacks?.onEnd)
      }
    }
  }

  private func handleTranscriptionResult(
    result: SFSpeechRecognitionResult?,
    error: Error?,
    callbacks: TranscriptionCallbacks?
  ) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if let error = error {
        self.reportErrorAndTeardown(error: error, notify: callbacks?.onError)
        return
      }
      guard let result = result else {
        self.reportEndAndTeardown(callbacks?.onEnd)
        return
      }
      if result.isFinal {
        let segments = result.bestTranscription.segments.map { seg in
          TranscriptionSegment(transcription: seg.substring, timestamp: seg.timestamp, duration: seg.duration)
        }
        callbacks?.onResult?(segments, result.bestTranscription.formattedString, true)
      }
      if result.isFinal || self.recognitionTask?.state == .canceling || self.recognitionTask?.state == .finishing {
        self.reportEndAndTeardown(callbacks?.onEnd)
      }
    }
  }

  private func reportErrorAndTeardown(error: Error, notify: ((SpeechErrorResult) -> Void)?) {
    let nsError = error as NSError
    notify?(SpeechErrorResult(code: "recognition_fail", message: "\(nsError.code)/\(error.localizedDescription)"))
    teardown()
  }

  private func reportEndAndTeardown(_ onEnd: (() -> Void)?) {
    onEnd?()
    teardown()
  }

  private func installTapAndStartEngine(inputNode: AVAudioInputNode, callbacks: SpeechCallbacks?) {
    let format = inputNode.outputFormat(forBus: 0)
    let mixer = AVAudioMixerNode()
    audioEngine?.attach(mixer)
    mixer.installTap(onBus: 0, bufferSize: SpeechRecognitionConstants.bufferSize, format: format) { [weak self] buffer, _ in
      guard let self, !self.isTearingDown else { return }
      let level = self.levelMeter.process(buffer: buffer)
      DispatchQueue.main.async {
        callbacks?.onVolumeChanged?(level)
      }
      self.recognitionRequest?.append(buffer)
    }
    audioEngine?.connect(inputNode, to: mixer, format: format)
    audioEngine?.prepare()
    do {
      try audioEngine?.start()
      DispatchQueue.main.async { [weak self] in
        self?.didSettlePromise = true
        self?.onReady?()
      }
    } catch {
      DispatchQueue.main.async { [weak self] in
        self?.didSettlePromise = true
        self?.onStartError?(error)
        self?.notifyError(callbacks?.onError, code: "audio", message: error.localizedDescription)
        self?.teardown()
      }
    }
  }

  private func notifyError(_ onError: ((SpeechErrorResult) -> Void)?, code: String, message: String) {
    DispatchQueue.main.async {
      onError?(SpeechErrorResult(code: code, message: message))
    }
  }
}
