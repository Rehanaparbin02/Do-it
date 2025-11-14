// NoteFormModal.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabaseClient";

const categories = [
  { id: "urgent_important", label: "Urgent & Important", emoji: "🔴", color: "#ef4444" },
  { id: "urgent_unimportant", label: "Urgent & Unimportant", emoji: "🟠", color: "#f59e0b" },
  { id: "not_urgent_important", label: "Not Urgent & Important", emoji: "🔵", color: "#3b82f6" },
  { id: "not_urgent_unimportant", label: "Not Urgent & Unimportant", emoji: "🟣", color: "#8b5cf6" },
];

export default function NoteFormModal({
  visible,
  title = "",
  content = "",
  attachments = { photo: [], video: [], pdf: [], audio: [] },
  editingNoteId = null,
  loading = false,
  selectedCategory = null,
  onTitleChange,
  onContentChange,
  onCategoryChange,
  onSave, // now expects payload: ({ title, content, category, attachments, space_id })
  onCancel,
  onShowAttachmentModal,
}) {
  const totalAttachments =
    attachments.photo.length + attachments.video.length + attachments.pdf.length + attachments.audio.length;

  const [localCategory, setLocalCategory] = useState(selectedCategory || "not_urgent_unimportant");
  const [localTitle, setLocalTitle] = useState(title || "");
  const [localContent, setLocalContent] = useState(content || "");
  const [spaces, setSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  useEffect(() => {
    setLocalCategory(selectedCategory || "not_urgent_unimportant");
  }, [selectedCategory, visible]);

  useEffect(() => {
    setLocalTitle(title || "");
    setLocalContent(content || "");
  }, [title, content, visible]);

  // fetch spaces for the chooser
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSpaces(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let query = supabase.from("spaces").select("id,name").order("created_at", { ascending: false });
        if (sessionData?.session?.user) query = query.eq("owner_id", sessionData.session.user.id);
        else query = query.is("owner_id", null);
        const { data, error } = await query;
        if (error) throw error;
        if (!mounted) return;
        setSpaces(data || []);
      } catch (err) {
        console.warn("Failed to load spaces for note modal:", err);
        if (!mounted) return;
        setSpaces([]);
      } finally {
        if (mounted) setLoadingSpaces(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCategorySelect = (categoryId) => {
    setLocalCategory(categoryId);
    onCategoryChange?.(categoryId);
  };

  // This function calls onSave with payload. Caller (CalendarView) will handle DB insert.
  const handleSavePressed = async () => {
    const payload = {
      title: localTitle.trim() || "Untitled note",
      content: localContent,
      category: localCategory,
      attachments,
      space_id: selectedSpaceId ?? null,
    };

    // If parent provided onSave, call it and allow parent to handle DB insert
    if (onSave) {
      try {
        await onSave(payload);
      } catch (err) {
        // bubble up error to user
        Alert.alert("Save failed", err.message || "Could not save note");
        return;
      }
    } else {
      // fallback: insert directly if no onSave handler
      try {
        await supabase.from("notes").insert({
          title: payload.title,
          content: payload.content,
          category: payload.category,
          space_id: payload.space_id,
        });
      } catch (err) {
        Alert.alert("Save failed", err.message || "Could not save note");
        return;
      }
    }

    // Close modal after successful save
    onCancel?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.formModalOverlay}>
        <View style={styles.formModalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.sectionTitle}>{editingNoteId ? "✏️ Edit Note" : "✨ New Note"}</Text>
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>Organize your tasks with smart categorization</Text>
            </View>

            <View style={styles.formCard}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📝 Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter note title..."
                  placeholderTextColor="#666"
                  value={localTitle}
                  onChangeText={(t) => {
                    setLocalTitle(t);
                    onTitleChange?.(t);
                  }}
                />
              </View>

              {/* Content */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>💭 Content</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Write your thoughts here..."
                  placeholderTextColor="#666"
                  value={localContent}
                  multiline
                  onChangeText={(t) => {
                    setLocalContent(t);
                    onContentChange?.(t);
                  }}
                />
              </View>

              {/* Space chooser */}
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.inputLabel}>📂 Space</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <TouchableOpacity
                    onPress={() => setSelectedSpaceId(null)}
                    style={[
                      styles.spaceBadge,
                      !selectedSpaceId && { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)" },
                    ]}
                  >
                    <Text style={[styles.spaceBadgeText, !selectedSpaceId && { color: "#22c55e", fontWeight: "800" }]}>
                      No space
                    </Text>
                  </TouchableOpacity>

                  {loadingSpaces ? (
                    <ActivityIndicator size="small" color="#22c55e" />
                  ) : spaces.length === 0 ? (
                    <Text style={{ color: "#777" }}>No spaces found</Text>
                  ) : (
                    spaces.map((s) => {
                      const active = String(s.id) === String(selectedSpaceId);
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => setSelectedSpaceId(s.id)}
                          style={[
                            styles.spaceBadge,
                            active && { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)" },
                          ]}
                        >
                          <Text style={[styles.spaceBadgeText, active && { color: "#22c55e", fontWeight: "800" }]}>
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>

              {/* Category */}
              <View style={styles.categorySection}>
                <Text style={styles.categoryTitle}>🎯 Priority Category</Text>
                <Text style={styles.categorySubtitle}>Based on Eisenhower Matrix</Text>

                <View style={styles.categoriesGrid}>
                  {categories.map((category) => {
                    const isSelected = localCategory === category.id;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryCard,
                          isSelected && { backgroundColor: `${category.color}20`, borderColor: category.color, borderWidth: 2 },
                        ]}
                        onPress={() => handleCategorySelect(category.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.categoryCardContent}>
                          <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                          <Text style={[styles.categoryLabel, isSelected && { color: category.color, fontWeight: "700" }]} numberOfLines={2}>
                            {category.label}
                          </Text>
                          {isSelected && (
                            <View style={[styles.checkmark, { backgroundColor: category.color }]}>
                              <Text style={styles.checkmarkText}>✓</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Attachments */}
              <View style={styles.attachmentSection}>
                <TouchableOpacity activeOpacity={0.8} style={styles.attachButton} onPress={onShowAttachmentModal}>
                  <Text style={styles.attachIcon}>📎</Text>
                  <View style={styles.attachTextContainer}>
                    <Text style={styles.attachText}>Add Attachment</Text>
                    <Text style={styles.attachSubtext}>Photos, videos, documents & audio</Text>
                  </View>
                </TouchableOpacity>

                {totalAttachments > 0 && (
                  <View style={styles.attachmentPreview}>
                    <View style={styles.attachmentHeader}>
                      <Text style={styles.attachmentTitle}>📁 Attachments ({totalAttachments})</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.saveButton, loading && { opacity: 0.6 }]}
                  onPress={handleSavePressed}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Text style={styles.saveButtonIcon}>{editingNoteId ? "💾" : "✨"}</Text>
                      <Text style={styles.saveButtonText}>{editingNoteId ? "Update Note" : "Create Note"}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButtonNew} onPress={onCancel}>
                  <Text style={styles.cancelButtonTextNew}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* Reuse your existing styles from the file (omitted here for brevity) */
const styles = StyleSheet.create({
  /* copy your existing styles from the NoteFormModal file */

  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "flex-end",
  },

  formModalCard: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "95%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },

  scrollContainer: { paddingBottom: 30 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 28,
    letterSpacing: -0.5,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(251, 121, 121, 0.87)",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#ffffffff",
    fontSize: 18,
    fontWeight: "600",
  },

  subtitle: { color: "#666", fontSize: 14, fontWeight: "500" },

  formCard: { padding: 24 },

  inputGroup: { marginBottom: 20 },

  inputLabel: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  multiline: { height: 120, textAlignVertical: "top" },

  categorySection: { marginBottom: 24 },

  categoryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  categorySubtitle: { color: "#666", fontSize: 12, marginBottom: 16 },

  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  categoryCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 100,
  },

  categoryCardContent: {
    flex: 1,
    justifyContent: "space-between",
  },

  categoryEmoji: { fontSize: 28, marginBottom: 8 },

  categoryLabel: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  checkmarkText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  attachmentSection: { marginBottom: 24 },

  attachButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderStyle: "dashed",
  },

  attachIcon: { fontSize: 24, marginRight: 12 },

  attachTextContainer: { flex: 1 },

  attachText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },

  attachSubtext: { color: "#666", fontSize: 12 },

  attachmentPreview: {
    marginTop: 12,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },

  attachmentHeader: { marginBottom: 8 },

  attachmentTitle: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
  },

  actionButtons: { gap: 12 },

  saveButton: {
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  saveButtonIcon: { fontSize: 18 },

  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.3,
  },

  cancelButtonNew: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  cancelButtonTextNew: {
    color: "#999",
    fontSize: 16,
    fontWeight: "600",
  },

  /* Space badges (simple) */
  spaceBadge: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },

  spaceBadgeText: { color: "#ccc", fontWeight: "600" },
});

