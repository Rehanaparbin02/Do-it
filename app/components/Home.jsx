import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { Audio } from 'expo-av';
import { supabase } from "../lib/supabaseClient";
import { CustomAlert } from "../components/CustomAlert";
import { Alert } from "react-native";
import Pill from "../components/Pill";
import SearchBar from "../components/SearchBar";
import DrawerMenu from "../components/DrawerMenu";

// Import other components
import FABButton from "../components/FABButton";
import NoteFormModal from "../components/NoteFormModal";
import AttachmentModal from "../components/AttachmentModal";
import RecordingModal from "../components/RecordingModal";
import NoteCard from "../components/NoteCard";
import NoteDetailsModal from "../components/NoteDetailsModal";
import ImageViewerModal from "../components/ImageViewerModal";
import Header from "../components/Header";

export default function Home({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
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

  // Filter notes based on selected category and search query
  const filteredNotes = useMemo(() => {
    let filtered = notes;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [notes, selectedCategory, searchQuery]);

  const handleSave = async () => {
    if (!title.trim()) {
      CustomAlert.alert("Validation", "Title cannot be empty.", [{ text: "OK" }]);
      return;
    }

    try {
      setLoading(true);
      
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
          .insert([{ 
            user_id: user?.id || null, 
            title, 
            content, 
            completed: false,
            category: selectedCategory === 'all' ? 'not_urgent_unimportant' : selectedCategory,
            ...mediaPayload 
          }]);
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

              setNotes((prev) => prev.filter((note) => note.id !== noteId));
              CustomAlert.alert("Success", "Note deleted successfully.", [{ text: "OK" }]);
            } catch (err) {
              CustomAlert.alert("Error", err.message || "Failed to delete note.", [{ text: "OK" }]);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
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

  const handleEditNote = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingNoteId(note.id);
    setAttachments({
      photo: note.media_photo || [],
      video: note.media_video || [],
      pdf: note.media_pdf || [],
      audio: note.media_audio || [],
    });
    setSelectedNote(null);
    setShowFormModal(true);
  };

  const getCategoryLabel = (categoryId) => {
    const categories = {
      'all': 'All',
      'urgent_important': 'Urgent & Important',
      'urgent_unimportant': 'Urgent & Unimportant',
      'not_urgent_important': 'Not Urgent & Important',
      'not_urgent_unimportant': 'Not Urgent & Unimportant',
    };
    return categories[categoryId] || 'All';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <Header 
        onLogout={handleLogout} 
        onMenuPress={() => setShowDrawer(true)} 
      />
      
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
      />

      <Pill 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      <FABButton onPress={() => setShowFormModal(true)} />

      <NoteFormModal
        visible={showFormModal}
        title={title}
        content={content}
        attachments={attachments}
        editingNoteId={editingNoteId}
        loading={loading}
        selectedCategory={selectedCategory}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onCategoryChange={setSelectedCategory}
        onSave={async () => {
          await handleSave();
          setShowFormModal(false);
        }}
        onCancel={() => {
          resetForm();
          setShowFormModal(false);
        }}
        onShowAttachmentModal={() => setShowAttachmentModal(true)}
      />

      <AttachmentModal
        visible={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        onAttachment={(type, fileData) => {
          if (type === "audio") {
            setShowRecordingModal(true);
          } else {
            setAttachments((prev) => ({
              ...prev,
              [type]: [...prev[type], fileData],
            }));
          }
        }}
      />

      <RecordingModal
        visible={showRecordingModal}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        recording={recording}
        onStartRecording={async () => {
          try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
              CustomAlert.alert("Permission Denied", "Please grant microphone permission.", [{ text: "OK" }]);
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
        }}
        onStopRecording={async () => {
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

              CustomAlert.alert("Success", "✅ Audio recorded successfully!", [{ text: "OK" }]);
            }
            
            setRecording(null);
            setShowRecordingModal(false);
            setRecordingDuration(0);
          } catch (err) {
            CustomAlert.alert("Error", "Failed to stop recording: " + err.message, [{ text: "OK" }]);
          }
        }}
        onCancel={async () => {
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
        }}
      />

      {loading && notes.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : filteredNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No Results Found' : 'No Notes Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? `No notes match "${searchQuery}"`
              : selectedCategory === 'all' 
                ? 'Tap the + button to create your first note'
                : `No notes in "${getCategoryLabel(selectedCategory)}" category`}
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setShowFormModal(true)}
            >
              <Text style={styles.emptyButtonText}>+ Add Note</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {searchQuery && (
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsText}>
                {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          )}
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                onToggleComplete={() => toggleComplete(item.id, item.completed)}
                onPress={() => setSelectedNote(item)}
              />
            )}
          />
        </>
      )}

      <NoteDetailsModal
        visible={!!selectedNote}
        note={selectedNote}
        playingAudio={playingAudio}
        audioSound={audioSound}
        onClose={() => setSelectedNote(null)}
        onEdit={handleEditNote}
        onDelete={(noteId) => {
          setSelectedNote(null);
          handleDelete(noteId);
        }}
        onPlayAudio={async (uri, index) => {
          try {
            if (audioSound) {
              await audioSound.unloadAsync();
              setAudioSound(null);
              setPlayingAudio(null);
            }

            if (playingAudio === index) {
              return;
            }

            const { sound } = await Audio.Sound.createAsync(
              { uri },
              { shouldPlay: true }
            );

            setAudioSound(sound);
            setPlayingAudio(index);

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
        }}
        onOpenImage={(uri) => setViewingImage(uri)}
      />

      <ImageViewerModal
        visible={!!viewingImage}
        imageUri={viewingImage}
        onClose={() => setViewingImage(null)}
      />
      <DrawerMenu
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        onLogout={handleLogout}
        user={user}
      />
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
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  searchResultsHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  searchResultsText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
  },
});