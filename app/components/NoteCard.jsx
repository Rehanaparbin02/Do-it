// NoteCard.jsx
import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";

// Swipeable import (adjust if your project requires a different path)
import ReanimatedSwipeable from "react-native-gesture-handler/Swipeable";

export default function NoteCard({
  note,
  onToggleComplete,
  onPress,
  onLongPress,
  onSelectToggle,
  onArchive, // (note) => {}
  onFavorite, // (note) => {}
  multiSelectMode = false,
  selected = false,
}) {
  const swipeableRef = useRef(null);

  const handlePress = () => {
    if (multiSelectMode) {
      onSelectToggle?.();
    } else {
      onPress?.();
    }
  };

  // Helper: close swipeable safely
  const closeSwipeable = () => {
    try {
      const s = swipeableRef.current;
      if (s && typeof s.close === "function") {
        s.close();
        return true;
      }
    } catch (err) {
      // ignore
    }
    return false;
  };

  // Animated Left action (swipe right) - Archive
  const renderLeftActions = (progress, dragX) => {
    // progress is an Animated node between 0 and 1
    const translateX = progress.interpolate
      ? progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 0], // starts further left, moves to 0
          extrapolate: "clamp",
        })
      : new Animated.Value(0);

    const opacity = progress.interpolate
      ? progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.5, 1],
          extrapolate: "clamp",
        })
      : new Animated.Value(1);

    const scale = progress.interpolate
      ? progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
          extrapolate: "clamp",
        })
      : new Animated.Value(1);

    return (
      <Animated.View
        style={[
          styles.actionWrapperLeft,
          {
            transform: [{ translateX }, { scale }],
            opacity,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            // Close first, then call archive after a short delay to allow the close animation
            const didClose = closeSwipeable();
            const delay = didClose ? 220 : 0;
            setTimeout(() => {
              onArchive?.(note);
            }, delay);
          }}
          style={[styles.actionContainer, styles.archiveAction]}
          android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        >
          {/* <Text style={styles.actionEmoji}>🗄️</Text> */}
          <Text style={styles.actionText}>Archive</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // Animated Right action (swipe left) - Favorite
  const renderRightActions = (progress, dragX) => {
    const translateX = progress.interpolate
      ? progress.interpolate({
          inputRange: [0, 1],
          outputRange: [40, 0], // starts further right, moves to 0
          extrapolate: "clamp",
        })
      : new Animated.Value(0);

    const opacity = progress.interpolate
      ? progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.5, 1],
          extrapolate: "clamp",
        })
      : new Animated.Value(1);

    const scale = progress.interpolate
      ? progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
          extrapolate: "clamp",
        })
      : new Animated.Value(1);

    return (
      <Animated.View
        style={[
          styles.actionWrapperRight,
          {
            transform: [{ translateX }, { scale }],
            opacity,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            const didClose = closeSwipeable();
            const delay = didClose ? 220 : 0;
            setTimeout(() => {
              onFavorite?.(note);
            }, delay);
          }}
          style={[styles.actionContainerfav, styles.favoriteAction]}
          android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        >
          {/* <Text style={styles.actionEmoji}>⭐</Text> */}
          <Text style={styles.actionText}>Favorite</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={40}
      rightThreshold={40}
      friction={2}
      overshootFriction={8}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.noteCard,
          note.completed && styles.completedCard,
          multiSelectMode && styles.multiSelectCard,
          selected && styles.selectedCard,
        ]}
        onPress={handlePress}
        onLongPress={onLongPress}
        delayLongPress={250}
      >
        {multiSelectMode && (
          <View
            style={[
              styles.selectionIndicator,
              selected && styles.selectionIndicatorSelected,
            ]}
          >
            {selected && <Text style={styles.selectionIndicatorText}>✓</Text>}
          </View>
        )}
        <View style={styles.noteRow}>
          <TouchableOpacity
            onPress={onToggleComplete}
            style={[
              styles.checkbox,
              note.completed && styles.checkboxChecked,
              multiSelectMode && styles.checkboxDisabled,
            ]}
            disabled={multiSelectMode}
          >
            {note.completed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.noteTitle,
                note.completed && styles.noteCompleted,
              ]}
            >
              {note.title}
            </Text>
            <Text
              style={[
                styles.noteContent,
                note.completed && styles.noteCompleted,
              ]}
              numberOfLines={2}
            >
              {note.content}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: "rgba(26, 24, 24, 1)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  completedCard: {
    backgroundColor: "rgba(1, 20, 4, 1)",
    opacity:1,
  },
  multiSelectCard: {
    borderColor: "rgba(34,197,94,0.25)",
  },
  selectedCard: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkboxDisabled: {
    opacity: 0.8,
  },
  checkmark: {
    color: "#fff",
    fontWeight: "700",
  },
  noteTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  noteContent: {
    color: "#999",
    fontSize: 14,
    marginTop: 2,
  },
  noteCompleted: {
    textDecorationLine: "line-through",
    color: "#666",
  },
  selectionIndicator: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(10,10,10,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionIndicatorSelected: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  selectionIndicatorText: {
    color: "#0a0a0a",
    fontSize: 12,
    fontWeight: "700",
  },

  /* wrappers so we can animate the whole action block */
  actionWrapperLeft: {
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 8,
  },
  actionWrapperRight: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 8,
  },

  /* Swipe action button */
  actionContainer: {
    width: 100,
    height: 50,
    position:'relative',
    top: -6,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginVertical: 6,
    marginRight: 10
  },
  actionContainerfav: {
    width: 100,
    height: 50,
    position:'relative',
    top: -6,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginVertical: 6,
    marginLeft: 10
  },
  archiveAction: {
    backgroundColor: "rgba(218, 110, 2, 0.81)",
    borderColor: "rgba(148,163,184,0.18)",
    borderWidth: 1,
  },
  favoriteAction: {
    backgroundColor: "rgba(250, 204, 21, 0.8)",
    borderColor: "rgba(250,204,21,0.18)",
    borderWidth: 1,
  },

  // actionEmoji: {
  //   fontSize: 22,
  //   marginBottom: 6,
  // },
  actionText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
});
