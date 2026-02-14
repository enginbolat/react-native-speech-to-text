const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins')

const withSpeechToText = (config, props = {}) => {
  const {
    microphonePermission = 'This app needs access to your microphone for speech recognition.',
    speechRecognitionPermission = 'This app needs access to speech recognition to convert your speech to text.',
  } = props

  // iOS: Add privacy descriptions
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMicrophoneUsageDescription =
      cfg.modResults.NSMicrophoneUsageDescription ?? microphonePermission
    cfg.modResults.NSSpeechRecognitionUsageDescription =
      cfg.modResults.NSSpeechRecognitionUsageDescription ??
      speechRecognitionPermission
    return cfg
  })

  // Android: Add RECORD_AUDIO permission
  config = withAndroidManifest(config, (cfg) => {
    const androidManifest = cfg.modResults.manifest
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = []
    }
    if (
      !androidManifest['uses-permission'].find(
        (perm) => perm.$['android:name'] === 'android.permission.RECORD_AUDIO'
      )
    ) {
      androidManifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.RECORD_AUDIO' },
      })
    }
    return cfg
  })

  return config
}

module.exports = withSpeechToText
