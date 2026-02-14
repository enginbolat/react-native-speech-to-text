//
//  AudioSessionManager.swift
//  NitroSpeechToText
//
//  AVAudioSession setup, reset, and headset/bluetooth detection.
//

import AVFoundation

final class AudioSessionManager {
  private var session: AVAudioSession?
  private var priorCategoryRaw: String?

  func captureAndConfigure() -> Bool {
    let session = AVAudioSession.sharedInstance()
    self.session = session
    priorCategoryRaw = session.category.rawValue

    let options: AVAudioSession.CategoryOptions = hasBluetoothHeadset ? .allowBluetoothHFP : .defaultToSpeaker
    do {
      try session.setCategory(.playAndRecord, options: options)
      try session.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      return false
    }
    return true
  }

  func restore() {
    guard let session = session else { return }
    let currentRaw = session.category.rawValue
    if priorCategoryRaw == currentRaw {
      self.session = nil
      return
    }
    let categoryRaw = priorCategoryRaw ?? AVAudioSession.Category.soloAmbient.rawValue
    let category = AVAudioSession.Category(rawValue: categoryRaw)
    let options: AVAudioSession.CategoryOptions = hasBluetoothHeadset ? .allowBluetoothHFP : .defaultToSpeaker
    try? session.setCategory(category, options: options)
    self.session = nil
  }

  private var hasBluetoothHeadset: Bool {
    isHeadsetPluggedIn || isBluetoothHFP
  }

  private var isHeadsetPluggedIn: Bool {
    let route = AVAudioSession.sharedInstance().currentRoute
    return route.outputs.contains { $0.portType == .headphones || $0.portType == .bluetoothA2DP }
  }

  private var isBluetoothHFP: Bool {
    guard let inputs = AVAudioSession.sharedInstance().availableInputs else { return false }
    return inputs.contains { $0.portType == .bluetoothHFP }
  }
}
