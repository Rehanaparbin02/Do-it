import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Audio } from 'expo-av';
import { supabase } from "../lib/supabaseClient";
import { CustomAlert } from "../components/CustomAlert";
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
import useRefresh from "../hooks/useRefresh"; // adjust relative path as needed


export default function Home({ navigation, route }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showOnlyReminders, setShowOnlyReminders] = useState(false);
  const [user, setUser] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [noteFormCategory, setNoteFormCategory] = useState('not_urgent_unimportant');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
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
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [noteFormSpaceId, setNoteFormSpaceId] = useState(null);
  // const [refreshing, setRefreshing] = useState(false);

   const { refreshing, onRefresh } = useRefresh(
    [
      () => fetchNotes(user?.id),
      () => fetchSpaces(user?.id)
    ],
    [user] // dependent on user changing
  );


  //refresh handler 
  // const handleRefresh = useCallback(async () => {
  //   setRefreshing(true);
  //   await fetchNotes(user?.id);
  //   await fetchSpaces(user?.id);
  //   setRefreshing(false);
  // }, [user]);


  const fetchSpaces = async (userId) => {
    try {
      let query = supabase
        .from("spaces")
        .select("*")
        .order("created_at", { ascending: false });
  
      if (userId) query = query.eq("owner_id", userId);
      else query = query.is("owner_id", null);
  
      const { data, error } = await query;
      if (error) throw error;
  
      setSpaces(data || []);
    } catch (err) {
      console.error("Failed to fetch spaces:", err);
      setSpaces([]);
    }
  };

  useEffect(() => {
    if (route?.params?.selectedSpaceId) {
      setSelectedSpaceId(route.params.selectedSpaceId);
      navigation.setParams({ selectedSpaceId: undefined });
    }
  }, [route?.params?.selectedSpaceId, navigation]);
  
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
        fetchSpaces(data.session.user.id);
      } else if (isMounted) {
        fetchNotes(null);
        fetchSpaces(null);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchNotes(session.user.id);
        fetchSpaces(session.user.id);
      } else {
        fetchNotes(null);
        fetchSpaces(null);
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
    };
  }, [fadeAnim]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotes(user?.id);
      fetchSpaces(user?.id);
    });
    return unsubscribe;
  }, [navigation, user]);

  useEffect(() => {
    return () => {
      if (audioSound) {
        audioSound.unloadAsync();
      }
    };
  }, [audioSound]);

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

//   const fetchNotes = async (userId) => {
//   setLoading(true);
//   try {
//     let query = supabase
//       .from("notes")
//       .select("*")
//       .order("updated_at", { ascending: false })   // ← SORT BY UPDATED FIRST
//       .order("created_at", { ascending: false });  // ← FALLBACK ORDER

//     if (userId) query = query.eq("user_id", userId);
//     else query = query.is("user_id", null);

//     const { data, error } = await query;
//     if (error) throw error;

//     setNotes(data || []);
//   } catch (error) {
//     console.error("Error fetching notes:", error);
//     CustomAlert.alert("Error", "Failed to fetch notes: " + error.message, [{ text: "OK" }]);
//   } finally {
//     setLoading(false);
//   }
// };

// The fetchNotes function now excludes archived notes with .eq("archived", false)

