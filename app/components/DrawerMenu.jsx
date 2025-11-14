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
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function DrawerMenu({ visible, onClose, onLogout, user }) {
  const [slideAnim] = useState(new Animated.Value(-width));
  const navigation = useNavigation();

  // --- New: realtime date state + formatter ---
  const formatDate = (date) => {
    const d = date;
    const day = d.getDate();
    const dayStr = String(day); // no zero-pad by default; change if you want 09
    const monthNames = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const month = monthNames[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2); // '25'
    return `${dayStr}-${month}-${year}`;
  };

  const [currentDate, setCurrentDate] = useState(() => formatDate(new Date()));

  useEffect(() => {
    // update every 30 seconds to handle midnight rollover
    const id = setInterval(() => {
      setCurrentDate(formatDate(new Date()));
    }, 30000);

    return () => clearInterval(id);
  }, []);
  // --- end new date logic ---

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleNavigate = (screen) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 280);
  };

  const menuItems = [
    {
      id: "folders",
      icon: "📁",
      title: "Spaces",
      subtitle: "Organize by project",
      accent: "#f59e0b",
      onPress: () => handleNavigate("Spaces"),
    },
    {
      id: "pomodoro",
      icon: "⏱️",
      title: "Pomodoro Timer",
      subtitle: "Deep focus sessions",
      accent: "#ef4444",
      onPress: () => handleNavigate("PomodoroTimer"),
    },
    {
      id: "timetracking",
      icon: "⏳",
      title: "Time Tracking",
      subtitle: "Measure your effort",
      accent: "#06b6d4",
      onPress: () => handleNavigate("TimeTracking"),
    },
    {
      id: "archive",
      icon: "📦",
      title: "Archive",
      subtitle: "Find tucked away notes",
      accent: "#8b5cf6",
      onPress: () => handleNavigate("Archive"),
    },
  ];

  const quickActions = [
    {
      id: "profile",
      icon: "👤",
      label: "Profile",
      description: "Manage your identity",
      accent: "#3b82f6",
      onPress: () => handleNavigate("Profile"),
    },
    {
      id: "completed",
      icon: "📝",
      label: "Completed",
      description: "See What You Completed",
      accent: "#ff007bff",
      onPress: () => handleNavigate("Completed"),
    },
    {
      id: "calendar",
      icon: "📅",
      label: "Calendar",
      description: "See deadlines & reminders",
      accent: "#3b82f6",
      onPress: () => handleNavigate("CalendarView"),
    },
    {
      id: "reminders",
      icon: "⏰",
      label: "Reminders",
      description: "See upcoming alerts",
      accent: "#f97316",
      onPress: () => handleNavigate("Reminders"),
    },  
    // {
    //   id: "favorites",
    //   label: "Favorites",
    //   description: "Pinned for quick access",
    //   icon: "⭐",
    //   accent: "#38bdf8",
    //   onPress: onClose,
    // },
  ];

  const getUserInitials = () => {
    if (!user?.email) return "?";
    return user.email.substring(0, 2).toUpperCase();
  };

  const displayName = user?.user_metadata?.full_name || "Welcome back";
  const displayEmail = user?.email || "user@example.com";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* <View style={styles.drawerBackground}>
            <View style={styles.blurOrbOne} />
            <View style={styles.blurOrbTwo} />
            <View style={styles.blurOrbThree} />
          </View> */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.header}>
              <View style={styles.profileCard}>
                <View style={styles.profileTopRow}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarCore}>
                      <Text style={styles.avatarText}>{getUserInitials()}</Text>
                    </View>
                    <View style={styles.avatarHalo} />
                    <View style={styles.avatarRing} />
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.badgeText}>Rehana Parbin</Text>
                  </View>
                </View>

                <View style={styles.profileInfo}>
                  {/* Combined email + realtime date */}
                  <Text style={styles.profileEmail}>
                    {`${displayEmail}  *  ${currentDate}`}
                  </Text>
                </View>

                <View style={styles.profileFooter}>
                  <View style={styles.profileChip}>
                    <Text style={styles.profileChipIcon}>🔥</Text>
                    <Text style={styles.profileChipText}>
                      Doing Great · Keep the flow going.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionLabel}>Quick actions</Text>
              <View style={styles.quickActionGrid}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    activeOpacity={0.8}
                    onPress={action.onPress}
                    style={styles.quickActionCard}
                  >
                    <View
                      style={[styles.quickActionIcon, { backgroundColor: `${action.accent}20` }]}
                    >
                      <Text style={styles.quickActionIconText}>{action.icon}</Text>
                    </View>
                    <View style={styles.quickActionTextContainer}>
                      <Text style={styles.quickActionLabel}>{action.label}</Text>
                      <Text style={styles.quickActionDescription}>{action.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.menuSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Workspace</Text>
                <Text style={styles.sectionHint}>Navigate through your toolkit</Text>
              </View>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.85}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: `${item.accent}1A` }]}>
                    <View style={[styles.menuIconGlow, { backgroundColor: `${item.accent}33` }]} />
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.menuChevron}>
                    <Text style={styles.menuChevronText}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* <View style={styles.premiumBlock}>
              <View style={styles.premiumGlow} />
              <View style={styles.premiumContent}>
                <View style={styles.premiumLabelRow}>
                  <Text style={styles.premiumIcon}>🚀</Text>
                  <Text style={styles.premiumLabel}>Upgrade experience</Text>
                </View>
                <Text style={styles.premiumTitle}>Unlock collaborative workspaces</Text>
                <Text style={styles.premiumDescription}>
                  Share notes, assign tasks, and sync reminders across your team with
                  ease.
                </Text>
                <TouchableOpacity activeOpacity={0.85} style={styles.premiumButton} onPress={onClose}>
                  <Text style={styles.premiumButtonText}>Explore plans</Text>
                </TouchableOpacity>
              </View>
            </View> */}

            <View style={styles.settingsSection}>
              <Text style={styles.sectionLabel}>Settings</Text>
              <View style={styles.settingsGrid}>
                <TouchableOpacity
                  style={styles.settingsCard}
                  activeOpacity={0.85}
                  onPress={onClose}
                >
                  <Text style={styles.settingsIcon}>⚙️</Text>
                  <View>
                    <Text style={styles.settingsTitle}>Preferences</Text>
                    <Text style={styles.settingsSubtitle}>Theme, notifications, privacy</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsCard}
                  activeOpacity={0.85}
                  onPress={onClose}
                >
                  <Text style={styles.settingsIcon}>❓</Text>
                  <View>
                    <Text style={styles.settingsTitle}>Help & Support</Text>
                    <Text style={styles.settingsSubtitle}>Guides, FAQs, chat</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.logoutButton}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  setTimeout(() => onLogout(), 280);
                }}
              >
                <View style={styles.logoutIconContainer}>
                  <Text style={styles.logoutIcon}>🚪</Text>
                </View>
                <View style={styles.logoutTextGroup}>
                  <Text style={styles.logoutText}>Sign out</Text>
                  <Text style={styles.logoutHint}>Switch account or take a break</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.footerVersion}>NotesApp · v3.0.0</Text>
            </View>
          </ScrollView>
        </Animated.View>

        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
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
    backgroundColor: "rgba(7,7,7,0.7)",
  },
  drawer: {
    width: width * 0.82,
    maxWidth: 380,
    backgroundColor: "#060606",
    borderRightColor: "rgba(255,255,255,0.05)",
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 12, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 22,
  },
  drawerBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blurOrbOne: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(59,130,246,0.12)",
    opacity: 0.6,
  },
  blurOrbTwo: {
    position: "absolute",
    top: 180,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(34,197,94,0.12)",
    opacity: 0.6,
  },
  blurOrbThree: {
    position: "absolute",
    bottom: -120,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(249,115,22,0.12)",
    opacity: 0.6,
  },
  scrollContainer: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 44,
  },
  header: {
    marginBottom: 28,
  },
  profileCard: {
    backgroundColor: "rgba(15,15,15,0.72)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 22,
    overflow: "hidden",
  },
  profileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  avatarHalo: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(34,197,94,0.3)",
    transform: [{ scale: 1.35 }],
  },
  avatarRing: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(34,197,94,0.35)",
    opacity: 0.9,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    color: "#f1f5f9",
    fontSize: 25,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  profileInfo: {
    marginTop: 20,
  },
  profileName: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  profileEmail: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 6,
  },
  profileFooter: {
    marginTop: 22,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.22)",
  },
  profileChipIcon: {
    fontSize: 16,
  },
  profileChipText: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  quickActionsSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: "#cbd5f5",
    fontSize: 13,
    letterSpacing: 1.3,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 20,
  },
  sectionHint: {
    color: "rgba(226,232,240,0.64)",
    fontSize: 12,
    marginTop: -16,
  },
  quickActionGrid: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionTextContainer: {
    flex: 1,
  },
  quickActionLabel: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  quickActionDescription: {
    color: "#94a3b8",
    fontSize: 12,
  },
  menuSection: {
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.35)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    marginBottom: 12,
  },
  menuIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  menuIconGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  menuIcon: {
    fontSize: 26,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 4,
  },
  menuTitle: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
  },
  menuSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  menuChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(148,163,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuChevronText: {
    color: "#cbd5f5",
    fontSize: 18,
    fontWeight: "800",
  },
  premiumBlock: {
    marginBottom: 30,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(88,28,135,0.4)",
    backgroundColor: "rgba(30,0,60,0.55)",
    overflow: "hidden",
  },
  premiumGlow: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(168,85,247,0.25)",
    opacity: 0.8,
  },
  premiumContent: {
    padding: 22,
    gap: 12,
  },
  premiumLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumIcon: {
    fontSize: 22,
  },
  premiumLabel: {
    color: "#f3e8ff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  premiumTitle: {
    color: "#fdf4ff",
    fontSize: 18,
    fontWeight: "700",
  },
  premiumDescription: {
    color: "#e9d5ff",
    fontSize: 13,
    lineHeight: 18,
  },
  premiumButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(168,85,247,0.85)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6,
  },
  premiumButtonText: {
    color: "#fff7ed",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  settingsSection: {
    marginBottom: 34,
  },
  settingsGrid: {
    gap: 14,
  },
  settingsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "rgba(15,15,15,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  settingsIcon: {
    fontSize: 22,
  },
  settingsTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  settingsSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
  },
  footer: {
    gap: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "rgba(24,24,27,0.85)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  logoutIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutIcon: {
    fontSize: 22,
  },
  logoutTextGroup: {
    flex: 1,
  },
  logoutText: {
    color: "#fca5a5",
    fontSize: 15,
    fontWeight: "700",
  },
  logoutHint: {
    color: "#f87171",
    fontSize: 12,
  },
  footerVersion: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
  },
});
