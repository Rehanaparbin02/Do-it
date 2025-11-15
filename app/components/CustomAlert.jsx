// CustomAlert.js
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

/**
 * Usage:
 * 1. Wrap your app: <CustomAlertProvider>{...}</CustomAlertProvider>
 * 2. Trigger: CustomAlert.alert('Title', 'Message', [{ text: 'OK', onPress: () => {} }])
 */

// Simple singleton manager (replaces the class instance)
const CustomAlert = {
  _ref: null,
  setRef(ref) {
    this._ref = ref;
  },
  alert(title, message, buttons = [{ text: 'OK' }]) {
    if (this._ref && typeof this._ref.show === 'function') {
      this._ref.show(title, message, buttons);
    } else {
      // fallback to console so missed registration is visible during dev
      // (you can remove/replace with other behavior)
      console.warn('CustomAlert provider not mounted yet.');
    }
  },
};

export { CustomAlert };

/**
 * Functional provider component
 */
export function CustomAlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // show/hide functions exposed to the singleton via ref
  const show = (t, m, b = [{ text: 'OK' }]) => {
    setTitle(t || '');
    setMessage(m || '');
    setButtons(Array.isArray(b) && b.length ? b : [{ text: 'OK' }]);
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hide = (onPress) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      // call the button callback (if provided)
      if (typeof onPress === 'function') onPress();
    });
  };

  // Register with singleton on mount, unregister on unmount
  useEffect(() => {
    const ref = { show, hide };
    CustomAlert.setRef(ref);
    return () => CustomAlert.setRef(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // show/hide refs stable in this component

  return (
    <>
      {children}
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={() => hide()}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Icon based on button style */}
            <View style={styles.iconContainer}>
              {buttons.some((btn) => btn.style === 'destructive') ? (
                <Text style={styles.iconDestructive}>⚠️</Text>
              ) : buttons.some((btn) => btn.text === 'OK' && title === 'Success') ? (
                <Text style={styles.iconSuccess}>✓</Text>
              ) : (
                <Text style={styles.iconInfo}>ℹ️</Text>
              )}
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDestructive && styles.buttonDestructive,
                      isCancel && styles.buttonCancel,
                      buttons.length === 1 && styles.buttonSingle,
                    ]}
                    onPress={() => hide(button.onPress)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.buttonTextDestructive,
                        isCancel && styles.buttonTextCancel,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconSuccess: {
    fontSize: 48,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  iconDestructive: {
    fontSize: 48,
  },
  iconInfo: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSingle: {
    flex: 1,
  },
  buttonCancel: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonDestructive: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextCancel: {
    color: '#999',
  },
  buttonTextDestructive: {
    color: '#fff',
  },
});
