// Settings.jsx - App Settings and User Profile
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Alert,
  Switch,
  Modal,
  TextInput,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import { CustomAlert } from "../components/CustomAlert";

export default function Settings({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Settings state
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoArchive, setAutoArchive] = useState(false);
  const [compactView, setCompactView] = useState(false);
  
  // Profile edit modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalNotes: 0,
    completedNotes: 0,
    archivedNotes: 0,
    favoriteNotes: 0,
    totalSpaces: 0,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    fetchUserData();
    fetchStats();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        setUser(sessionData.session.user);
        setDisplayName(sessionData.session.user.email?.split('@')[0] || "User");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      let notesQuery = supabase.from("notes").select("*", { count: "exact" });
      let spacesQuery = supabase.from("spaces").select("*", { count: "exact" });

      if (userId) {
        notesQuery = notesQuery.eq("user_id", userId);
        spacesQuery = spacesQuery.eq("owner_id", userId);
      } else {
        notesQuery = notesQuery.is("user_id", null);
        spacesQuery = spacesQuery.is("owner_id", null);
      }

      const { data: notes } = await notesQuery;
      const { data: spaces } = await spacesQuery;

      setStats({
        totalNotes: notes?.length || 0,
        completedNotes: notes?.filter(n => n.completed)?.length || 0,
        archivedNotes: notes?.filter(n => n.archived)?.length || 0,
        favoriteNotes: notes?.filter(n => n.favorite)?.length || 0,
        totalSpaces: spaces?.length || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.auth.signOut();
              if (error) throw error;

              CustomAlert.alert("Success", "Logged out successfully", [{ text: "OK" }]);
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (err) {
              CustomAlert.alert("Error", err.message || "Logout failed", [{ text: "OK" }]);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "⚠️ This will permanently delete your account and all your notes, spaces, and data. This action cannot be undone!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Type DELETE to confirm account deletion",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "I'm Sure",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setLoading(true);
                      
                      // Delete all user notes
                      await supabase
                        .from("notes")
                        .delete()
                        .eq("user_id", user.id);
                      
                      // Delete all user spaces
                      await supabase
                        .from("spaces")
                        .delete()
                        .eq("owner_id", user.id);
                      
                      // Sign out
                      await supabase.auth.signOut();
                      
                      CustomAlert.alert("Account Deleted", "Your account has been deleted.", [{ text: "OK" }]);
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    } catch (err) {
                      CustomAlert.alert("Error", err.message || "Failed to delete account", [{ text: "OK" }]);
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your notes and spaces. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete all notes
              await supabase
                .from("notes")
                .delete()
                .eq("user_id", user?.id);
              
              // Delete all spaces
              await supabase
                .from("spaces")
                .delete()
                .eq("owner_id", user?.id);
              
              CustomAlert.alert("Success", "All data cleared successfully", [{ text: "OK" }]);
              fetchStats();
            } catch (err) {
              CustomAlert.alert("Error", err.message || "Failed to clear data", [{ text: "OK" }]);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleExportData = () => {
    CustomAlert.alert(
      "Export Data",
      "Export functionality would typically save your notes as JSON or CSV file. This feature requires additional file system permissions.",
      [{ text: "OK" }]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Text style={styles.settingIconText}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (
        onPress && <Text style={styles.settingChevron}>›</Text>
      )}
    </TouchableOpacity>
  );

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderColor: `${color}40` }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{user?.email || "guest@notesapp.com"}</Text>
            </View>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setShowEditProfile(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileButtonText}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="📝"
              label="Total Notes"
              value={stats.totalNotes}
              color="#22c55e"
            />
            <StatCard
              icon="✅"
              label="Completed"
              value={stats.completedNotes}
              color="#3b82f6"
            />
            <StatCard
              icon="⭐"
              label="Favorites"
              value={stats.favoriteNotes}
              color="#facc15"
            />
            <StatCard
              icon="📦"
              label="Archived"
              value={stats.archivedNotes}
              color="#f59e0b"
            />
            <StatCard
              icon="📁"
              label="Spaces"
              value={stats.totalSpaces}
              color="#8b5cf6"
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Preferences</Text>
          
          {/* <SettingItem
            icon="🌙"
            title="Dark Mode"
            subtitle="Currently enabled"
            rightComponent={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#767577", true: "#22c55e" }}
                thumbColor={darkMode ? "#fff" : "#f4f3f4"}
              />
            }
          /> */}
          
          <SettingItem
            icon="🔔"
            title="Notifications"
            subtitle="Get reminded about your notes"
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#767577", true: "#22c55e" }}
                thumbColor={notifications ? "#fff" : "#f4f3f4"}
              />
            }
          />
          
          {/* <SettingItem
            icon="📦"
            title="Auto Archive"
            subtitle="Archive completed notes automatically"
            rightComponent={
              <Switch
                value={autoArchive}
                onValueChange={setAutoArchive}
                trackColor={{ false: "#767577", true: "#22c55e" }}
                thumbColor={autoArchive ? "#fff" : "#f4f3f4"}
              />
            }
          />
          
          <SettingItem
            icon="📱"
            title="Compact View"
            subtitle="Show more notes on screen"
            rightComponent={
              <Switch
                value={compactView}
                onValueChange={setCompactView}
                trackColor={{ false: "#767577", true: "#22c55e" }}
                thumbColor={compactView ? "#fff" : "#f4f3f4"}
              />
            }
          /> */}
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Data Management</Text>
          
          <SettingItem
            icon="📤"
            title="Export Data"
            subtitle="Save your notes as a file"
            onPress={handleExportData}
          />
          
          <SettingItem
            icon="🗑️"
            title="Clear All Data"
            subtitle="Delete all notes and spaces"
            onPress={handleClearAllData}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          
          <SettingItem
            icon="📱"
            title="App Version"
            subtitle="1.0.0"
          />
          
          <SettingItem
            icon="📄"
            title="Terms of Service"
            onPress={() => CustomAlert.alert("Terms", "Terms of Service would be displayed here", [{ text: "OK" }])}
          />
          
          <SettingItem
            icon="🔒"
            title="Privacy Policy"
            onPress={() => CustomAlert.alert("Privacy", "Privacy Policy would be displayed here", [{ text: "OK" }])}
          />
          
          {/* <SettingItem
            icon="💬"
            title="Help & Support"
            onPress={() => CustomAlert.alert("Support", "Contact support@notesapp.com for help", [{ text: "OK" }])}
          /> */}
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.logoutButtonIcon}>🚪</Text>
            <Text style={styles.logoutButtonText}>
              {loading ? "Logging out..." : "Logout"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.deleteAccountButtonIcon}>⚠️</Text>
            <Text style={styles.deleteAccountButtonText}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ by NotesApp Team</Text>
          <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowEditProfile(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowEditProfile(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Display Name</Text>
              <TextInput
                style={styles.modalInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                placeholderTextColor="#666"
              />
              
              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputDisabled]}
                value={user?.email || ""}
                editable={false}
                placeholderTextColor="#666"
              />
              <Text style={styles.modalHint}>Email cannot be changed</Text>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowEditProfile(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  CustomAlert.alert("Success", "Profile updated successfully", [{ text: "OK" }]);
                  setShowEditProfile(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
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
    paddingTop: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  profileAvatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  profileEmail: {
    color: "#999",
    fontSize: 14,
  },

  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  editProfileButtonText: {
    fontSize: 18,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
  },

  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },

  statLabel: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
  },

  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  settingIconText: {
    fontSize: 20,
  },

  settingContent: {
    flex: 1,
  },

  settingTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },

  settingSubtitle: {
    color: "#999",
    fontSize: 13,
  },

  settingChevron: {
    color: "#666",
    fontSize: 24,
    fontWeight: "300",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },

  logoutButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  logoutButtonText: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "700",
  },

  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },

  deleteAccountButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  deleteAccountButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },

  footerText: {
    color: "#666",
    fontSize: 14,
    marginBottom: 4,
  },

  footerSubtext: {
    color: "#555",
    fontSize: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  modalCard: {
    width: "90%",
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  modalClose: {
    position: "absolute",
    right: 16,
    top: 16,
  },

  modalCloseText: {
    color: "#fff",
    fontSize: 20,
  },

  modalContent: {
    padding: 16,
  },

  modalLabel: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },

  modalInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },

  modalInputDisabled: {
    opacity: 0.5,
  },

  modalHint: {
    color: "#666",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },

  modalActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  modalButtonPrimary: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  modalButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});