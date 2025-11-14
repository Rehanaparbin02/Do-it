// TimeTracking.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

const ACCENT = "#22c55e";
const STORAGE_KEY = "time_tracking_sessions_v1";

/* Helpers */
const pad = (n) => String(n).padStart(2, "0");

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const remainder = totalSeconds - hours * 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder - minutes * 60;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function friendlyDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

/**
 * TimeTracking
 *
 * - Select a Space (dropdown modal)
 * - Enter Task name
 * - Start / Pause / Reset / Save
 * - Sessions are saved in AsyncStorage and associated with space_id
 */
export default function TimeTracking({ navigation }) {
  const [taskName, setTaskName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const [spaces, setSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [spaceModalVisible, setSpaceModalVisible] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null); // null => All Spaces

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  /* --- Fetch spaces from supabase (similar logic to Home.jsx) --- */
  const fetchSpaces = useCallback(async () => {
    setLoadingSpaces(true);
    try {
      let query = supabase
        .from("spaces")
        .select("*")
        .order("created_at", { ascending: false });

      // attempt to include current user's spaces by default if session available
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        query = query.eq("owner_id", sessionData.session.user.id);
      } else {
        query = query.is("owner_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSpaces(data || []);
      // keep current selection if still valid, otherwise choose first (most recent) or null
      setSelectedSpaceId((prev) => {
        if (prev && data?.some((s) => String(s.id) === String(prev))) return prev;
        return data?.[0]?.id ?? null;
      });
    } catch (err) {
      console.warn("Failed to fetch spaces:", err.message || err);
      setSpaces([]);
      setSelectedSpaceId(null);
    } finally {
      setLoadingSpaces(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
    // subscribe to auth changes to refetch when user changes (optional)
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      fetchSpaces();
    });
    return () => {
      try {
        listener?.data?.subscription?.unsubscribe?.();
      } catch (e) {}
    };
  }, [fetchSpaces]);

  const selectedSpaceLabel = (() => {
    if (!selectedSpaceId) return "All Spaces";
    const sp = spaces.find((s) => String(s.id) === String(selectedSpaceId));
    if (!sp) return String(selectedSpaceId);
    return sp.name || sp.title || sp.label || `Space ${sp.id}`;
  })();

  /* --- Timer logic --- */
  useEffect(() => {
    if (isRunning) {
      // use interval every 1 second
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleStartPause = () => {
    if (!isRunning && taskName.trim().length === 0) {
      Alert.alert("Add a task name", "Please enter a task name before starting the timer.");
      return;
    }
    setIsRunning((v) => !v);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  /* --- Sessions storage (AsyncStorage) --- */
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSessions(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.warn("Failed to load sessions:", err);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const persistSessions = useCallback(async (newSessions) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    } catch (err) {
      console.warn("Failed to save sessions:", err);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /* Save session locally (attached to selected space) */
  const handleSaveSession = async () => {
    if (elapsed === 0) {
      Alert.alert("No time tracked", "Track some time before saving a session.");
      return;
    }
    const name = taskName.trim() || "Untitled task";
    const session = {
      id: Date.now().toString(),
      name,
      seconds: elapsed,
      date: new Date().toISOString(),
      space_id: selectedSpaceId ?? null,
      space_label: selectedSpaceId
        ? (spaces.find((s) => String(s.id) === String(selectedSpaceId))?.name ||
           spaces.find((s) => String(s.id) === String(selectedSpaceId))?.title ||
           "")
        : null,
    };

    const updated = [session, ...sessions];
    setSessions(updated);
    await persistSessions(updated);

    // reset timer and input
    setIsRunning(false);
    setElapsed(0);
    setTaskName("");
  };

  const handleDeleteSession = async (id) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    await persistSessions(filtered);
  };

  /* Filter sessions by selected space (if null show all) */
  const visibleSessions = sessions.filter((s) => {
    if (!selectedSpaceId) return true;
    return String(s.space_id) === String(selectedSpaceId);
  });

  const renderSession = ({ item }) => {
    return (
      <View style={styles.sessionCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.sessionMeta}>
            {formatDuration(item.seconds)} · {friendlyDate(item.date)}
            {item.space_label ? ` · ${item.space_label}` : item.space_id ? ` · Space ${item.space_id}` : ""}
          </Text>
        </View>

        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              // Copy duration to clipboard (simple feedback)
              try {
                // navigator.clipboard only on web; many apps use Clipboard API,
                // but to avoid extra dependency warnings we use Alert to show duration
                Alert.alert("Duration", formatDuration(item.seconds));
              } catch (e) {
                Alert.alert("Duration", formatDuration(item.seconds));
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.iconText}>📋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { marginLeft: 8 }]}
            onPress={() =>
              Alert.alert("Delete session", "Delete this session?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDeleteSession(item.id) },
              ])
            }
            activeOpacity={0.85}
          >
            <Text style={styles.iconText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* UI for space selection modal (similar to Home's space modal) */
  const renderSpaceModal = () => (
    <Modal visible={spaceModalVisible} transparent animationType="fade" onRequestClose={() => setSpaceModalVisible(false)}>
      <View style={styles.spaceModalOverlay}>
        <TouchableOpacity style={styles.spaceModalBackdrop} activeOpacity={1} onPress={() => setSpaceModalVisible(false)} />
        <View style={styles.spaceModalCard}>
          <View style={styles.spaceModalHeader}>
            <Text style={styles.spaceModalTitle}>Select Space</Text>
            <TouchableOpacity style={styles.spaceModalClose} onPress={() => setSpaceModalVisible(false)}>
              <Text style={styles.spaceModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.spaceOptionsContainer}>
            <TouchableOpacity
              style={[styles.spaceOption, !selectedSpaceId && styles.spaceOptionActive]}
              onPress={() => {
                setSelectedSpaceId(null);
                setSpaceModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.spaceOptionText}>All Spaces</Text>
              {!selectedSpaceId && <Text style={styles.spaceOptionCheck}>✓</Text>}
            </TouchableOpacity>

            {loadingSpaces ? (
              <View style={{ padding: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : spaces.length === 0 ? (
              <View style={styles.spaceEmptyState}>
                <Text style={styles.spaceEmptyText}>No spaces yet. Create spaces in the Spaces screen.</Text>
              </View>
            ) : (
              spaces.map((space, idx) => {
                const isActive = String(space.id) === String(selectedSpaceId);
                const label = space.name || space.title || space.label || `Space ${idx + 1}`;
                return (
                  <TouchableOpacity
                    key={space.id}
                    style={[styles.spaceOption, isActive && styles.spaceOptionActive]}
                    onPress={() => {
                      setSelectedSpaceId(space.id);
                      setSpaceModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.spaceOptionText}>{label}</Text>
                    {isActive && <Text style={styles.spaceOptionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
            {/* Header (Same as Spaces.jsx) */}
        <View style={styles.header}>
        <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
        >
            <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Time Tracking</Text>
        </View>

        {/* Right side button placeholder (optional) */}
        <View style={{ width: 40 }} />
        </View>


      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.spaceSelector} onPress={() => setSpaceModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.spaceSelectorText}>{selectedSpaceLabel}</Text>
          <Text style={styles.spaceSelectorChevron}>▾</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.refreshSpaces}
          onPress={() => fetchSpaces()}
          activeOpacity={0.85}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity> */}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Task name</Text>
        <TextInput
          value={taskName}
          onChangeText={setTaskName}
          placeholder="e.g., Write docs, Fix bug #42"
          placeholderTextColor="#6b7280"
          style={styles.input}
          editable={!isRunning}
        />

        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={handleStartPause}
            activeOpacity={0.85}
            style={[styles.controlButton, { backgroundColor: isRunning ? "#334155" : ACCENT }]}
          >
            <Text style={[styles.controlText, { color: isRunning ? "#cbd5e1" : "#041014" }]}>
              {isRunning ? "Pause" : "Start"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReset} activeOpacity={0.85} style={styles.ghostButton}>
            <Text style={styles.ghostText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSaveSession} activeOpacity={0.85} style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Sessions {selectedSpaceId ? `(space: ${selectedSpaceLabel})` : ""}</Text>

      {loadingSessions ? (
        <View style={{ padding: 18 }}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : visibleSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No sessions yet in this space.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleSessions}
          keyExtractor={(i) => i.id}
          renderItem={renderSession}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {renderSpaceModal()}
    </View>
  );
}

/* Styles (matches app dark theme + accent) */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    backgroundColor: "#060606",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 50,
    paddingBottom: 20,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  
  backButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
  },
  
  headerContent: {
    flex: 1,
  },
  
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  spaceSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  spaceSelectorText: {
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  spaceSelectorChevron: {
    color: "#94a3b8",
    marginLeft: 8,
  },
  refreshSpaces: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.06)",
  },
  refreshText: {
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "rgba(15,15,15,0.72)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 18,
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    color: "#e6eef2",
    marginBottom: 16,
  },
  timerRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  timerText: {
    color: "#e6eef2",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  controlText: {
    fontWeight: "800",
    fontSize: 15,
  },
  ghostButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  ghostText: {
    color: "#94a3b8",
    fontWeight: "700",
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
  },
  saveText: {
    color: "#bbf7d0",
    fontWeight: "800",
  },
  sectionLabel: {
    color: "#cbd5f5",
    fontSize: 13,
    letterSpacing: 1.2,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  emptyState: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.06)",
  },
  emptyText: {
    color: "#94a3b8",
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,15,15,0.6)",
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.06)",
  },
  sessionName: {
    color: "#f8fafc",
    fontWeight: "800",
    fontSize: 14,
  },
  sessionMeta: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
  sessionActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.06)",
  },
  iconText: {
    fontSize: 18,
  },

  /* Space modal styles (borrowed from Home/Spaces) */
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
    maxHeight: "70%",
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
  },
});
