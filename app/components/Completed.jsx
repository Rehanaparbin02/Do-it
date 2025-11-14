// Completed.jsx
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
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import NoteCard from "../components/NoteCard";
import { CustomAlert } from "../components/CustomAlert";

export default function Completed({ navigation }) {
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null); // null => All spaces
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

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
        console.warn("Completed:init error", err);
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
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (userId) query = query.eq("user_id", userId);
      else query = query.is("user_id", null);

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Error fetching notes (Completed):", err);
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

  const completedNotes = useMemo(
    () => notesInSpace.filter((n) => n.completed === true || n.completed === "true"),
    [notesInSpace]
  );

  const selectedSpaceLabel = useMemo(() => {
    if (selectedSpaceId === "no-space") return "No space";
    if (!selectedSpaceId) return "All spaces";
    const s = spaces.find((x) => String(x.id) === String(selectedSpaceId));
    return s ? s.name : `Space ${selectedSpaceId}`;
  }, [selectedSpaceId, spaces]);

  const toggleCompleteLocal = async (noteId, currentStatus) => {
    // Toggle completed but do NOT update updated_at so completed notes do not move to top
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

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>No completed notes</Text>
        <Text style={styles.emptySubtitle}>
          {selectedSpaceId
            ? "No completed notes in this space yet."
            : "You have no completed notes yet."}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header (like Spaces.jsx) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Completed</Text>
          <Text style={styles.headerSubtitle}>
            {completedNotes.length} completed {completedNotes.length === 1 ? "note" : "notes"}
          </Text>
        </View>

        {/* placeholder so header layout stays symmetric; could be an action button */}
        <View style={{ width: 40 }} />
      </View>

      {/* Space selector row (dropdown button) */}
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

      {/* Space modal (reuse pattern from Home/Spaces) */}
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
                style={[styles.spaceOption, selectedSpaceId === "no-space" && styles.spaceOptionActive]}
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
                  <Text style={styles.spaceEmptyText}>No spaces yet. Create one from the Spaces screen.</Text>
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
        data={completedNotes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onToggleComplete={() => toggleCompleteLocal(item.id, item.completed)}
            onPress={() => navigation?.navigate?.("NoteDetails", { note: item })}
            onLongPress={() => {}}
          />
        )}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={completedNotes.length === 0 ? styles.flatListEmpty : styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  backButtonText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerContent: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#999", fontSize: 13, marginTop: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, justifyContent: "flex-start" },
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
  spaceSelectorText: { color: "#ddd", fontSize: 13, marginRight: 8 },
  spaceSelectorChevron: { color: "#aaa", fontSize: 12 },

  // modal
  spaceModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  spaceModalBackdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  spaceModalCard: {
    width: "90%",
    maxHeight: "70%",
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  spaceModalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  spaceModalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  spaceModalClose: { position: "absolute", right: 12, top: 12, padding: 6 },
  spaceModalCloseText: { color: "#fff", fontSize: 18 },

  spaceOptionsContainer: { paddingBottom: 16 },
  spaceOption: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  spaceOptionActive: { backgroundColor: "rgba(34,197,94,0.06)" },
  spaceOptionContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  spaceOptionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  spaceOptionIconText: { fontSize: 18 },
  spaceOptionText: { color: "#ddd", fontSize: 15 },
  spaceOptionCheck: { color: "#22c55e", fontWeight: "700" },

  manageSpacesButton: { padding: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)" },
  manageSpacesText: { color: "#aaa" },

  // list
  flatListContent: { paddingBottom: 120 },
  flatListEmpty: { flexGrow: 1, justifyContent: "center", paddingBottom: 120 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  emptyContainer: { alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#888", textAlign: "center" },
});
