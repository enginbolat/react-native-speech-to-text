import ButtonWithText from "components/Button";
import { LOCALES } from "constants/locales";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SpeechRecognizer,
  useSpeechRecognizer,
  type TranscriptionCallbacks,
  type TranscriptionSegment,
} from "@enginnblt/react-native-nitro-speech-to-text";

export default function App() {
  const [locale, setLocale] = useState("en-US");

  const {
    isAvailable,
    isListening,
    result,
    volume,
    error,

    requestPermission,
    start,
    stop,
    cancel,
  } = useSpeechRecognizer({ locale });

  const [transcriptionResult, setTranscriptionResult] = useState("");
  const [transcriptionSegments, setTranscriptionSegments] = useState<
    TranscriptionSegment[]
  >([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null,
  );

  const pickAndTranscribe = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      const filePath = file.uri.replace(/^file:\/\//, "");

      setTranscriptionResult("");
      setTranscriptionSegments([]);
      setTranscriptionError(null);
      setIsTranscribing(true);

      const recognizer = new SpeechRecognizer();
      const callbacks: TranscriptionCallbacks = {
        onResult: (segments, transcription, isFinal) => {
          if (isFinal) {
            setTranscriptionResult(transcription);
            setTranscriptionSegments(segments);
          }
        },
        onError: (e) => {
          setTranscriptionError(`${e.code}: ${e.message}`);
          setIsTranscribing(false);
        },
        onEnd: () => setIsTranscribing(false),
      };

      await recognizer.startTranscription(filePath, locale, callbacks);
    } catch (e) {
      setTranscriptionError(String(e));
      setIsTranscribing(false);
    }
  }, [locale]);

  const [copied, setCopied] = useState(false);
  const copyResult = useCallback(async () => {
    const text = result?.trim();
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const hasText = result?.trim()?.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pb32}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Speech to Text</Text>

      {isAvailable === false && (
        <Text style={styles.error}>
          Speech recognition is not available on this device.
        </Text>
      )}

      {isAvailable === true && (
        <>
          <View style={styles.localeRow}>
            <Text style={styles.label}>Locale</Text>
            <View style={styles.localeButtons}>
              {LOCALES.map((l) => (
                <ButtonWithText
                  key={l.value}
                  type="locale"
                  isActive={locale === l.value}
                  onPress={() => setLocale(l.value)}
                  text={l.label}
                />
              ))}
            </View>
          </View>

          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Result</Text>
            <Text style={styles.resultText}>{result || "—"}</Text>
            {hasText && (
              <View style={styles.copyButton}>
                <ButtonWithText
                  type="text"
                  onPress={copyResult}
                  text={copied ? "Copied!" : "Copy"}
                />
              </View>
            )}
          </View>
          {isListening && (
            <View style={styles.volumeBar}>
              <View style={[styles.volumeFill, { width: `${volume * 10}%` }]} />
            </View>
          )}

          <View style={styles.controls}>
            {!isListening ? (
              <ButtonWithText
                text="Start listening"
                onPress={start}
                type="primary"
              />
            ) : (
              <>
                <ActivityIndicator size="small" color="#0a7ea4" />
                <ButtonWithText text="Stop" onPress={stop} type="text" />
                <ButtonWithText text="Cancel" onPress={cancel} type="text" />
              </>
            )}
          </View>

          {Platform.OS === "ios" ? (
            <View style={styles.sectionSpacer}>
              <Text style={styles.label}>File Transcription</Text>
              <ButtonWithText
                text={isTranscribing ? "Transcribing…" : "Pick Audio File"}
                onPress={pickAndTranscribe}
                type="primary"
              />
              {isTranscribing && (
                <ActivityIndicator
                  style={styles.transcribeSpinner}
                  size="small"
                  color="#0a7ea4"
                />
              )}
              {transcriptionError && (
                <Text style={styles.error}>{transcriptionError}</Text>
              )}
              {transcriptionResult.length > 0 && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>Transcription</Text>
                  <Text style={styles.resultText}>{transcriptionResult}</Text>
                  {transcriptionSegments.length > 0 && (
                    <View style={styles.segmentList}>
                      {transcriptionSegments.map((seg, i) => (
                        <Text key={i} style={styles.partialText}>
                          [{seg.timestamp.toFixed(1)}s +
                          {seg.duration.toFixed(1)}
                          s] {seg.transcription}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sectionSpacer}>
              <Text style={styles.label}>File Transcription</Text>
              <Text style={styles.hint}>
                File transcription is currently only supported on iOS in this
                example. Experimental Android support is under development.
              </Text>
            </View>
          )}
        </>
      )}

      {error ? <Text style={styles.error}>{error.message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    color: "#111",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  localeRow: {
    marginBottom: 20,
  },
  localeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  resultBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 120,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 18,
    color: "#111",
    lineHeight: 26,
  },
  partialText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  copyButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  volumeBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  volumeFill: {
    height: "100%",
    backgroundColor: "#0a7ea4",
    borderRadius: 3,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  sectionSpacer: {
    marginTop: 32,
  },
  transcribeSpinner: {
    marginTop: 12,
  },
  segmentList: {
    marginTop: 12,
  },
  hint: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
  },
  error: {
    marginTop: 16,
    fontSize: 14,
    color: "#c00",
  },
  pb32: {
    paddingBottom: 32,
  },
});
