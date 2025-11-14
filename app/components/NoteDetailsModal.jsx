import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import * as Sharing from 'expo-sharing';
import { CustomAlert } from "./CustomAlert";

const categories = {
  'urgent_important': { 
    label: 'Urgent & Important', 
    emoji: '🔴',
    color: '#ef4444',
    description: 'Do First'
  },
  'urgent_unimportant': { 
    label: 'Urgent & Unimportant', 
    emoji: '🟠',
    color: '#f59e0b',
    description: 'Delegate'
  },
  'not_urgent_important': { 
    label: 'Not Urgent & Important', 
    emoji: '🔵',
    color: '#3b82f6',
    description: 'Schedule'
  },
  'not_urgent_unimportant': { 
    label: 'Not Urgent & Unimportant', 
    emoji: '🟣',
    color: '#8b5cf6',
    description: 'Eliminate'
  },
};

export default function NoteDetailsModal({
  visible,
  note,
  playingAudio,
  onClose,
  onEdit,
  onDelete,
  onPlayAudio,
  onOpenImage,
}) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  // New: helper to detect and format reminder information from note
  const getReminderValue = (note) => {
    if (!note) return null;
    // check common keys used across app
    const possible = [
      note.reminder_at,
      note.reminderAt,
      note.reminder_time,
      note.reminderTime,
      note.reminderDate,
      note.reminder,
    ].filter(Boolean);

    if (possible.length === 0) return null;

    // Prefer full timestamp-like fields first
    const val = possible[0];
    try {
      // If it's already an ISO or timestamp string, format it
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return formatDate(val);
      }
      // Otherwise, if it's a separate date/time pair in object/string, just return as-is
      return String(val);
    } catch {
      return String(val);
    }
  };

  const openPDF = async (uri) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Open PDF'
        });
      } else {
        CustomAlert.alert("Error", "Cannot open PDF on this device", [{ text: "OK" }]);
      }
    } catch (error) {
      CustomAlert.alert("Error", "Failed to open PDF: " + error.message, [{ text: "OK" }]);
    }
  };

  const openVideo = async (uri) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Open Video'
        });
      } else {
        CustomAlert.alert("Error", "Cannot open video on this device", [{ text: "OK" }]);
      }
    } catch (error) {
      CustomAlert.alert("Error", "Failed to open video: " + error.message, [{ text: "OK" }]);
    }
  };

  const renderMediaInfo = (note) => {
    const mediaCount = {
      photos: note.media_photo?.length || 0,
      videos: note.media_video?.length || 0,
      pdfs: note.media_pdf?.length || 0,
      audio: note.media_audio?.length || 0,
    };

    const total = Object.values(mediaCount).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
      <View style={styles.mediaSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📁 Attachments</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{total}</Text>
          </View>
        </View>
        
        {mediaCount.photos > 0 && (
          <View style={styles.mediaGroup}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>📷 Photos</Text>
              <Text style={styles.mediaCount}>{mediaCount.photos}</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.mediaGallery}
              contentContainerStyle={styles.mediaGalleryContent}
            >
              {note.media_photo.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => onOpenImage(uri)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri }}
                    style={styles.mediaThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.thumbnailOverlay}>
                    <Text style={styles.thumbnailIndex}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {mediaCount.videos > 0 && (
          <View style={styles.mediaGroup}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>🎥 Videos</Text>
              <Text style={styles.mediaCount}>{mediaCount.videos}</Text>
            </View>
            <View style={styles.fileList}>
              {note.media_video.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => openVideo(uri)}
                  style={styles.fileItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>▶️</Text>
                  </View>
                  <Text style={styles.fileName} numberOfLines={1}>
                    Video {index + 1}
                  </Text>
                  <Text style={styles.fileAction}>Open →</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {mediaCount.pdfs > 0 && (
          <View style={styles.mediaGroup}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>📄 Documents</Text>
              <Text style={styles.mediaCount}>{mediaCount.pdfs}</Text>
            </View>
            <View style={styles.fileList}>
              {note.media_pdf.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => openPDF(uri)}
                  style={styles.fileItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>📄</Text>
                  </View>
                  <Text style={styles.fileName} numberOfLines={1}>
                    PDF Document {index + 1}
                  </Text>
                  <Text style={styles.fileAction}>Open →</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {mediaCount.audio > 0 && (
          <View style={styles.mediaGroup}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaLabel}>🎙️ Audio</Text>
              <Text style={styles.mediaCount}>{mediaCount.audio}</Text>
            </View>
            <View style={styles.fileList}>
              {note.media_audio.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => onPlayAudio(uri, index)}
                  style={[
                    styles.fileItem,
                    playingAudio === index && styles.fileItemActive
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.fileIcon,
                    playingAudio === index && styles.fileIconActive
                  ]}>
                    <Text style={styles.fileIconText}>
                      {playingAudio === index ? '⏸️' : '▶️'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.fileName,
                    playingAudio === index && styles.fileNameActive
                  ]} numberOfLines={1}>
                    Recording {index + 1}
                  </Text>
                  <Text style={[
                    styles.fileAction,
                    playingAudio === index && styles.fileActionActive
                  ]}>
                    {playingAudio === index ? 'Playing...' : 'Play'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (!note) return null;

  const categoryData = categories[note.category] || categories['not_urgent_unimportant'];
  const reminderDisplay = getReminderValue(note); // new reminder display value

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Close Button - Top Right */}
          <TouchableOpacity 
            style={styles.closeButtonTop}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonTopText}>✕</Text>
          </TouchableOpacity>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.modalTitle}>{note.title}</Text>
              <Text style={styles.relativeTime}>
                {getRelativeTime(note.updated_at || note.created_at)}
              </Text>
            </View>

            {/* Status & Category Row */}
            <View style={styles.statusRow}>
              {/* Completion Status */}
              <View style={[
                styles.statusBadge,
                note.completed ? styles.statusBadgeCompleted : styles.statusBadgeInProgress
              ]}>
                <Text style={[
                  styles.statusIcon,
                  note.completed ? styles.statusIconCompleted : styles.statusIconInProgress
                ]}>
                  {note.completed ? '✅' : '⏱️'}
                </Text>
                <Text style={[
                  styles.statusText,
                  note.completed ? styles.statusTextCompleted : styles.statusTextInProgress
                ]}>
                  {note.completed ? 'Completed' : 'In Progress'}
                </Text>
              </View>

              {/* Category Badge */}
              <View style={[
                styles.categoryBadge,
                { 
                  backgroundColor: `${categoryData.color}20`,
                  borderColor: `${categoryData.color}60`
                }
              ]}>
                <Text style={styles.categoryEmoji}>{categoryData.emoji}</Text>
                <View style={styles.categoryTextContainer}>
                  <Text style={[styles.categoryText, { color: categoryData.color }]}>
                    {categoryData.label}
                  </Text>
                  <Text style={styles.categoryDescription}>
                    {categoryData.description}
                  </Text>
                </View>
              </View>
            </View>

            {/* Content Section */}
            <View style={styles.contentSection}>
              <Text style={styles.contentLabel}>📝 Content</Text>
              <ScrollView 
                style={styles.contentScrollView}
                nestedScrollEnabled={true}
              >
                <Text style={styles.modalContent}>{note.content}</Text>
              </ScrollView>
            </View>

            {/* Media Attachments */}
            {renderMediaInfo(note)}

            {/* Metadata Section */}
            <View style={styles.metadataSection}>
              <Text style={styles.sectionTitle}>⏰ Timeline</Text>
              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataIcon}>🆕</Text>
                  <View style={styles.metadataContent}>
                    <Text style={styles.metadataLabel}>Created</Text>
                    <Text style={styles.metadataValue}>
                      {note.created_at && formatDate(note.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataIcon}>🔄</Text>
                  <View style={styles.metadataContent}>
                    <Text style={styles.metadataLabel}>Last Updated</Text>
                    <Text style={styles.metadataValue}>
                      {note.updated_at && formatDate(note.updated_at)}
                    </Text>
                  </View>
                </View>

                {/* New: Reminder display */}
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataIcon}>⏰</Text>
                  <View style={styles.metadataContent}>
                    <Text style={styles.metadataLabel}>Reminder</Text>
                    <Text style={styles.metadataValue}>
                      {reminderDisplay ? `Reminder set at ${reminderDisplay}` : "No reminder set"}
                    </Text>
                  </View>
                </View>

              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.editButton]}
                onPress={() => onEdit(note)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonIcon}>✏️</Text>
                <Text style={styles.modalButtonText}>Edit Note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => onDelete(note.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonIcon}>🗑️</Text>
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0f0f0f",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },
  closeButtonTop: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(251, 121, 121, 0.87)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonTopText: {
    color: "#ffffffff",
    fontSize: 20,
    fontWeight: "600",
  },
  modalScrollView: {
    maxHeight: "100%",
  },
  modalScrollContent: {
    padding: 24,
    paddingTop: 64,
  },
  titleSection: {
    marginBottom: 20,
    position: 'relative',
    top: -12,
  },
  modalTitle: { 
    color: "#fff", 
    fontSize: 28, 
    fontWeight: "700", 
    marginBottom: 8,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  relativeTime: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  statusBadgeInProgress: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.3)",
  },
  statusIcon: {
    fontSize: 16,
  },
  statusIconCompleted: {},
  statusIconInProgress: {},
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusTextCompleted: {
    color: "#22c55e",
  },
  statusTextInProgress: {
    color: "#fbbf24",
  },
  categoryBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1.5,
    minWidth: 150,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  contentSection: {
    marginBottom: 24,
  },
  contentLabel: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  contentScrollView: {
    maxHeight: 180,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalContent: { 
    color: "#ccc", 
    fontSize: 16,
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: "rgba(34,197,94,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "700",
  },
  mediaSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  mediaGroup: {
    marginBottom: 16,
  },
  mediaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  mediaLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  mediaCount: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  mediaGallery: {
    flexDirection: "row",
  },
  mediaGalleryContent: {
    gap: 12,
  },
  mediaThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  thumbnailIndex: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  fileList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  fileItemActive: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconActive: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  fileIconText: {
    fontSize: 16,
  },
  fileName: {
    flex: 1,
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },
  fileNameActive: {
    color: "#22c55e",
  },
  fileAction: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  fileActionActive: {
    color: "#22c55e",
  },
  metadataSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metadataGrid: {
    gap: 16,
    marginTop: 12,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  metadataIcon: {
    fontSize: 24,
  },
  metadataContent: {
    flex: 1,
  },
  metadataLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metadataValue: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
  },
  modalActions: { 
    flexDirection: "row", 
    gap: 12,
    marginBottom: 8,
  },
  modalButton: { 
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14, 
    paddingVertical: 16,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  deleteButton: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  modalButtonIcon: {
    fontSize: 18,
  },
  modalButtonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
