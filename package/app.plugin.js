const { withInfoPlist } = require('@expo/config-plugins')

const withSpeechToText = (config, props = {}) => {
  const {
    microphonePermission = 'This app needs access to your microphone for speech recognition.',
    speechRecognitionPermission = 'This app needs access to speech recognition to convert your speech to text.',
  } = props

  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMicrophoneUsageDescription =
      cfg.modResults.NSMicrophoneUsageDescription ?? microphonePermission
    cfg.modResults.NSSpeechRecognitionUsageDescription =
      cfg.modResults.NSSpeechRecognitionUsageDescription ?? speechRecognitionPermission
    return cfg
  })
}

module.exports = withSpeechToText