const fetchNotes = async (userId) => {
  setLoading(true);
  try {
    let query = supabase
      .from("notes")
      .select("*")
      .eq("archived", false)  // ✅ EXCLUDE archived notes from Home
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (userId) query = query.eq("user_id", userId);
    else query = query.is("user_id", null);

    const { data, error } = await query;
    if (error) throw error;

    setNotes(data || []);
  } catch (error) {
    console.error("Error fetching notes:", error);
    CustomAlert.alert("Error", "Failed to fetch notes: " + error.message, [{ text: "OK" }]);
  } finally {
    setLoading(false);
  }
};

  const hasReminder = useCallback((note) => {
    if (!note) return false;
    return Boolean(
      note.reminder_time ||
      note.reminderTime ||
      note.reminder_at ||
      note.reminderAt ||
      note.reminder ||
      note.reminderDate
    );
  }, []);

  const selectedSpace = useMemo(() => {
    if (!selectedSpaceId) return null;
    return spaces.find((space) => String(space.id) === String(selectedSpaceId)) || null;
  }, [spaces, selectedSpaceId]);

  const selectedSpaceLabel = useMemo(() => {
    if (!selectedSpaceId) return "Spaces";
    if (!selectedSpace) return "Selected Space";
    return selectedSpace.name || selectedSpace.title || `Space ${selectedSpace.id}`;
  }, [selectedSpaceId, selectedSpace]);

  const noteFormSpaceLabel = useMemo(() => {
    if (!noteFormSpaceId) return "No Space";
    
    const space = spaces.find((s) => String(s.id) === String(noteFormSpaceId));
    if (space) {
      return space.name || space.title || space.label || "Selected Space";
    }
    return "Selected Space";
  }, [noteFormSpaceId, spaces]);

  const notesInActiveSpace = useMemo(() => {
    if (!selectedSpaceId) return notes;
    const normalizedSpaceId = String(selectedSpaceId);

    return notes.filter((note) => {
      const noteSpaceId = note.space_id;
      if (noteSpaceId != null) {
        return String(noteSpaceId) === normalizedSpaceId;
      }
      return false;
    });
  }, [notes, selectedSpaceId]);

  const reminderNotes = useMemo(
    () => notesInActiveSpace.filter(hasReminder),
    [notesInActiveSpace, hasReminder]
  );

  const noteCountInSpace = useMemo(
    () => notesInActiveSpace.length,
    [notesInActiveSpace]
  );

  const toggleNoteSelection = useCallback((noteId) => {
    setSelectedNoteIds((prev) => {
      const exists = prev.includes(noteId);
      const updated = exists ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      if (updated.length === 0) {
        setMultiSelectMode(false);
      }
      return updated;
    });
  }, []);

  const handleNotePress = useCallback((note) => {
    if (multiSelectMode) {
      toggleNoteSelection(note.id);
    } else {
      setSelectedNote(note);
    }
  }, [multiSelectMode, toggleNoteSelection]);

  const handleNoteLongPress = useCallback((note) => {
    if (!note) return;
    setSelectedNote(null);
    setMultiSelectMode(true);
    setSelectedNoteIds((prev) => (prev.includes(note.id) ? prev : [...prev, note.id]));
  }, []);

  const handleCancelMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedNoteIds([]);
  }, []);

  const previousSelectedSpaceIdRef = useRef(selectedSpaceId);

  useEffect(() => {
    const previousSpaceId = previousSelectedSpaceIdRef.current;
    const hasSpaceChanged =
      String(previousSpaceId ?? "") !== String(selectedSpaceId ?? "");

    if (hasSpaceChanged && multiSelectMode) {
      handleCancelMultiSelect();
    }

    previousSelectedSpaceIdRef.current = selectedSpaceId;
  }, [selectedSpaceId, multiSelectMode, handleCancelMultiSelect]);


const handleArchiveNote = async (note) => {
  try {
    // Update the note to set archived = true
    const updateData = { 
      archived: true,
      updated_at: new Date().toISOString()
    };
    
    let query = supabase
      .from("notes")
      .update(updateData)
      .eq("id", note.id);
    
    if (user) query = query.eq("user_id", user.id);
    else query = query.is("user_id", null);

    const { error } = await query;
    if (error) throw error;

    // Update local state immediately - remove from current view
    setNotes((prev) => prev.filter((n) => n.id !== note.id));

    // Show success message
    CustomAlert.alert(
      "Archived", 
      `"${note.title || "Note"}" moved to archive.`, 
      [{ text: "OK" }]
    );
    
    // Refresh from database to ensure sync
    await fetchNotes(user?.id);
  } catch (err) {
    console.error("Error archiving note:", err);
    CustomAlert.alert("Error", err.message || "Failed to archive note.", [
      { text: "OK" }
    ]);
    // Refresh on error
    await fetchNotes(user?.id);
  }
};

