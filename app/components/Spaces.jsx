// Spaces.jsx (updated with navigation to filtered notes)
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import { CustomAlert } from "./CustomAlert";

export default function Spaces({ navigation, route }) {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceIcon, setSpaceIcon] = useState("📁");
  const [spaceColor, setSpaceColor] = useState("#22c55e");
  const [saving, setSaving] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const availableIcons = ["📁", "🚀", "💼", "🎯", "📚", "🏠", "💡", "🎨", "⚙️", "🌟"];
  const availableColors = [
    "#22c55e", // green
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  // Use the enhanced view that includes note counts
  const fetchSpacesWithCounts = useCallback(async (ownerId) => {
    try {
      setLoading(true);
      let query = supabase
        .from("spaces_with_note_count")
        .select("*")
        .order("created_at", { ascending: false });

      if (ownerId) query = query.eq("owner_id", ownerId);
      else query = query.is("owner_id", null);

      const { data, error } = await query;
      if (error) throw error;

      setSpaces(data || []);
    } catch (err) {
      console.error("Failed to fetch spaces:", err);
      CustomAlert.alert("Error", err.message || "Failed to load spaces.", [{ text: "OK" }]);
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Session Error:", error);
      if (data?.session?.user) {
        setUser(data.session.user);
        fetchSpacesWithCounts(data.session.user.id);
      } else {
        fetchSpacesWithCounts(null);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchSpacesWithCounts(session.user.id);
      } else {
        fetchSpacesWithCounts(null);
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [fadeAnim, fetchSpacesWithCounts]);

  // Refresh spaces when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchSpacesWithCounts(user?.id);
    });
    return unsubscribe;
  }, [navigation, user, fetchSpacesWithCounts]);

  const handleCreateSpace = async () => {
    if (!spaceName.trim()) {
      CustomAlert.alert("Validation", "Space name cannot be empty.", [{ text: "OK" }]);
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase.from("spaces").insert([
        {
          owner_id: user?.id || null,
          name: spaceName.trim(),
          description: spaceDescription.trim() || null,
          icon: spaceIcon,
          color: spaceColor,
        },
      ]).select();

      if (error) throw error;

      CustomAlert.alert("Success", "Space created successfully!", [{ text: "OK" }]);
      resetFormFields();
      setShowCreateModal(false);
      fetchSpacesWithCounts(user?.id);
    } catch (err) {
      CustomAlert.alert("Error", err.message || "Failed to create space.", [{ text: "OK" }]);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSpace = async () => {
    if (!spaceName.trim()) {
      CustomAlert.alert("Validation", "Space name cannot be empty.", [{ text: "OK" }]);
      return;
    }

    if (!editingSpace) return;

    try {
      setSaving(true);
      let query = supabase
        .from("spaces")
        .update({
          name: spaceName.trim(),
          description: spaceDescription.trim() || null,
          icon: spaceIcon,
          color: spaceColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSpace.id);

      if (user) query = query.eq("owner_id", user.id);
      else query = query.is("owner_id", null);

      const { error } = await query;
      if (error) throw error;

      CustomAlert.alert("Success", "Space updated successfully!", [{ text: "OK" }]);
      resetFormFields();
      setEditingSpace(null);
      setShowEditModal(false);
      fetchSpacesWithCounts(user?.id);
    } catch (err) {
      CustomAlert.alert("Error", err.message || "Failed to update space.", [{ text: "OK" }]);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpace = (space) => {
    const noteCount = space.note_count || 0;
    Alert.alert(
      "Delete Space",
      `Are you sure you want to delete "${space.name}"? ${
        noteCount > 0
          ? `This space contains ${noteCount} note${noteCount > 1 ? "s" : ""}. The notes will not be deleted but will become unassigned.`
          : "This space is empty."
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              let query = supabase.from("spaces").delete().eq("id", space.id);

              if (user) query = query.eq("owner_id", user.id);
              else query = query.is("owner_id", null);

              const { error } = await query;
              if (error) throw error;

              CustomAlert.alert("Success", "Space deleted successfully.", [{ text: "OK" }]);
              fetchSpacesWithCounts(user?.id);
            } catch (err) {
              CustomAlert.alert("Error", err.message || "Failed to delete space.", [{ text: "OK" }]);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSpacePress = (space) => {
    // Navigate back to Home with the selected space
    navigation.navigate('Home', { selectedSpaceId: space.id });
  };

  const openEditModal = (space) => {
    setEditingSpace(space);
    setSpaceName(space.name || "");
    setSpaceDescription(space.description || "");
    setSpaceIcon(space.icon || "📁");
    setSpaceColor(space.color || "#22c55e");
    setShowEditModal(true);
  };

  const resetFormFields = () => {
    setSpaceName("");
    setSpaceDescription("");
    setSpaceIcon("📁");
    setSpaceColor("#22c55e");
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingSpace(null);
    resetFormFields();
  };

  if (loading && spaces.length === 0) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Spaces</Text>
          <Text style={styles.headerSubtitle}>{spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetFormFields();
            setShowCreateModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Spaces List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {spaces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No Spaces Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first space to organize your notes by project or category
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                resetFormFields();
                setShowCreateModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>+ Create Space</Text>
            </TouchableOpacity>
          </View>
        ) : (
          spaces.map((space) => {
            const noteCount = space.note_count || 0;
            const icon = space.icon || "📁";
            const color = space.color || "#22c55e";

            return (
              <TouchableOpacity
                key={space.id}
                style={styles.spaceCard}
                activeOpacity={0.9}
                onPress={() => handleSpacePress(space)}
              >
                <View style={styles.spaceCardContent}>
                  <View style={styles.spaceIconContainer}>
                    <View style={[styles.spaceIcon, { backgroundColor: `${color}20` }]}>
                      <Text style={styles.spaceIconText}>{icon}</Text>
                    </View>
                  </View>
                  <View style={styles.spaceInfo}>
                    <Text style={styles.spaceName}>{space.name}</Text>
                    {space.description && (
                      <Text style={styles.spaceDescription} numberOfLines={1}>
                        {space.description}
                      </Text>
                    )}
                    <Text style={styles.spaceMeta}>
                      {noteCount} {noteCount === 1 ? "note" : "notes"}
                    </Text>
                  </View>
                  <View style={styles.spaceActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditModal(space);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteSpace(space);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal || showEditModal}
        transparent
        animationType="fade"
        onRequestClose={closeModals}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModals}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {showEditModal ? "Edit Space" : "Create New Space"}
            </Text>
            
            {/* Space Name */}
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter space name"
              placeholderTextColor="#666"
              value={spaceName}
              onChangeText={setSpaceName}
              autoFocus
            />

            {/* Space Description */}
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Add a description..."
              placeholderTextColor="#666"
              value={spaceDescription}
              onChangeText={setSpaceDescription}
              multiline
              numberOfLines={3}
            />

            {/* Icon Picker */}
            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {availableIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    spaceIcon === icon && styles.iconOptionActive,
                  ]}
                  onPress={() => setSpaceIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Picker */}
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {availableColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    spaceColor === color && styles.colorOptionActive,
                  ]}
                  onPress={() => setSpaceColor(color)}
                >
                  {spaceColor === color && (
                    <Text style={styles.colorCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeModals}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={showEditModal ? handleEditSpace : handleCreateSpace}
                activeOpacity={0.8}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>
                    {showEditModal ? "Save" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
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
  headerSubtitle: {
    color: "#999",
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    minHeight: 400,
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
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  spaceCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: "rgb(15, 15, 15)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    overflow: "hidden",
  },
  spaceCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  spaceIconContainer: {
    marginRight: 16,
  },
  spaceIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  spaceIconText: {
    fontSize: 26,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  spaceDescription: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 4,
  },
  spaceMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  spaceActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  actionButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: "#0f0f0f",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxHeight: '90%',
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  inputLabel: {
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    color: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionActive: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  iconOptionText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: "#fff",
  },
  colorCheckmark: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalButtonCancelText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonSave: {
    backgroundColor: "#f59e0b",
  },
  modalButtonSaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});