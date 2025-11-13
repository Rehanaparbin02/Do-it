import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { CustomAlert } from "./CustomAlert";

export default function AttachmentModal({ visible, onClose, onAttachment }) {
  const handleAttachment = async (type) => {
    onClose();
    
    if (type === "audio") {
      onAttachment("audio", null);
      return;
    }

    try {
      let fileUri = null;
      let fileName = null;

      if (type === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          CustomAlert.alert("Permission Denied", "Please grant camera permission.", [{ text: "OK" }]);
          return;
        }

        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          fileUri = res.assets[0].uri;
          fileName = res.assets[0].fileName || `camera_${Date.now()}.jpg`;
        }
      } else if (type === "image") {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          fileUri = res.assets[0].uri;
          fileName = res.assets[0].fileName || `image_${Date.now()}.jpg`;
        }
      } else if (type === "video") {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          fileUri = res.assets[0].uri;
          fileName = res.assets[0].fileName || `video_${Date.now()}.mp4`;
        }
      } else if (type === "document") {
        const res = await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
          fileUri = res.assets[0].uri;
          fileName = res.assets[0].name || `document_${Date.now()}.pdf`;
        }
      }

      if (fileUri) {
        const fileData = { uri: fileUri, name: fileName };
        const attachmentKey = type === "image" || type === "camera" ? "photo" : type === "document" ? "pdf" : type;
        
        onAttachment(attachmentKey, fileData);
        CustomAlert.alert("Success", `✅ ${type === "camera" ? "Photo" : type} attached successfully!`, [{ text: "OK" }]);
      } else {
        CustomAlert.alert("Cancelled", "No file selected.", [{ text: "OK" }]);
      }
    } catch (err) {
      CustomAlert.alert("Error", err.message, [{ text: "OK" }]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.attachmentModalOverlay}>
        <View style={styles.attachmentModalCard}>
          <Text style={styles.attachmentModalTitle}>Add Attachment</Text>
          <Text style={styles.attachmentModalSubtitle}>Choose file type</Text>
          
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleAttachment("camera")}
          >
            <Text style={styles.attachmentOptionIcon}>📷</Text>
            <Text style={styles.attachmentOptionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleAttachment("image")}
          >
            <Text style={styles.attachmentOptionIcon}>🖼️</Text>
            <Text style={styles.attachmentOptionText}>Choose Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleAttachment("document")}
          >
            <Text style={styles.attachmentOptionIcon}>📄</Text>
            <Text style={styles.attachmentOptionText}>Document</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleAttachment("video")}
          >
            <Text style={styles.attachmentOptionIcon}>🎥</Text>
            <Text style={styles.attachmentOptionText}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => handleAttachment("audio")}
          >
            <Text style={styles.attachmentOptionIcon}>🎙️</Text>
            <Text style={styles.attachmentOptionText}>Record Audio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachmentModalCancel}
            onPress={onClose}
          >
            <Text style={styles.attachmentModalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentModalCard: {
    backgroundColor: "rgba(20,20,20,0.98)",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    borderWidth: 1,
    borderColor: "#333",
  },
  attachmentModalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  attachmentModalSubtitle: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  attachmentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  attachmentOptionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  attachmentOptionText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  attachmentModalCancel: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  attachmentModalCancelText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});