import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Audio } from "expo-av";

export default function PomodoroTimer({ navigation }) {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const totalDuration = isBreak ? breakMinutes * 60 : focusMinutes * 60;

  // --- Animate border color ---
  useEffect(() => {
    Animated.timing(borderColorAnim, {
      toValue: isBreak ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [isBreak]);

  const borderColorInterpolate = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#22c55e", "#c084fc"],
  });

  // --- Timer countdown logic ---
  useEffect(() => {
    let interval = null;
    if (isRunning && time > 0) {
      interval = setInterval(() => setTime((prev) => prev - 1), 1000);
    } else if (time === 0) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, time]);

  // --- Animate progress ---
  useEffect(() => {
    Animated.timing(progress, {
      toValue: (1 - time / totalDuration) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [time]);

  // --- Sound + glow playback ---
  const playAlarm = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/alarm.mp3"),
        { shouldPlay: true }
      );
      await sound.playAsync();
      setTimeout(() => sound.unloadAsync(), 4000);
    } catch (error) {
      console.warn("Alarm playback error:", error);
    }
  };

  // Pulsing glow synchronized with beeps
  const pulseGlow = async () => {
    for (let i = 0; i < 3; i++) {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
      await new Promise((r) => setTimeout(r, 600));
    }
  };

  const playThreeBeeps = async () => {
    try {
      for (let i = 0; i < 3; i++) {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/beep.mp3"),
          { shouldPlay: true }
        );
        await sound.playAsync();
        await new Promise((r) => setTimeout(r, 600));
        await sound.unloadAsync();
      }
    } catch (error) {
      console.warn("Beep playback error:", error);
    }
  };

  // --- Timer complete logic ---
  const handleComplete = async () => {
    setIsRunning(false);
    if (!isBreak) {
      await playAlarm();
      Alert.alert("Focus Complete!", "Time for a short break.", [
        {
          text: "OK",
          onPress: () => {
            setIsBreak(true);
            setTime(breakMinutes * 60);
            progress.setValue(0);
          },
        },
      ]);
    } else {
      // Beep + glow pulses synchronized
      pulseGlow();
      await playThreeBeeps();
      setIsBreak(false);
      setTime(focusMinutes * 60);
      progress.setValue(0);
      setIsRunning(true); // auto-start next focus
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(totalDuration);
    progress.setValue(0);
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const applyCustomTimes = () => {
    const focus = parseInt(focusMinutes);
    const brk = parseInt(breakMinutes);
    if (isNaN(focus) || isNaN(brk) || focus <= 0 || brk <= 0) {
      Alert.alert("Invalid Input", "Enter valid positive numbers.");
      return;
    }
    setIsEditing(false);
    setIsRunning(false);
    setTime((isBreak ? brk : focus) * 60);
    progress.setValue(0);
  };

  // --- Glow color ---
  const glowColor = isBreak ? "#c084fc" : "#22c55e";
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {isBreak ? "Break Time" : "Focus Session"}
      </Text>

      {/* Timer Circle */}
      <View style={styles.timerWrapper}>
        {/* Pulsing glow layer */}
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: glowColor,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circle,
            { borderColor: borderColorInterpolate },
          ]}
        >
          <Text style={styles.timerText}>{formatTime(time)}</Text>
        </Animated.View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.startButton]}
          onPress={() => setIsRunning(!isRunning)}
        >
          <Text style={styles.buttonText}>
            {isRunning ? "Pause" : "Start"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetTimer}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.buttonText}>
            {isEditing ? "Close" : "Set Time"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Editable Inputs */}
      {isEditing && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Focus (minutes):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={focusMinutes.toString()}
            onChangeText={(text) => setFocusMinutes(text.replace(/[^0-9]/g, ""))}
          />
          <Text style={styles.inputLabel}>Break (minutes):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={breakMinutes.toString()}
            onChangeText={(text) => setBreakMinutes(text.replace(/[^0-9]/g, ""))}
          />
          <TouchableOpacity style={styles.applyButton} onPress={applyCustomTimes}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mode Toggle */}
      <TouchableOpacity
        style={styles.modeButton}
        onPress={() => {
          setIsBreak(!isBreak);
          setIsRunning(false);
          setTime((!isBreak ? breakMinutes : focusMinutes) * 60);
          progress.setValue(0);
        }}
      >
        <Text style={styles.modeButtonText}>
          {isBreak ? "Switch to Focus" : "Switch to Break"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 24,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backIcon: { color: "#fff", fontSize: 20, fontWeight: "700" },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 40,
  },
  timerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  timerText: { color: "#fff", fontSize: 48, fontWeight: "700" },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: { backgroundColor: "#22c55e33", borderWidth: 1, borderColor: "#22c55e55" },
  resetButton: { backgroundColor: "#ef444433", borderWidth: 1, borderColor: "#ef444477" },
  editButton: { backgroundColor: "#3b82f633", borderWidth: 1, borderColor: "#3b82f677" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  inputContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: { color: "#aaa", fontSize: 14, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: "#22c55e33",
    borderColor: "#22c55e66",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  applyText: { color: "#22c55e", fontWeight: "700", fontSize: 16 },
  modeButton: {
    marginTop: 8,
    backgroundColor: "#9333ea33",
    borderColor: "#9333ea66",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonText: { color: "#c084fc", fontWeight: "600", fontSize: 14 },
});
