import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function NoteCard({ note, onToggleComplete, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.noteCard, note.completed && styles.completedCard]}
      onPress={onPress}
    >
      <View style={styles.noteRow}>
        <TouchableOpacity
          onPress={onToggleComplete}
          style={[styles.checkbox, note.completed && styles.checkboxChecked]}
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
});