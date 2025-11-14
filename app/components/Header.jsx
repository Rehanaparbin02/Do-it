import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';


export default function Header({ onLogout, onMenuPress, onnotificationssPress = () => {}, notificationssCount = 0, showingnotificationss = false }) {
  const displayCount =
    notificationssCount > 99 ? '99+' : notificationssCount > 9 ? '9+' : `${notificationssCount}`;

  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={onMenuPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuIconContainer}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </View>
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>Get It</Text>
        <Text style={styles.headerTitleGreen}>Done!</Text>
        <View style={styles.headerBadge}>
          <View style={styles.headerBadgeDot} />
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.notificationsButton,
          showingnotificationss && styles.notificationsButtonActive,
          notificationssCount === 0 && styles.notificationsButtonEmpty,
        ]}
        onPress={onnotificationssPress}
        activeOpacity={0.8}
      >
        <Text style={styles.notificationsIcon}>🔔</Text>
        {notificationssCount > 0 && (
          <View style={styles.notificationsBadge}>
            <Text style={styles.notificationsBadgeText}>{displayCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.12)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -20,
    position: 'relative',
    top: -25
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    // backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  menuIconContainer: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  menuLine: {
    height: 2,
    backgroundColor: '#ffffffff',
    borderRadius: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '100',
    color: '#ffffffff',
    letterSpacing: -0.5,
    fontFamily: "Nunito",
    
  },
  headerTitleGreen: {
    fontSize: 25,
    fontWeight: '100',
    color: '#22c55e',
    letterSpacing: -0.5,
    fontFamily: "Nunito",
    textDecorationLine: 'underline'
  },
  // headerBadge: {
  //   width: 8,
  //   height: 8,
  //   borderRadius: 4,
  //   backgroundColor: 'rgba(34,197,94,0.3)',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // headerBadgeDot: {
  //   width: 4,
  //   height: 4,
  //   borderRadius: 2,
  //   backgroundColor: '#22c55e',
  // },
  notificationsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  notificationsButtonActive: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderColor: 'rgba(34,197,94,0.5)',
  },
  notificationsButtonEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  notificationsIcon: {
    fontSize: 20,
    color: '#22c55e',
  },
  notificationsBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationsBadgeText: {
    color: '#0a0a0a',
    fontSize: 10,
    fontWeight: '700',
  },

  /* new style for the bottom progressive fade */
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 28,
    bottom: -8, // slightly overlap the area below header so it fades content as it scrolls under
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
