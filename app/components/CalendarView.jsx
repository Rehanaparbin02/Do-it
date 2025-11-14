// CalendarView.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

const ACCENT = "#22c55e";
const LOCAL_EVENTS_KEY = "calendar_events_v1";

/* ---------- Small helpers ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const formatMonthLabel = (d) => d.toLocaleString(undefined, { month: "long", year: "numeric" });
const formatTimeShort = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const minutesToHoursMin = (mins) => {
  if (!mins) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return `${h}h${r > 0 ? ` ${r}m` : ""}`;
};

// simple deep-ish equality for arrays (used to avoid redundant setState)
const sameArray = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return false;
  }
};

/* ---------- Date helpers ---------- */
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const daysInMonth = (d) => endOfMonth(d).getDate();

/* ---------- Component ---------- */
export default function CalendarView({ navigation }) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [loading, setLoading] = useState(true);

  // Data
  const [noteEvents, setNoteEvents] = useState([]); // derived from notes table
  const [localEvents, setLocalEvents] = useState([]); // user local events (AsyncStorage)
  const [spacesMap, setSpacesMap] = useState({});
  const [loadingSpaces, setLoadingSpaces] = useState(false);

  // modal / form for local events
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [timeStr, setTimeStr] = useState("09:00");
  const [durationMin, setDurationMin] = useState("30");
  const [saving, setSaving] = useState(false);

  /* ---------- Calendar grid memo ---------- */
  const monthGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const totalDays = daysInMonth(currentMonth);
    const firstWeekday = start.getDay(); // 0..6 (Sun..Sat)
    const grid = [];
    let week = [];

    // previous month's trailing days
    const prevMonthLastDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    for (let i = 0; i < firstWeekday; i++) {
      const dayNum = prevMonthLastDate - (firstWeekday - 1 - i);
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, dayNum);
      week.push({ date: d, inMonth: false, iso: isoDate(d) });
    }

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      week.push({ date: d, inMonth: true, iso: isoDate(d) });
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // trailing next month days
    let nextDay = 1;
    while (week.length > 0 && week.length < 7) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, nextDay++);
      week.push({ date: d, inMonth: false, iso: isoDate(d) });
    }
    if (week.length === 7) grid.push(week);
    return grid;
  }, [currentMonth]);

  /* ---------- Storage helpers ---------- */
  const loadLocalEvents = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_EVENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(parsed) ? parsed : [];
      if (!sameArray(normalized, localEvents)) {
        setLocalEvents(normalized);
      }
    } catch (err) {
      console.warn("Failed to load local events:", err);
      if (!sameArray([], localEvents)) setLocalEvents([]);
    }
  }, [localEvents]);

  const persistLocalEvents = useCallback(async (arr) => {
    try {
      await AsyncStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(arr));
    } catch (err) {
      console.warn("Failed to persist local events:", err);
    }
  }, []);

  /* ---------- Supabase: fetch spaces (labels) ---------- */
  const fetchSpaces = useCallback(async () => {
    setLoadingSpaces(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let query = supabase.from("spaces").select("id,name").order("created_at", { ascending: false });
      if (sessionData?.session?.user) query = query.eq("owner_id", sessionData.session.user.id);
      else query = query.is("owner_id", null);

      const { data, error } = await query;
      if (error) throw error;
      const map = {};
      (data || []).forEach((s) => {
        map[String(s.id)] = s.name || s.title || `Space ${s.id}`;
      });
      // update only if changed
      if (!sameArray(map, spacesMap)) {
        setSpacesMap(map);
      }
    } catch (err) {
      console.warn("Failed to fetch spaces:", err);
    } finally {
      setLoadingSpaces(false);
    }
  }, [spacesMap]);

  /* ---------- Supabase: fetch notes and map to events ---------- */
  const fetchNotesAsEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("id,title,content,created_at,space_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((n) => {
        const createdAt = n.created_at ? new Date(n.created_at) : new Date();
        return {
          id: `note-${n.id}`, // keep distinct ids
          source: "note",
          note_id: n.id,
          title: n.title || "Untitled note",
          notes: n.content || "",
          date: isoDate(createdAt),
          startISO: n.created_at ? new Date(n.created_at).toISOString() : null,
          durationMin: 0,
          space_id: n.space_id ?? null,
          space_label: n.space_id ? (spacesMap[String(n.space_id)] || null) : null,
        };
      });

      if (!sameArray(mapped, noteEvents)) {
        setNoteEvents(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch notes:", err);
      if (!sameArray([], noteEvents)) setNoteEvents([]);
    }
  }, [spacesMap, noteEvents]);

  /* ---------- Combined events (memoized & stable order) ---------- */
  const combinedEvents = useMemo(() => {
    const arr = [...noteEvents, ...localEvents];
    // stable sort: by date descending (newest first), then by start time (if any), else id
    arr.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1; // newer dates first
      if (a.startISO && b.startISO) return new Date(b.startISO) - new Date(a.startISO);
      return a.id.localeCompare(b.id);
    });
    return arr;
  }, [noteEvents, localEvents]);

  /* ---------- Events for selected date ---------- */
  const eventsForSelected = useMemo(() => {
    const list = combinedEvents
      .filter((ev) => ev.date === selectedDate)
      .sort((a, b) => {
        if (a.startISO && b.startISO) return new Date(a.startISO) - new Date(b.startISO);
        return a.id.localeCompare(b.id);
      });
    return list;
  }, [combinedEvents, selectedDate]);

  /* ---------- refreshAll orchestrates fetching + loading flag ---------- */
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await fetchSpaces();
      await fetchNotesAsEvents();
      await loadLocalEvents();
    } catch (err) {
      console.warn("Refresh failed", err);
    } finally {
      setLoading(false);
    }
  }, [fetchSpaces, fetchNotesAsEvents, loadLocalEvents]);

  useEffect(() => {
    refreshAll();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, _s) => {
      refreshAll();
    });
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, [refreshAll]);

  /* ---------- Month nav ---------- */
  const goPrevMonth = useCallback(() => {
    setCurrentMonth((cm) => new Date(cm.getFullYear(), cm.getMonth() - 1, 1));
  }, []);
  const goNextMonth = useCallback(() => {
    setCurrentMonth((cm) => new Date(cm.getFullYear(), cm.getMonth() + 1, 1));
  }, []);

  /* ---------- Local event CRUD (memoized handlers) ---------- */
  const openCreateLocal = useCallback(
    (iso) => {
      setEditingEvent(null);
      setTitle("");
      setNotes("");
      setTimeStr("09:00");
      setDurationMin("30");
      setSelectedDate(iso);
      setModalVisible(true);
    },
    [setModalVisible, setSelectedDate]
  );

  const openEditLocal = useCallback(
    (ev) => {
      if (!ev) return;
      if (ev.source === "note") {
        Alert.alert("Note event", "This event is derived from a note. Edit the note from Notes screen.");
        return;
      }
      setEditingEvent(ev);
      setTitle(ev.title || "");
      setNotes(ev.notes || "");
      setTimeStr(ev.startISO ? new Date(ev.startISO).toISOString().substr(11, 5) : "09:00");
      setDurationMin(String(ev.durationMin || 30));
      setSelectedDate(ev.date);
      setModalVisible(true);
    },
    [setModalVisible, setSelectedDate]
  );

  const handleSaveLocal = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please provide a title.");
      return;
    }
    setSaving(true);
    try {
      let startISO = null;
      if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
        const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
        const parts = selectedDate.split("-");
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        startISO = new Date(y, m, day, hh, mm).toISOString();
      }
      const dur = Number(durationMin) || 30;

      if (editingEvent) {
        const updated = localEvents.map((e) =>
          e.id === editingEvent.id
            ? { ...e, title: title.trim(), notes: notes.trim(), startISO, durationMin: dur, date: selectedDate }
            : e
        );
        if (!sameArray(updated, localEvents)) {
          setLocalEvents(updated);
          await persistLocalEvents(updated);
        }
      } else {
        const ev = {
          id: `local-${Date.now().toString()}`,
          source: "local",
          title: title.trim(),
          notes: notes.trim(),
          date: selectedDate,
          startISO,
          durationMin: dur,
        };
        const updated = [ev, ...localEvents];
        setLocalEvents(updated);
        await persistLocalEvents(updated);
      }
      setModalVisible(false);
    } catch (err) {
      console.warn("Save local failed", err);
      Alert.alert("Error", "Could not save event.");
    } finally {
      setSaving(false);
    }
  }, [title, notes, timeStr, durationMin, editingEvent, localEvents, selectedDate, persistLocalEvents]);

  const handleDeleteLocal = useCallback(
    async (ev) => {
      if (!ev) return;
      if (ev.source === "note") {
        Alert.alert("Cannot delete", "This event is derived from a note and cannot be deleted here.");
        return;
      }
      Alert.alert("Delete", `Delete "${ev.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const filtered = localEvents.filter((e) => e.id !== ev.id);
            setLocalEvents(filtered);
            await persistLocalEvents(filtered);
          },
        },
      ]);
    },
    [localEvents, persistLocalEvents]
  );

  /* ---------- Render item (memoized) ---------- */
  const renderItem = useCallback(
    ({ item }) => {
      return (
        <TouchableOpacity style={styles.eventCard} onPress={() => (item.source === "note" ? Alert.alert("Note", "Open note from Notes screen to edit/view.") : openEditLocal(item))} activeOpacity={0.85}>
          <View style={styles.eventCardLeft}>
            <Text style={styles.eventTime}>{item.startISO ? formatTimeShort(new Date(item.startISO)) : item.source === "note" ? "note" : "—"}</Text>
          </View>

          <View style={styles.eventCardBody}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventMeta}>
              {item.source === "note" ? "Note" : item.startISO ? `${formatTimeShort(new Date(item.startISO))} · ` : ""}
              {item.durationMin ? minutesToHoursMin(item.durationMin) : ""}
              {item.space_label ? ` · ${item.space_label}` : ""}
            </Text>
            {item.notes ? <Text style={styles.eventNotes}>{item.notes}</Text> : null}
          </View>

          <View style={styles.eventCardActions}>
            <TouchableOpacity
              onPress={() => {
                if (item.source === "note") {
                  Alert.alert("Note", "Open note from Notes screen to edit/view.");
                } else {
                  openEditLocal(item);
                }
              }}
              style={styles.iconBtn}
            >
              <Text style={styles.iconText}>{item.source === "note" ? "📄" : "✏️"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDeleteLocal(item)} style={[styles.iconBtn, { marginTop: 8 }]}>
              <Text style={styles.iconText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [openEditLocal, handleDeleteLocal]
  );

  /* ---------- Render ---------- */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => openCreateLocal(selectedDate)} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Month nav + refresh */}
      <View style={styles.monthRow}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={goPrevMonth} activeOpacity={0.8}>
          <Text style={styles.monthNavText}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth)}</Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity style={styles.refreshBtn} onPress={refreshAll} activeOpacity={0.85}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.monthNavBtn} onPress={goNextMonth} activeOpacity={0.8}>
            <Text style={styles.monthNavText}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Week days header */}
      <View style={styles.weekdaysRow}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
          <Text key={wd} style={styles.weekdayText}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {monthGrid.map((week, wi) => (
          <View key={`w${wi}`} style={styles.weekRow}>
            {week.map((day) => {
              const { date, inMonth, iso } = day;
              const isToday = isoDate(new Date()) === iso;
              const isSelected = selectedDate === iso;
              const dayEventsCount = combinedEvents.filter((ev) => ev.date === iso).length;

              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.dayCell, !inMonth && styles.dayCellMuted, isSelected && styles.dayCellSelected]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDate(iso)}
                  onLongPress={() => openCreateLocal(iso)}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={[styles.dayNumber, !inMonth && styles.dayNumberMuted, isSelected && styles.dayNumberSelected]}>
                      {date.getDate()}
                    </Text>

                    {isToday && (
                      <View style={styles.todayPill}>
                        <Text style={styles.todayPillText}>today</Text>
                      </View>
                    )}

                    {dayEventsCount > 0 && (
                      <View style={styles.eventDotRow}>
                        {Array.from({ length: Math.min(dayEventsCount, 3) }).map((_, i) => (
                          <View key={i} style={styles.eventDot} />
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected date events */}
      <View style={styles.eventsHeaderRow}>
        <Text style={styles.eventsTitle}>Events · {selectedDate}</Text>
        <TouchableOpacity style={styles.quickAdd} onPress={() => openCreateLocal(selectedDate)} activeOpacity={0.85}>
          <Text style={styles.quickAddText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.eventsListWrap}>
        {loading ? (
          <View style={{ padding: 18 }}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : eventsForSelected.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No events on this day</Text>
            <Text style={styles.emptySubtitle}>Notes created on this day will appear here automatically.</Text>
          </View>
        ) : (
          <FlatList
            data={eventsForSelected}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            extraData={eventsForSelected}
            initialNumToRender={8}
            contentContainerStyle={{ paddingBottom: 120 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}
      </View>

      {/* Create / Edit Modal (local events only) */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.modalTitle}>{editingEvent ? "Edit event" : "New event"}</Text>

              <Text style={styles.formLabel}>Date</Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>{selectedDate}</Text>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => {
                    const todayIso = isoDate(new Date());
                    setSelectedDate(todayIso);
                  }}
                >
                  <Text style={styles.smallBtnText}>Today</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor="#6b7280" style={styles.input} />

              <Text style={styles.formLabel}>Start time (HH:MM)</Text>
              <TextInput
                value={timeStr}
                onChangeText={setTimeStr}
                placeholder="09:00"
                placeholderTextColor="#6b7280"
                style={styles.input}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
              />

              <Text style={styles.formLabel}>Duration (minutes)</Text>
              <TextInput value={String(durationMin)} onChangeText={setDurationMin} placeholder="30" placeholderTextColor="#6b7280" style={styles.input} keyboardType="numeric" />

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="Optional details" placeholderTextColor="#6b7280" style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} multiline />

              <View style={{ height: 12 }} />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity onPress={() => { setModalVisible(false); setEditingEvent(null); }} style={[styles.modalBtn, styles.modalBtnCancel]}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSaveLocal} style={[styles.modalBtn, styles.modalBtnSave]} disabled={saving}>
                  <Text style={styles.modalBtnSaveText}>{saving ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- Styles (dark, rounded, consistent) ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#060606"
},

  /* Header (matching Spaces.jsx) */
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 20, 
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
  addButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#22c55e", 
    alignItems: "center", 
    justifyContent: "center",
  },
  addButtonText: { 
    color: "#041014", 
    fontSize: 24, 
    fontWeight: "700",
  },

  /* Month row */
  monthRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  monthLabel: { 
    color: "#f8fafc", 
    fontSize: 16, 
    fontWeight: "700", 
    textAlign: "center",
  },
  monthNavBtn: { 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: "rgba(255,255,255,0.02)", 
    borderWidth: 1, 
    borderColor: "rgba(148,163,184,0.06)",
  },
  monthNavText: { color: "#94a3b8", fontSize: 16,
  },
  refreshBtn: { 
    marginRight: 10, 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: "rgba(255,255,255,0.02)", 
    borderWidth: 1, 
    borderColor: "rgba(148,163,184,0.06)",
  },
  refreshText: { 
    color: "#94a3b8",
    fontSize: 16,
  },

  /* weekdays */
  weekdaysRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    paddingHorizontal: 12, 
    marginTop: 8,
  },
  weekdayText: { 
    color: "#94a3b8", 
    fontSize: 12, 
    width: `${100 / 7}%`, 
    textAlign: "center", 
    fontWeight: "700",
  },

  /* grid */
  grid: { 
    paddingHorizontal: 6, 
    marginTop: 8,
  },
  weekRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 8,
  },
  dayCell: { 
    width: `${100 / 7}%`, 
    aspectRatio: 1, 
    borderRadius: 10, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "transparent",
  },
  dayCellMuted: { 
    opacity: 0.45,
  },
  dayCellSelected: { 
    backgroundColor: "rgba(34,197,94,0.14)", 
    borderWidth: 1, 
    borderColor: "rgba(34,197,94,0.26)",
  },
  dayNumber: { 
    color: "#e6eef2", 
    fontWeight: "700", 
    fontSize: 16,
  },
  dayNumberMuted: { 
    color: "#8b949e",
  },
  dayNumberSelected: { 
    color: "#bbf7d0",
  },
  todayPill: { 
    marginTop: 6, 
    backgroundColor: "rgba(34,197,94,0.18)", 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 8,
  },
  todayPillText: { 
    color: "#bbf7d0", 
    fontSize: 10, 
    fontWeight: "700",
  },
  eventDotRow: { 
    marginTop: 6, 
    flexDirection: "row", 
    gap: 4,
  },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginHorizontal: 2 },

  /* events list */
  eventsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  eventsTitle: { color: "#f8fafc", fontWeight: "800" },
  quickAdd: { backgroundColor: "rgba(34,197,94,0.12)", borderWidth: 1, borderColor: "rgba(34,197,94,0.22)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  quickAddText: { color: "#bbf7d0", fontWeight: "800" },
  eventsListWrap: { paddingHorizontal: 20, paddingTop: 6, flex: 1 },
  emptyState: { marginTop: 12, padding: 18, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(148,163,184,0.06)" },
  emptyTitle: { color: "#94a3b8", fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#6b7280" },

  eventCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "rgba(15,15,15,0.7)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(148,163,184,0.06)" },
  eventCardLeft: { width: 70, alignItems: "flex-start", marginRight: 8 },
  eventTime: { color: "#94a3b8", fontWeight: "700", fontSize: 13 },
  eventCardBody: { flex: 1 },
  eventTitle: { color: "#f8fafc", fontWeight: "800", fontSize: 15 },
  eventMeta: { color: "#94a3b8", marginTop: 6, fontSize: 12 },
  eventNotes: { color: "#94a3b8", marginTop: 8, fontSize: 13 },
  eventCardActions: { alignItems: "center", marginLeft: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.02)", alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 18 },

  /* modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBackdrop: { flex: 1 },
  modalCard: { backgroundColor: "#0f0f0f", padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", maxHeight: "75%" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  formLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  dateText: { color: "#fff", fontWeight: "800" },
  smallBtn: { backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  smallBtnText: { color: "#94a3b8", fontWeight: "700" },
  input: { backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(148,163,184,0.08)", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, color: "#e6eef2", marginBottom: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnCancel: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginRight: 8 },
  modalBtnCancelText: { color: "#999", fontWeight: "700" },
  modalBtnSave: { backgroundColor: ACCENT },
  modalBtnSaveText: { color: "#041014", fontWeight: "800" },
});
