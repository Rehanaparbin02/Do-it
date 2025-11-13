import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native"; // ✅ Add this

const { width } = Dimensions.get("window");

export default function DrawerMenu({ visible, onClose, onLogout, user }) {
  const [slideAnim] = useState(new Animated.Value(-width));
  const navigation = useNavigation(); // ✅ hook for navigation

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigate = (screen) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 300);
  };

  const menuItems = [
    {
      id: "profile",
      icon: "👤",
      title: "Profile",
      subtitle: "View and edit profile",
      color: "#3b82f6",
      onPress: () => handleNavigate("Profile"),
    },
    {
      id: "folders",
      icon: "📁",
      title: "Folders & Projects",
      subtitle: "Organize your notes",
      color: "#f59e0b",
      onPress: onClose,
    },
    {
      id: "archive",
      icon: "📦",
      title: "Archive",
      subtitle: "View archived notes",
      color: "#8b5cf6",
      onPress: onClose,
    },
    {
      id: "pomodoro",
      icon: "⏱️",
      title: "Pomodoro Timer",
      subtitle: "Focus mode & breaks",
      color: "#ef4444",
      onPress: () => handleNavigate("PomodoroTimer"),
    },
    {
      id: "timetracking",
      icon: "⏳",
      title: "Time Tracking",
      subtitle: "Track work duration",
      color: "#06b6d4",
      onPress: onClose,
    },
  ];

  const getUserInitials = () => {
    if (!user?.email) return "?";
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Drawer on the LEFT */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getUserInitials()}</Text>
                </View>
                <View style={styles.avatarGlow} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.user_metadata?.full_name || "User"}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.email || "user@example.com"}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView
            style={styles.menuContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuContent}
          >
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>FEATURES</Text>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.menuIconContainer,
                      { backgroundColor: `${item.color}20` },
                    ]}
                  >
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Settings */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>SETTINGS</Text>
              <TouchableOpacity style={styles.menuItem} onPress={onClose}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(148,163,184,0.2)" },
                  ]}
                >
                  <Text style={styles.menuIcon}>⚙️</Text>
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Settings</Text>
                  <Text style={styles.menuSubtitle}>App preferences</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={onClose}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(148,163,184,0.2)" },
                  ]}
                >
                  <Text style={styles.menuIcon}>❓</Text>
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Help & Support</Text>
                  <Text style={styles.menuSubtitle}>Get assistance</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                onClose();
                setTimeout(() => onLogout(), 300);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.logoutIconContainer}>
                <Text style={styles.logoutIcon}>🚪</Text>
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>NotesApp v1.0.0</Text>
          </View>
        </Animated.View>

        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  drawer: {
    width: width * 0.8,
    maxWidth: 360,
    backgroundColor: "#0f0f0f",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    height: "100%",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#22c55e",
    opacity: 0.3,
    transform: [{ scale: 1.3 }],
    zIndex: -1,
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  profileInfo: { flex: 1 },
  profileName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: { color: "#999", fontSize: 14, fontWeight: "500" },
  menuContainer: { flex: 1 },
  menuContent: { paddingTop: 8, paddingBottom: 24 },
  menuSection: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: {
    color: "#666",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: { fontSize: 22 },
  menuTextContainer: { flex: 1, marginLeft: 14 },
  menuTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 2 },
  menuSubtitle: { color: "#666", fontSize: 13, fontWeight: "500" },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    gap: 10,
  },
  logoutIconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIcon: { fontSize: 20 },
  logoutText: {
    color: "#ef4444",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footerText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
});
