import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function NoteCard({
  note,
  onToggleComplete,
  onPress,
  onLongPress,
  onSelectToggle,
  multiSelectMode = false,
  selected = false,
}) {
  const handlePress = () => {
    if (multiSelectMode) {
      onSelectToggle?.();
    } else {
      onPress?.();
    }
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  completedCard: { 
    opacity: 0.5 
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
    gap: 12 
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
    borderColor: "#22c55e" 
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  checkmark: { 
    color: "#fff", 
    fontWeight: "700" 
  },
  noteTitle: { 
    color: "#fff", 
    fontSize: 17, 
    fontWeight: "600" 
  },
  noteContent: { 
    color: "#999", 
    fontSize: 14, 
    marginTop: 2 
  },
  noteCompleted: { 
    textDecorationLine: "line-through", 
    color: "#666" 
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
});