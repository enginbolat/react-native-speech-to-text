# @enginnblt/react-native-nitro-speech-to-text

🚀 A high-performance, type-safe Speech-to-Text library for React Native, powered by [Nitro Modules](https://nitro.margelo.com).

## Features

- **Blazing Fast**: Uses Nitro Modules for ultra-low overhead bridge communication.
- **Microphone Recognition**: Real-time speech-to-text from the microphone on both iOS and Android.
- **File Transcription**: Transcribe audio files directly (Local path support). _[Currently iOS only]_
- **Volume Metering**: Real-time audio level callbacks for building voice visualizations.
- **Type-Safe**: Full TypeScript support with auto-generated interfaces.
- **Advanced iOS Options**: Support for `contextualStrings` (iOS 17+), `addsPunctuation`, and `requiresOnDeviceRecognition`.

## Installation

```bash
# Using bun
bun add @enginnblt/react-native-nitro-speech-to-text react-native-nitro-modules

# Using npm
npm install @enginnblt/react-native-nitro-speech-to-text react-native-nitro-modules

# Using yarn
yarn add @enginnblt/react-native-nitro-speech-to-text react-native-nitro-modules
```

### iOS Setup

Add the following keys to your `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to the microphone for speech recognition.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>This app needs access to speech recognition to transcribe your voice.</string>
```

Then run:

```bash
npx pod-install
```

### Android Setup

Add the permission to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## Usage

### 🎨 The Hook Way (Recommended)

The easiest way to use the recognizer is via the `useSpeechRecognizer` hook. It handles state, permissions, and callbacks for you.

```tsx
import { useSpeechRecognizer } from "@enginnblt/react-native-nitro-speech-to-text";

function App() {
  const {
    isAvailable,
    isListening,
    result,
    volume,
    error,
    start,
    stop,
    requestPermission,
  } = useSpeechRecognizer({
    locale: "en-US",
  });

  const handlePress = async () => {
    if (isListening) {
      await stop();
    } else {
      // Always request permission before starting live listening
      const status = await requestPermission();
      if (status === "granted") {
        await start();
      }
    }
  };

  return (
    <View>
      <Text>Transcript: {result}</Text>
      <Button title={isListening ? "Stop" : "Start"} onPress={handlePress} />
    </View>
  );
}
```

### 🛠 The Manual Way

If you need more control, you can use the `SpeechRecognizer` class directly.

```tsx
import { SpeechRecognizer } from "@enginnblt/react-native-nitro-speech-to-text";

const recognizer = SpeechRecognizer.construct();

const start = async () => {
  // 1. Check availability
  const available = await recognizer.isAvailable();
  if (!available) return;

  // 2. Request permission (Mandatory for live mic)
  const permission = await recognizer.requestPermission();
  if (permission !== "granted") return;

  // 3. Start listening
  await recognizer.startListening("en-US", {
    onStart: () => console.log("Started!"),
    onResult: (results) => console.log("Transcripts:", results),
    onError: (err) => console.error(err.code, err.message),
  });
};
```

### 📄 File Transcription (iOS)

```tsx
await recognizer.startTranscription("path/to/audio/file.mp3", "en-US", {
  onResult: (segments, fullText, isFinal) => {
    console.log("Full Text:", fullText);
    console.log("Segments:", segments); // Array of {transcription, timestamp, duration}
  },
  onError: (err) => console.error(err),
});
```

## API Reference

### `useSpeechRecognizer(options?: UseSpeechRecognizerOptions)`

A professional hook for handling real-time speech recognition.

**Options:**

- `locale?: string`: Default locale (e.g., 'en-US').
- `contextualStrings?: string[]`: Boost specific words (iOS only).

**Return Value:**

- `isAvailable: boolean | null`: Service availability.
- `permissionStatus: PermissionStatus | null`: Mic permission status.
- `isListening: boolean`: Active state.
- `result: string`: The current best transcript.
- `volume: number`: Audio level (0-1).
- `error: SpeechErrorResult | null`: Last error.
- `start(options?): Promise<void>`: Start listening.
- `stop(): Promise<void>`: Stop and process.
- `cancel(): Promise<void>`: Discard and stop.
- `requestPermission(): Promise<PermissionStatus>`: Trigger permission prompt.

### `SpeechRecognizer`

The underlying native bridge.

| Method                                                                                               | Description                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `isAvailable(): Promise<boolean>`                                                                    | Checks if speech recognition is supported.     |
| `requestPermission(): Promise<PermissionStatus>`                                                     | Requests microphone & recognition permissions. |
| `startListening(locale: string, callbacks: SpeechCallbacks, options?: Options): Promise<void>`       | Starts live recognition.                       |
| `startTranscription(path: string, locale: string, callbacks: TranscriptionCallbacks): Promise<void>` | Transcribes a file (iOS).                      |
| `stop(): Promise<void>`                                                                              | Stops gracefully.                              |
| `cancel(): Promise<void>`                                                                            | Cancels immediately.                           |

> [!NOTE]
> For a full list of types and interfaces, check the [api.d.ts](./package/src/api.d.ts) file.

## Platform Support

| Feature            | iOS          | Android |
| ------------------ | ------------ | ------- |
| Live Listening     | ✅           | ✅      |
| File Transcription | ✅           | ❌      |
| Volume Metering    | ✅           | ✅      |
| Contextual Strings | ✅ (iOS 17+) | ❌      |
| On-Device Mode     | ✅           | ❌      |

## Credits

Created by [@enginnblt](https://github.com/enginnblt). Powered by [Nitro Modules](https://github.com/mrousavy/nitro).

## License

MIT
