import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from 'expo-av';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from "../lib/supabaseClient";
import { CustomAlert } from "../components/CustomAlert";

import { Alert } from "react-native"; 

export default function Home({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [attachments, setAttachments] = useState({
    photo: [],
    video: [],
    pdf: [],
    audio: [],
  });
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioSound, setAudioSound] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // Request audio permissions
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Session Error:", error);
      if (data?.session?.user && isMounted) {
        setUser(data.session.user);
        fetchNotes(data.session.user.id);
      } else if (isMounted) {
        fetchNotes(null);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchNotes(session.user.id);
      } else {
        fetchNotes(null);
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
      if (audioSound) {
        audioSound.unloadAsync();
      }
    };
  }, []);

  // Update recording duration every second
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchNotes = async (userId) => {
    setLoading(true);
    let query = supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) query = query.eq("user_id", userId);
    else query = query.is("user_id", null);

    const { data, error } = await query;
    if (error) CustomAlert.alert("Error", error.message, [{ text: "OK" }]);
    else setNotes(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      CustomAlert.alert("Validation", "Title cannot be empty.", [{ text: "OK" }]);
      return;
    }

    try {
      setLoading(true);
      
      // Convert file data to just URIs for database storage
      const mediaPayload = {
        media_photo: attachments.photo.map(f => typeof f === 'string' ? f : f.uri),
        media_video: attachments.video.map(f => typeof f === 'string' ? f : f.uri),
        media_pdf: attachments.pdf.map(f => typeof f === 'string' ? f : f.uri),
        media_audio: attachments.audio.map(f => typeof f === 'string' ? f : f.uri),
      };

      if (editingNoteId) {
        const updateData = { title, content, updated_at: new Date(), ...mediaPayload };
        let query = supabase.from("notes").update(updateData).eq("id", editingNoteId);
        if (user) query = query.eq("user_id", user.id);
        else query = query.is("user_id", null);
        
        const { error } = await query;
        if (error) throw error;
        CustomAlert.alert("Success", "Note updated successfully.", [{ text: "OK" }]);
      } else {
        const { error } = await supabase
          .from("notes")
          .insert([{ user_id: user?.id || null, title, content, completed: false, ...mediaPayload }]);
        if (error) throw error;
        CustomAlert.alert("Success", "Note added successfully.", [{ text: "OK" }]);
      }

      resetForm();
      fetchNotes(user?.id);
    } catch (err) {
      CustomAlert.alert("Error", err.message, [{ text: "OK" }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (noteId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({ completed: !currentStatus, updated_at: new Date() })
        .eq("id", noteId);
      if (error) throw error;
      fetchNotes(user?.id);
    } catch (err) {
      CustomAlert.alert("Error", err.message, [{ text: "OK" }]);
    }
  };

  const handleDelete = async (noteId) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              let query = supabase.from("notes").delete().eq("id", noteId);
              if (user) query = query.eq("user_id", user.id);
              else query = query.is("user_id", null);

              const { error } = await query;
              if (error) throw error;

              // Update UI
              setNotes((prev) => prev.filter((note) => note.id !== noteId));
              setSelectedNote(null);

              Alert.alert("Success", "Note deleted successfully.");
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to delete note.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        CustomAlert.alert("Permission Denied", "Please grant microphone permission to record audio.", [{ text: "OK" }]);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      CustomAlert.alert("Error", "Failed to start recording: " + err.message, [{ text: "OK" }]);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      const fileName = `audio_${Date.now()}.m4a`;
      
      if (uri) {
        const fileData = { uri, name: fileName };
        
        setAttachments((prev) => ({
          ...prev,
          audio: [...prev.audio, fileData],
        }));

        CustomAlert.alert("Success", "✅ Audio recorded successfully!", [
          { text: "OK" },
        ]);
      }
      
      setRecording(null);
      setShowRecordingModal(false);
      setRecordingDuration(0);
    } catch (err) {
      CustomAlert.alert("Error", "Failed to stop recording: " + err.message, [{ text: "OK" }]);
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      try {
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        setRecording(null);
      } catch (err) {
        console.error("Error canceling recording:", err);
      }
    }
    setShowRecordingModal(false);
    setRecordingDuration(0);
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAttachment = async (type) => {
    setShowAttachmentModal(false);
    
    if (type === "audio") {
      setShowRecordingModal(true);
      return;
    }

    try {
      let fileUri = null;
      let fileName = null;

      if (type === "camera") {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          CustomAlert.alert("Permission Denied", "Please grant camera permission to take photos.", [{ text: "OK" }]);
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
        
        // Map type to the correct attachment key
        const attachmentKey = type === "image" || type === "camera" ? "photo" : type === "document" ? "pdf" : type;
        
        setAttachments((prev) => ({
          ...prev,
          [attachmentKey]: [...prev[attachmentKey], fileData],
        }));

        CustomAlert.alert("Success", `✅ ${type === "camera" ? "Photo" : type} attached successfully!`, [
          { text: "OK" },
        ]);
      } else {
        CustomAlert.alert("Cancelled", "No file selected.", [{ text: "OK" }]);
      }
    } catch (err) {
      CustomAlert.alert("Error", err.message, [{ text: "OK" }]);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingNoteId(null);
    setAttachments({ photo: [], video: [], pdf: [], audio: [] });
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setNotes([]);
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      CustomAlert.alert("Error", err.message || "Logout failed", [{ text: "OK" }]);
    } finally {
      setLoading(false);
    }
  };

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

  const playAudio = async (uri, index) => {
    try {
      // Stop any currently playing audio
      if (audioSound) {
        await audioSound.unloadAsync();
        setAudioSound(null);
        setPlayingAudio(null);
      }

      // If clicking the same audio that was playing, just stop it
      if (playingAudio === index) {
        return;
      }

      // Load and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      setAudioSound(sound);
      setPlayingAudio(index);

      // Set up completion handler
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
          sound.unloadAsync();
          setAudioSound(null);
        }
      });
    } catch (error) {
      CustomAlert.alert("Error", "Failed to play audio: " + error.message, [{ text: "OK" }]);
    }
  };

  const openImage = (uri) => {
    setViewingImage(uri);
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
        <Text style={styles.mediaSectionTitle}>Attachments ({total})</Text>
        
        {/* Photos */}
        {mediaCount.photos > 0 && (
          <View>
            <Text style={styles.mediaItem}>📷 Photos: {mediaCount.photos}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaGallery}>
              {note.media_photo.map((uri, index) => (
                <TouchableOpacity key={index} onPress={() => openImage(uri)}>
                  <Image
                    source={{ uri }}
                    style={styles.mediaThumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {mediaCount.videos > 0 && (
          <View style={styles.mediaItemContainer}>
            <Text style={styles.mediaItem}>🎥 Videos: {mediaCount.videos}</Text>
            <View style={styles.fileList}>
              {note.media_video.map((uri, index) => (
                <TouchableOpacity key={index} onPress={() => openVideo(uri)}>
                  <Text style={styles.fileNameClickable} numberOfLines={1}>
                    • Video {index + 1} (Tap to open)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {mediaCount.pdfs > 0 && (
          <View style={styles.mediaItemContainer}>
            <Text style={styles.mediaItem}>📄 PDFs: {mediaCount.pdfs}</Text>
            <View style={styles.fileList}>
              {note.media_pdf.map((uri, index) => (
                <TouchableOpacity key={index} onPress={() => openPDF(uri)}>
                  <Text style={styles.fileNameClickable} numberOfLines={1}>
                    • PDF {index + 1} (Tap to open)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {mediaCount.audio > 0 && (
          <View style={styles.mediaItemContainer}>
            <Text style={styles.mediaItem}>🎙️ Audio: {mediaCount.audio}</Text>
            <View style={styles.fileList}>
              {note.media_audio.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => playAudio(uri, index)}
                  style={styles.audioButton}
                >
                  <Text style={styles.fileNameClickable} numberOfLines={1}>
                    {playingAudio === index ? '⏸️' : '▶️'} Recording {index + 1} (Tap to {playingAudio === index ? 'stop' : 'play'})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Do-It</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* FAB Button */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => setShowFormModal(true)}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Note Form Modal */}
      <Modal visible={showFormModal} transparent animationType="slide">
        <View style={styles.formModalOverlay}>
          <View style={styles.formModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>
                  {editingNoteId ? "Edit Note" : "New Note"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Title"
                  placeholderTextColor="#999"
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Write something..."
                  placeholderTextColor="#999"
                  value={content}
                  multiline
                  onChangeText={setContent}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.attachButton}
                  onPress={() => setShowAttachmentModal(true)}
                >
                  <Text style={styles.attachText}>📎 Add Attachment</Text>
                </TouchableOpacity>

                {(attachments.photo.length > 0 ||
                  attachments.video.length > 0 ||
                  attachments.pdf.length > 0 ||
                  attachments.audio.length > 0) && (
                  <View style={styles.attachmentPreview}>
                    <Text style={styles.attachmentText}>
                      {attachments.photo.length > 0 && `📷 ${attachments.photo.length} `}
                      {attachments.video.length > 0 && `🎥 ${attachments.video.length} `}
                      {attachments.pdf.length > 0 && `📄 ${attachments.pdf.length} `}
                      {attachments.audio.length > 0 && `🎙️ ${attachments.audio.length}`}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveButton, loading && { opacity: 0.6 }]}
                  onPress={async () => {
                    await handleSave();
                    setShowFormModal(false);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingNoteId ? "Update" : "Add Note"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    resetForm();
                    setShowFormModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attachment Modal */}
      <Modal visible={showAttachmentModal} transparent animationType="fade">
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
              onPress={() => setShowAttachmentModal(false)}
            >
              <Text style={styles.attachmentModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Recording Modal */}
      <Modal visible={showRecordingModal} transparent animationType="fade">
        <View style={styles.recordingModalOverlay}>
          <View style={styles.recordingModalCard}>
            <Text style={styles.recordingModalTitle}>
              {isRecording ? "🎙️ Recording..." : "Ready to Record"}
            </Text>
            
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>{formatRecordingTime(recordingDuration)}</Text>
              </View>
            )}

            <View style={styles.recordingActions}>
              {!isRecording ? (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <Text style={styles.stopButtonText}>Stop & Save</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelRecordButton}
                onPress={cancelRecording}
              >
                <Text style={styles.cancelRecordButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notes List */}
      {loading && notes.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.noteCard, item.completed && styles.completedCard]}
              onPress={() => setSelectedNote(item)}
            >
              <View style={styles.noteRow}>
                <TouchableOpacity
                  onPress={() => toggleComplete(item.id, item.completed)}
                  style={[styles.checkbox, item.completed && styles.checkboxChecked]}
                >
                  {item.completed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.noteTitle,
                      item.completed && styles.noteCompleted,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.noteContent,
                      item.completed && styles.noteCompleted,
                    ]}
                    numberOfLines={2}
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Note Details Modal */}
      <Modal visible={!!selectedNote} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalTitle}>{selectedNote?.title}</Text>
              
              <ScrollView 
                style={styles.contentScrollView}
                nestedScrollEnabled={true}
              >
                <Text style={styles.modalContent}>{selectedNote?.content}</Text>
              </ScrollView>
              
              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {selectedNote?.completed ? "✅ Completed" : "⏱️ In Progress"}
                </Text>
              </View>

              {/* Media Information */}
              {selectedNote && renderMediaInfo(selectedNote)}

              {/* Timestamps */}
              <View style={styles.timestampSection}>
                <View style={styles.timestampRow}>
                  <Text style={styles.timestampLabel}>Created:</Text>
                  <Text style={styles.timestampValue}>
                    {selectedNote?.created_at && formatDate(selectedNote.created_at)}
                  </Text>
                </View>
                <View style={styles.timestampRow}>
                  <Text style={styles.timestampLabel}>Updated:</Text>
                  <Text style={styles.timestampValue}>
                    {selectedNote?.updated_at && formatDate(selectedNote.updated_at)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#22c55e" }]}
                  onPress={() => {
                    setTitle(selectedNote.title);
                    setContent(selectedNote.content);
                    setEditingNoteId(selectedNote.id);
                    setAttachments({
                      photo: selectedNote.media_photo || [],
                      video: selectedNote.media_video || [],
                      pdf: selectedNote.media_pdf || [],
                      audio: selectedNote.media_audio || [],
                    });
                    setSelectedNote(null);
                    setShowFormModal(true);
                  }}
                >
                  <Text style={styles.modalButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#ef4444" }]}
                  onPress={() => {
                    setSelectedNote(null);
                    handleDelete(selectedNote.id);
                  }}
                >
                  <Text style={styles.modalButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedNote(null)}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={!!viewingImage} transparent animationType="fade">
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity 
            style={styles.imageViewerClose}
            onPress={() => setViewingImage(null)}
          >
            <Text style={styles.imageViewerCloseText}>✕ Close</Text>
          </TouchableOpacity>
          
          <View style={styles.imageViewerContent}>
            <Image
              source={{ uri: viewingImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.imageViewerActions}>
            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={async () => {
                try {
                  const isAvailable = await Sharing.isAvailableAsync();
                  if (isAvailable) {
                    await Sharing.shareAsync(viewingImage);
                  }
                } catch (error) {
                  CustomAlert.alert("Error", "Failed to share image", [{ text: "OK" }]);
                }
              }}
            >
              <Text style={styles.imageActionButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#0a0a0a", 
    padding: 20, 
    paddingTop: 50 
  },
  header: { 
    position: "relative",
    top: -30,
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: -20 
  },
  headerTitle: { 
    color: "#22c55e", 
    fontSize: 48, 
    fontWeight: "700" 
  },
  logoutButton: {
    backgroundColor: "rgba(244, 56, 56, 0.83)",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    height: 40,
    position: "relative",
    top: 15
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: "#22c55e",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    color: "#ffffffff",
    fontSize: 36,
    fontWeight: "600",
    marginBottom: -5,
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  formModalCard: {
    backgroundColor: "rgba(20,20,20,0.95)",
    borderRadius: 20,
    width: "100%",
    maxHeight: "100%",
    borderWidth: 1,
    borderColor: "#333",
    paddingBottom: -2,
  },
  cancelButton: {
    backgroundColor: "rgba(244, 56, 56, 0.83)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#ffffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutText: { 
    color: "#ffffffff", 
    fontWeight: "600" 
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  sectionTitle: { 
    color: "#22c55e", 
    fontWeight: "600", 
    fontSize: 28, 
    marginBottom: 12 
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    fontSize: 16,
  },
  multiline: { 
    height: 100, 
    textAlignVertical: "top" 
  },
  attachButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  attachText: {
    color: "#ddd",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  attachmentPreview: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  attachmentText: {
    color: "#22c55e",
    fontSize: 14,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16 
  },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  noteCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  completedCard: { 
    opacity: 0.5 
  },
  noteRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  checkmark: { color: "#fff", fontWeight: "700" },
  noteTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  noteContent: { color: "#999", fontSize: 14, marginTop: 2 },
  noteCompleted: { textDecorationLine: "line-through", color: "#666" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "rgba(20,20,20,0.98)",
    borderRadius: 20,
    width: "100%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalScrollView: {
    maxHeight: "100%",
  },
  modalScrollContent: {
    padding: 24,
  },
  contentScrollView: {
    maxHeight: 200,
    marginBottom: 16,
  },
  modalTitle: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "700", 
    marginBottom: 12,
    textAlign: "center"
  },
  modalContent: { 
    color: "#bbb", 
    fontSize: 16,
    lineHeight: 24,
  },
  statusBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  statusText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "600",
  },
  mediaSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  mediaSectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  mediaItem: {
    color: "#999",
    fontSize: 14,
    marginVertical: 6,
    fontWeight: "600",
  },
  mediaItemContainer: {
    marginVertical: 6,
  },
  mediaGallery: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 8,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  fileList: {
    marginTop: 4,
    marginLeft: 8,
  },
  fileName: {
    color: "#777",
    fontSize: 12,
    marginVertical: 2,
  },
  fileNameClickable: {
    color: "#22c55e",
    fontSize: 12,
    marginVertical: 2,
    textDecorationLine: "underline",
  },
  audioButton: {
    paddingVertical: 4,
  },
  timestampSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  timestampRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  timestampLabel: {
    color: "#888",
    fontSize: 14,
    fontWeight: "500",
  },
  timestampValue: {
    color: "#bbb",
    fontSize: 14,
  },
  modalActions: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    gap: 12,
    marginBottom: 16,
  },
  modalButton: { 
    flex: 1,
    borderRadius: 12, 
    paddingVertical: 14, 
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  modalClose: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  closeText: { color: "#aaa", fontWeight: "600", fontSize: 15 },
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