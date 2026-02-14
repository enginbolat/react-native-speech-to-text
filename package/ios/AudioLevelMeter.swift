//
//  AudioLevelMeter.swift
//  NitroSpeechToText
//
//  Volume level from PCM buffer; lowpass smoothing and normalized 0–1 output.
//

import AVFoundation

struct AudioLevelMeter {
  private var smoothedDecibelsChannel0: Float = 0
  private var smoothedDecibelsChannel1: Float = 0

  mutating func process(buffer: AVAudioPCMBuffer) -> Double {
    let frameCount = Int(buffer.frameLength)
    if buffer.format.channelCount > 0, let channel0 = buffer.floatChannelData?[0] {
      let maxMag = maxMagnitude(samples: channel0, count: frameCount)
      let db = maxMag == 0 ? SpeechRecognitionConstants.minDecibels : 20 * log10f(maxMag)
      smoothedDecibelsChannel0 = SpeechRecognitionConstants.levelLowpassFactor * db
        + (1 - SpeechRecognitionConstants.levelLowpassFactor) * smoothedDecibelsChannel0
      smoothedDecibelsChannel1 = smoothedDecibelsChannel0
    }
    if buffer.format.channelCount > 1, let channel1 = buffer.floatChannelData?[1] {
      let maxMag = maxMagnitude(samples: channel1, count: frameCount)
      let db = maxMag == 0 ? SpeechRecognitionConstants.minDecibels : 20 * log10f(maxMag)
      smoothedDecibelsChannel1 = SpeechRecognitionConstants.levelLowpassFactor * db
        + (1 - SpeechRecognitionConstants.levelLowpassFactor) * smoothedDecibelsChannel1
    }
    let normalized = normalizedPower(decibels: CGFloat(smoothedDecibelsChannel1))
    return Double(normalized * 10)
  }

  private func maxMagnitude(samples: UnsafeMutablePointer<Float>, count: Int) -> Float {
    var maxMag: Float = 0
    for i in 0..<count {
      let mag = abs(samples[i])
      if mag > maxMag { maxMag = mag }
    }
    return maxMag
  }

  private func normalizedPower(decibels: CGFloat) -> CGFloat {
    if decibels < CGFloat(SpeechRecognitionConstants.minDecibels) || decibels == 0 { return 0 }
    let minDb = Double(SpeechRecognitionConstants.minDecibels)
    let p = pow(
      (pow(10, 0.05 * Double(decibels)) - pow(10, 0.05 * minDb)) * (1 / (1 - pow(10, 0.05 * minDb))),
      0.5
    )
    return min(CGFloat(p), 1)
  }
}
