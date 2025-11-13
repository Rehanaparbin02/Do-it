import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";

export default function RecordingModal({
  visible,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onCancel,
}) {
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.recordingModalOverlay}>
        <View style={styles.recordingModalCard}>
          <Text style={styles.recordingModalTitle}>
            {isRecording ? "🎙️ Recording..." : "Ready to Record"}
          </Text>
          
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTime}>
                {formatRecordingTime(recordingDuration)}
              </Text>
            </View>
          )}

          <View style={styles.recordingActions}>
            {!isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={onStartRecording}
              >
                <Text style={styles.recordButtonText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={onStopRecording}
              >
                <Text style={styles.stopButtonText}>Stop & Save</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelRecordButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelRecordButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  recordingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingModalCard: {
    backgroundColor: "rgba(20,20,20,0.98)",
    borderRadius: 20,
    padding: 32,
    width: "85%",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  recordingModalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ef4444",
    marginRight: 12,
  },
  recordingTime: {
    color: "#ef4444",
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  recordingActions: {
    width: "100%",
  },
  recordButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  stopButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  cancelRecordButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelRecordButtonText: {
    color: "#aaa",
    fontSize: 16,
    fontWeight: "600",
  },
});
