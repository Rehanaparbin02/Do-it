import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from "react-native";
import * as Sharing from 'expo-sharing';
import { CustomAlert } from "./CustomAlert";

export default function ImageViewerModal({ visible, imageUri, onClose }) {
  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(imageUri);
      }
    } catch (error) {
      CustomAlert.alert("Error", "Failed to share image", [{ text: "OK" }]);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.imageViewerOverlay}>
        <TouchableOpacity 
          style={styles.imageViewerClose}
          onPress={onClose}
        >
          <Text style={styles.imageViewerCloseText}>✕ Close</Text>
        </TouchableOpacity>
        
        <View style={styles.imageViewerContent}>
          <Image
            source={{ uri: imageUri }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.imageViewerActions}>
          <TouchableOpacity
            style={styles.imageActionButton}
            onPress={handleShare}
          >
            <Text style={styles.imageActionButtonText}>📤 Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  imageViewerCloseText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  imageViewerActions: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  imageActionButton: {
    backgroundColor: "rgba(34,197,94,0.9)",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 8,
  },
  imageActionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});