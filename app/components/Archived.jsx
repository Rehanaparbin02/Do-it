// Archived.jsx - Updated with multi-select delete functionality
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import NoteCard from "../components/NoteCard";
import { CustomAlert } from "../components/CustomAlert";

export default function Archived({ navigation }) {
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(sessionData?.session?.user || null);

        await Promise.all([
          fetchSpaces(sessionData?.session?.user?.id),
          fetchNotes(sessionData?.session?.user?.id),
        ]);
      } catch (err) {
        console.warn("Archived:init error", err);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      fetchSpaces(session?.user?.id);
      fetchNotes(session?.user?.id);
    });

    return () => {
      mounted = false;
      try {
        listener?.subscription?.unsubscribe();
      } catch (e) {}
    };
  }, []);

  const fetchSpaces = async (userId) => {
    try {
      let query = supabase
        .from("spaces")
        .select("id,name,icon,color")
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

  const fetchNotes = async (userId) => {
    setLoading(true);
    try {
      let query = supabase
        .from("notes")
        .select("*")
        .eq("archived", true)  // ✅ ONLY fetch archived notes
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (userId) query = query.eq("user_id", userId);
      else query = query.is("user_id", null);

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Error fetching notes (Archived):", err);
      CustomAlert.alert("Error", "Failed to fetch notes: " + (err.message || err), [{ text: "OK" }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes(user?.id);
    fetchSpaces(user?.id);
  }, [user]);

  const notesInSpace = useMemo(() => {
    if (selectedSpaceId === "no-space") {
      return notes.filter((n) => n.space_id == null || n.space_id === "" || n.space_id === null);
    }
    if (!selectedSpaceId) return notes;
    const normalized = String(selectedSpaceId);
    return notes.filter((n) => String(n.space_id || "") === normalized);
  }, [notes, selectedSpaceId]);

  const archivedNotes = useMemo(
    () => notesInSpace.filter((n) => n.archived === true || n.archived === "true"),
    [notesInSpace]
  );

  const selectedSpaceLabel = useMemo(() => {
    if (selectedSpaceId === "no-space") return "No space";
    if (!selectedSpaceId) return "All spaces";
    const s = spaces.find((x) => String(x.id) === String(selectedSpaceId));
    return s ? s.name : `Space ${selectedSpaceId}`;
  }, [selectedSpaceId, spaces]);

  const toggleCompleteLocal = async (noteId, currentStatus) => {
    try {
      const updateData = { completed: !currentStatus };
      let query = supabase.from("notes").update(updateData).eq("id", noteId);
      if (user) query = query.eq("user_id", user.id);
      else query = query.is("user_id", null);

      const { data, error } = await query.select();
      if (error) throw error;

      if (data && data.length > 0) {
        setNotes((prev) => prev.map((n) => (n.id === noteId ? data[0] : n)));
      }
    } catch (err) {
      console.error("Error toggling completion:", err);
      CustomAlert.alert("Error", err.message || "Failed to update note.", [{ text: "OK" }]);
      fetchNotes(user?.id);
    }
  };

  const handleUnarchiveNote = async (note) => {
    try {
      const updateData = { 
        archived: false,
        updated_at: new Date().toISOString()
      };
      let query = supabase.from("notes").update(updateData).eq("id", note.id);
      if (user) query = query.eq("user_id", user.id);
      else query = query.is("user_id", null);

      const { error } = await query;
      if (error) throw error;

      // Remove from local state immediately
      setNotes((prev) => prev.filter((n) => n.id !== note.id));

      CustomAlert.alert("Success", "Note restored from archive.", [{ text: "OK" }]);
      fetchNotes(user?.id);
    } catch (err) {
      console.error("Error unarchiving note:", err);
      CustomAlert.alert("Error", err.message || "Failed to restore note.", [{ text: "OK" }]);
    }
  };

  const handleDeleteNote = (note) => {
    Alert.alert(
      "Delete Note Permanently",
      `Are you sure you want to permanently delete "${note.title || "Untitled"}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              let query = supabase.from("notes").delete().eq("id", note.id);
              if (user) query = query.eq("user_id", user.id);
              else query = query.is("user_id", null);

              const { error } = await query;
              if (error) throw error;

              // Remove from local state immediately
              setNotes((prev) => prev.filter((n) => n.id !== note.id));

              CustomAlert.alert("Success", "Note deleted permanently.", [{ text: "OK" }]);
              fetchNotes(user?.id);
            } catch (err) {
              console.error("Error deleting note:", err);
              CustomAlert.alert("Error", err.message || "Failed to delete note.", [{ text: "OK" }]);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Multi-select handlers
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

  const handleNoteLongPress = useCallback((note) => {
    if (!note) return;
    setMultiSelectMode(true);
    setSelectedNoteIds((prev) => (prev.includes(note.id) ? prev : [...prev, note.id]));
  }, []);

  const handleCancelMultiSelect = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedNoteIds([]);
  }, []);

  const handleDeleteSelectedNotes = useCallback(() => {
    if (selectedNoteIds.length === 0) return;

    Alert.alert(
      "Delete Notes Permanently",
      `Permanently delete ${selectedNoteIds.length} selected note${selectedNoteIds.length > 1 ? "s" : ""}? This action cannot be undone.`,
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

              // Update local state immediately
              setNotes((prev) =>
                prev.filter((note) => !selectedNoteIds.includes(note.id))
              );
              
              CustomAlert.alert("Success", "Selected notes deleted permanently.", [
                { text: "OK" },
              ]);
              handleCancelMultiSelect();
              
              fetchNotes(user?.id);
            } catch (err) {
              console.error("Error deleting notes:", err);
              CustomAlert.alert(
                "Error",
                err.message || "Failed to delete selected notes.",
                [{ text: "OK" }]
              );
              fetchNotes(user?.id);
            } finally {
              setBulkDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [selectedNoteIds, user, handleCancelMultiSelect]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No archived notes</Text>
        <Text style={styles.emptySubtitle}>
          {selectedSpaceId
            ? "No archived notes in this space yet."
            : "You have no archived notes yet."}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Archived</Text>
          <Text style={styles.headerSubtitle}>
            {archivedNotes.length} archived {archivedNotes.length === 1 ? "note" : "notes"}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Space selector */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.spaceSelector}
          onPress={() => setShowSpaceModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.spaceSelectorText}>{selectedSpaceLabel}</Text>
          <Text style={styles.spaceSelectorChevron}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* Multi-select bar */}
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

      {/* Space Modal */}
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
                style={[styles.spaceOption, !selectedSpaceId && styles.spaceOptionActive]}
                onPress={() => {
                  setSelectedSpaceId(null);
                  setShowSpaceModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.spaceOptionText}>All spaces</Text>
                {!selectedSpaceId && <Text style={styles.spaceOptionCheck}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.spaceOption,
                  selectedSpaceId === "no-space" && styles.spaceOptionActive,
                ]}
                onPress={() => {
                  setSelectedSpaceId("no-space");
                  setShowSpaceModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.spaceOptionText}>No space</Text>
                {selectedSpaceId === "no-space" && <Text style={styles.spaceOptionCheck}>✓</Text>}
              </TouchableOpacity>

              {spaces.length === 0 ? (
                <View style={styles.spaceEmptyState}>
                  <Text style={styles.spaceEmptyText}>
                    No spaces yet. Create one from the Spaces screen.
                  </Text>
                  <TouchableOpacity
                    style={styles.spaceEmptyButton}
                    onPress={() => {
                      setShowSpaceModal(false);
                      navigation.navigate("Spaces");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.spaceEmptyButtonText}>Manage Spaces</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                spaces.map((space, idx) => {
                  const isActive = String(space.id) === String(selectedSpaceId);
                  const label = space.name || `Space ${idx + 1}`;
                  const icon = space.icon || "📁";
                  const color = space.color || "#22c55e";
                  return (
                    <TouchableOpacity
                      key={space.id}
                      style={[styles.spaceOption, isActive && styles.spaceOptionActive]}
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
                      {isActive && <Text style={styles.spaceOptionCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}

              {spaces.length > 0 && (
                <TouchableOpacity
                  style={styles.manageSpacesButton}
                  onPress={() => {
                    setShowSpaceModal(false);
                    navigation.navigate("Spaces");
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

      <FlatList
        data={archivedNotes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onToggleComplete={() => toggleCompleteLocal(item.id, item.completed)}
            onPress={() => {
              if (multiSelectMode) {
                toggleNoteSelection(item.id);
              } else {
                navigation?.navigate?.("NoteDetails", { note: item });
              }
            }}
            onLongPress={() => handleNoteLongPress(item)}
            onSelectToggle={() => toggleNoteSelection(item.id)}
            onUnarchive={() => handleUnarchiveNote(item)}
            onDelete={() => handleDeleteNote(item)}
            multiSelectMode={multiSelectMode}
            selected={selectedNoteIds.includes(item.id)}
            isArchived={true}  // ✅ This is the key prop
          />
        )}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
            colors={["#f59e0b"]}
          />
        }
        contentContainerStyle={
          archivedNotes.length === 0 ? styles.flatListEmpty : styles.flatListContent
        }
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    padding: 16,
    paddingTop: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: "#999",
    fontSize: 13,
    marginTop: 4,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "flex-start",
  },

  spaceSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "transparent",
  },

  spaceSelectorText: {
    color: "#ddd",
    fontSize: 13,
    marginRight: 8,
  },

  spaceSelectorChevron: {
    color: "#aaa",
    fontSize: 12,
  },

  multiSelectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  multiSelectText: {
    color: "#f59e0b",
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

  // modal
  spaceModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  spaceModalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  spaceModalCard: {
    width: "90%",
    maxHeight: "70%",
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  spaceModalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },

  spaceModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  spaceModalClose: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 6,
  },

  spaceModalCloseText: {
    color: "#fff",
    fontSize: 18,
  },

  spaceOptionsContainer: {
    paddingBottom: 16,
  },

  spaceOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  spaceOptionActive: {
    backgroundColor: "rgba(245,158,11,0.06)",
  },

  spaceOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  spaceOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  spaceOptionIconText: {
    fontSize: 18,
  },

  spaceOptionText: {
    color: "#ddd",
    fontSize: 15,
  },

  spaceOptionCheck: {
    color: "#f59e0b",
    fontWeight: "700",
  },

  manageSpacesButton: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)",
  },

  manageSpacesText: {
    color: "#aaa",
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
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  spaceEmptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // list
  flatListContent: {
    paddingBottom: 120,
  },

  flatListEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 120,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    alignItems: "center",
    padding: 32,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },

  emptySubtitle: {
    color: "#888",
    textAlign: "center",
  },
});