import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

export default function FABButton({ onPress }) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#22c55e",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    color: "#ffffffff",
    fontSize: 36,
    fontWeight: "600",
    marginBottom: -5,
  },
});