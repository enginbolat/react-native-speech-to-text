//
//  SpeechRecognitionConstants.swift
//  NitroSpeechToText
//

import AVFoundation
import Foundation

enum SpeechRecognitionConstants {
  static let bufferSize: AVAudioFrameCount = 1024
  static let levelLowpassFactor: Float = 0.5
  static let minDecibels: Float = -80
}