const handleFavoriteNote = async (note) => {
  try {
    // Toggle favorite status
    const newFavoriteStatus = !note.favorite;
    
    const updateData = { 
      favorite: newFavoriteStatus,
      updated_at: new Date().toISOString()
    };
    
    let query = supabase
      .from("notes")
      .update(updateData)
      .eq("id", note.id);
    
    if (user) query = query.eq("user_id", user.id);
    else query = query.is("user_id", null);

    const { data, error } = await query.select();
    if (error) throw error;

    // Update local state immediately
    if (data && data.length > 0) {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? data[0] : n))
      );
    }

    // Show success message
    CustomAlert.alert(
      newFavoriteStatus ? "Favorited" : "Unfavorited",
      `"${note.title || "Note"}" ${newFavoriteStatus ? 'added to' : 'removed from'} favorites.`,
      [{ text: "OK" }]
    );
    
    // Refresh from database to ensure sync
    await fetchNotes(user?.id);
  } catch (err) {
    console.error("Error toggling favorite:", err);
    CustomAlert.alert("Error", err.message || "Failed to update favorite status.", [
      { text: "OK" }
    ]);
    // Refresh on error
    await fetchNotes(user?.id);
  }
};

  const handleDeleteSelectedNotes = useCallback(() => {
    if (selectedNoteIds.length === 0) return;

    Alert.alert(
      "Delete Notes",
      `Delete ${selectedNoteIds.length} selected note${selectedNoteIds.length > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setBulkDeleting(true);
              
              let query = supabase
                .from("notes")
                .delete()
                .in("id", selectedNoteIds);

              if (user) query = query.eq("user_id", user.id);
              else query = query.is("user_id", null);

              const { error } = await query;
              if (error) throw error;

              // Update local state immediately after successful deletion
              setNotes((prev) =>
                prev.filter((note) => !selectedNoteIds.includes(note.id))
              );
              
              CustomAlert.alert("Success", "Selected notes deleted successfully.", [
                { text: "OK" },
              ]);
              handleCancelMultiSelect();
              
              // Refresh from database to ensure sync
              await fetchNotes(user?.id);
            } catch (err) {
              console.error("Error deleting notes:", err);
              CustomAlert.alert(
                "Error",
                err.message || "Failed to delete selected notes.",
                [{ text: "OK" }]
              );
              // Refresh from database in case of partial failure
              await fetchNotes(user?.id);
            } finally {
              setBulkDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [selectedNoteIds, user, handleCancelMultiSelect]);

  const filteredNotes = useMemo(() => {
    let filtered = notesInActiveSpace;
    
    if (showOnlyReminders) {
      filtered = filtered.filter(hasReminder);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [
    notesInActiveSpace,
    selectedCategory,
    searchQuery,
    showOnlyReminders,
    hasReminder,
  ]);

  const handleToggleReminders = () => {
    if (!showOnlyReminders && reminderNotes.length === 0) {
      CustomAlert.alert("Reminders", "No notes have reminders set yet.", [{ text: "OK" }]);
      return;
    }
    if (multiSelectMode) {
      handleCancelMultiSelect();
    }
    setShowOnlyReminders((prev) => !prev);
  };

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
        // Updating existing note
        const updateData = { 
          title, 
          content, 
          category: noteFormCategory, 
          updated_at: new Date().toISOString(),
          space_id: noteFormSpaceId || null,
          ...mediaPayload 
        };
        
        let query = supabase
          .from("notes")
          .update(updateData)
          .eq("id", editingNoteId);
          
        if (user) query = query.eq("user_id", user.id);
        else query = query.is("user_id", null);
        
        const { data, error } = await query.select();
        if (error) throw error;
        
        // Update local state with the updated note
        if (data && data.length > 0) {
          setNotes((prev) =>
            prev.map((note) => (note.id === editingNoteId ? data[0] : note))
          );
        }
        
        CustomAlert.alert("Success", "Note updated successfully.", [{ text: "OK" }]);
      } else {
        // Creating new note
        const insertData = { 
          user_id: user?.id || null, 
          title, 
          content, 
          completed: false,
          category: noteFormCategory,
          space_id: noteFormSpaceId || null,
          ...mediaPayload
        };
        
        const { data, error } = await supabase
          .from("notes")
          .insert([insertData])
          .select();
          
        if (error) throw error;
        
        // Add the new note to local state
        if (data && data.length > 0) {
          setNotes((prev) => [data[0], ...prev]);
        }
        
        CustomAlert.alert("Success", "Note added successfully.", [{ text: "OK" }]);
      }

      resetForm();
      
      // Refresh from database to ensure complete sync
      await fetchNotes(user?.id);
    } catch (err) {
      console.error("Error saving note:", err);
      CustomAlert.alert("Error", err.message || "Failed to save note.", [{ text: "OK" }]);
      // Refresh from database in case of error
      await fetchNotes(user?.id);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (noteId, currentStatus) => {
    try {
      // Do NOT modify updated_at so completed notes don't move to top
      const updateData = {
        completed: !currentStatus
      };

      // const updateData = {
      //   completed: !currentStatus,
      //   updated_at: new Date().toISOString() //This causes completed notes to move to the top.
      // };
      
      let query = supabase
        .from("notes")
        .update(updateData)
        .eq("id", noteId);
        
      if (user) query = query.eq("user_id", user.id);
      else query = query.is("user_id", null);
      
      const { data, error } = await query.select();
      if (error) throw error;
      
      // Update local state immediately
      if (data && data.length > 0) {
        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? data[0] : note))
        );
      }
      
      // Refresh from database to ensure sync
      await fetchNotes(user?.id);
    } catch (err) {
      console.error("Error toggling complete:", err);
      CustomAlert.alert("Error", err.message || "Failed to update note status.", [{ text: "OK" }]);
      // Refresh from database in case of error
      await fetchNotes(user?.id);
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

              let query = supabase
                .from("notes")
                .delete()
                .eq("id", noteId);
                
              if (user) query = query.eq("user_id", user.id);
              else query = query.is("user_id", null);

              const { error } = await query;
              if (error) throw error;

              // Update local state immediately
              setNotes((prev) => prev.filter((note) => note.id !== noteId));
              
              CustomAlert.alert("Success", "Note deleted successfully.", [{ text: "OK" }]);
              
              // Refresh from database to ensure sync
              await fetchNotes(user?.id);
            } catch (err) {
              console.error("Error deleting note:", err);
              CustomAlert.alert("Error", err.message || "Failed to delete note.", [{ text: "OK" }]);
              // Refresh from database in case of error
              await fetchNotes(user?.id);
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
    setNoteFormCategory('not_urgent_unimportant');
    setNoteFormSpaceId(selectedSpaceId);
    setAttachments({ photo: [], video: [], pdf: [], audio: [] });
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setNotes([]);
      setSpaces([]);
      setSelectedSpaceId(null);
      setShowSpaceModal(false);
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
    setNoteFormCategory(note.category || 'not_urgent_unimportant');
    setAttachments({
      photo: note.media_photo || [],
      video: note.media_video || [],
      pdf: note.media_pdf || [],
      audio: note.media_audio || [],
    });
    
    setNoteFormSpaceId(note.space_id || null);
    
    setSelectedNote(null);
    setShowFormModal(true);
  };

  const getCategoryLabel = useCallback((categoryId) => {
    const categories = {
      'all': 'All',
      'urgent_important': 'Urgent & Important',
      'urgent_unimportant': 'Urgent & Unimportant',
      'not_urgent_important': 'Not Urgent & Important',
      'not_urgent_unimportant': 'Not Urgent & Unimportant',
    };
    return categories[categoryId] || 'All';
  }, []);

  const renderListHeader = useCallback(() => (
    <View>
      <View style={styles.heroSection}>
        <Text style={styles.heroTitleLine}>
          <Text style={styles.heroTitleLight}>All </Text>
          <Text style={styles.heroTitleAccent}>Notes </Text>
          <Text style={styles.heroTitleLight}>Across</Text>
        </Text>
        <View style={styles.heroSubtitleRow}>
          <Text style={styles.heroSubtitleText}>All </Text>
          <TouchableOpacity
            style={styles.heroSpaceButton}
            onPress={() => setShowSpaceModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.heroSpaceText}>
              {selectedSpaceLabel}
            </Text>
            <Text style={styles.heroChevron}>▾</Text>
          </TouchableOpacity>
          <Text style={styles.heroCountText}>({noteCountInSpace})</Text>
        </View>
      </View>

      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
      />

      <Pill 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      {multiSelectMode && (
        <View style={styles.multiSelectBar}>
          <Text style={styles.multiSelectText}>
            {selectedNoteIds.length} selected
          </Text>
          <View style={styles.multiSelectActions}>
            <TouchableOpacity
              style={styles.multiSelectButton}
              onPress={handleCancelMultiSelect}
              activeOpacity={0.8}
            >
              <Text style={styles.multiSelectButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.multiSelectButton,
                styles.multiSelectDeleteButton,
                (bulkDeleting || selectedNoteIds.length === 0) &&
                  styles.multiSelectButtonDisabled,
              ]}
              onPress={handleDeleteSelectedNotes}
              activeOpacity={0.8}
              disabled={bulkDeleting || selectedNoteIds.length === 0}
            >
              <Text style={styles.multiSelectDeleteText}>
                {bulkDeleting ? "Deleting..." : `Delete (${selectedNoteIds.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {searchQuery && filteredNotes.length > 0 && (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsText}>
            {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  ), [
    bulkDeleting,
    filteredNotes.length,
    handleCancelMultiSelect,
    handleDeleteSelectedNotes,
    multiSelectMode,
    noteCountInSpace,
    searchQuery,
    selectedCategory,
    selectedNoteIds.length,
    selectedSpaceLabel,
  ]);

  const renderListEmptyComponent = useCallback(() => {
    if (loading && notes.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      );
    }

    return (
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
            onPress={() => {
              resetForm();
              setShowFormModal(true);
            }}
          >
            <Text style={styles.emptyButtonText}>+ Add Note</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    getCategoryLabel,
    loading,
    notes.length,
    searchQuery,
    selectedCategory,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <Header 
        onLogout={handleLogout} 
        onMenuPress={() => setShowDrawer(true)} 
        onRemindersPress={handleToggleReminders}
        remindersCount={reminderNotes.length}
        showingReminders={showOnlyReminders}
      />

      <FABButton onPress={() => {
        resetForm();
        setShowFormModal(true);
      }} />

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#22c55e"
          colors={["#22c55e"]}
        />
      }
        renderItem={({ item }) => (

          <NoteCard
            note={item}
            onToggleComplete={() => toggleComplete(item.id, item.completed)}
            onPress={() => handleNotePress(item)}
            onLongPress={() => handleNoteLongPress(item)}
            onSelectToggle={() => toggleNoteSelection(item.id)}
            onArchive={handleArchiveNote}
            onFavorite={handleFavoriteNote}
            multiSelectMode={multiSelectMode}
            selected={selectedNoteIds.includes(item.id)}
            isArchived={false}  // ✅ Home screen shows non-archived notes
          />

        )}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmptyComponent}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      <NoteFormModal
        visible={showFormModal}
        title={title}
        content={content}
        attachments={attachments}
        editingNoteId={editingNoteId}
        loading={loading}
        selectedCategory={noteFormCategory}
        selectedSpaceId={noteFormSpaceId}  // ✅ Already there
        selectedSpaceLabel={noteFormSpaceLabel}
        spaces={spaces}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onCategoryChange={setNoteFormCategory}
        onSpaceChange={setNoteFormSpaceId}  // ✅ ADD THIS LINE
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

      <Modal
        visible={showSpaceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpaceModal(false)}
      >
        <View style={styles.spaceModalOverlay}>
          <TouchableOpacity
            style={styles.spaceModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowSpaceModal(false)}
          />
          <View style={styles.spaceModalCard}>
            <View style={styles.spaceModalHeader}>
              <Text style={styles.spaceModalTitle}>Select Space</Text>
              <TouchableOpacity
                style={styles.spaceModalClose}
                onPress={() => setShowSpaceModal(false)}
              >
                <Text style={styles.spaceModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.spaceOptionsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.spaceOption,
                  !selectedSpaceId && styles.spaceOptionActive,
                ]}
                onPress={() => {
                  setSelectedSpaceId(null);
                  setShowSpaceModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.spaceOptionText}>All Spaces</Text>
                {!selectedSpaceId && (
                  <Text style={styles.spaceOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
              {spaces.length === 0 && (
                <View style={styles.spaceEmptyState}>
                  <Text style={styles.spaceEmptyText}>
                    No spaces yet. Create one from the menu.
                  </Text>
                  <TouchableOpacity
                    style={styles.spaceEmptyButton}
                    onPress={() => {
                      setShowSpaceModal(false);
                      navigation.navigate('Spaces');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.spaceEmptyButtonText}>Manage Spaces</Text>
                  </TouchableOpacity>
                </View>
              )}
              {spaces.map((space, index) => {
                const isActive =
                  String(space.id) === String(selectedSpaceId);
                const label = space.name || space.title || `Space ${index + 1}`;
                const icon = space.icon || "📁";
                const color = space.color || "#22c55e";
                
                return (
                  <TouchableOpacity
                    key={space.id}
                    style={[
                      styles.spaceOption,
                      isActive && styles.spaceOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedSpaceId(space.id);
                      setShowSpaceModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.spaceOptionContent}>
                      <View style={[styles.spaceOptionIcon, { backgroundColor: `${color}20` }]}>
                        <Text style={styles.spaceOptionIconText}>{icon}</Text>
                      </View>
                      <Text style={styles.spaceOptionText}>{label}</Text>
                    </View>
                    {isActive && (
                      <Text style={styles.spaceOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              {spaces.length > 0 && (
                <TouchableOpacity
                  style={styles.manageSpacesButton}
                  onPress={() => {
                    setShowSpaceModal(false);
                    navigation.navigate('Spaces');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manageSpacesText}>⚙️ Manage Spaces</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: 10, 
    paddingTop: 50 ,
    // paddingBottom: -20
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
  listContent: {
    paddingBottom: 0,
    flexGrow: 1,
  },
  multiSelectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  multiSelectText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
  },
  multiSelectActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  multiSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  multiSelectButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  multiSelectDeleteButton: {
    borderColor: "rgba(239,68,68,0.6)",
    backgroundColor: "rgba(239,68,68,0.15)",
    marginLeft: 12,
  },
  multiSelectDeleteText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  multiSelectButtonDisabled: {
    opacity: 0.5,
  },
  heroSection: {
    marginBottom: 50,
    position: 'relative',
    top: 25,
  },
  heroTitleLine: {
    fontSize: 40,
    color: "#fff",
    letterSpacing: -0.5,
    position: 'relative',
    // marginBottom: 5,
  },
  heroTitleLight: {
    fontStyle: 'Inter',
    color: "#fff",
    fontWeight: "100",
  },
  heroTitleAccent: {
    fontStyle: 'Inter',
    color: "#22c55e",
    fontWeight: "700",
  },
  heroSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  heroSubtitleText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "100",
    marginRight: 6,
  },
  
  heroSpaceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: -10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.12)",
    marginRight: 6,
  },
  heroSpaceText: {
    color: "#22c55e",
    fontSize: 40,
    fontWeight: "700",
  },
  heroChevron: {
    marginLeft: 6,
    fontSize: 46,
    fontWeight: "700",
    color: "#22c55e",
  },
  heroCountText: {
    position: 'relative',
    top: 0,
    color: "#facc15",
    fontSize: 50,
    fontWeight: "700",
    marginLeft: 4,
  },
  spaceModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  spaceModalBackdrop: {
    flex: 1,
  },
  spaceModalCard: {
    backgroundColor: "#0f0f0f",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxHeight: '80%',
  },
  spaceModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  spaceModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  spaceModalClose: {
    width: 32,
    height: 34,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  spaceModalCloseText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "700",
  },
  spaceOptionsContainer: {
    paddingBottom: 12,
  },
  spaceOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  spaceOptionActive: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  spaceOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  spaceOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  spaceOptionIconText: {
    fontSize: 18,
  },
  spaceOptionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  spaceOptionCheck: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "700",
  },
  spaceEmptyState: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    marginBottom: 16,
  },
  spaceEmptyText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  spaceEmptyButton: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  spaceEmptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  manageSpacesButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
  },
  manageSpacesText: {
    color: "#f59e0b",
    fontSize: 15,
    fontWeight: "600",
  },
});