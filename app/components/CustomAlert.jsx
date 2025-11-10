import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

/**
 * Custom Alert Component matching dark UI theme
 * Usage: CustomAlert.alert(title, message, buttons)
 */

class CustomAlertClass {
  constructor() {
    this.alertRef = null;
  }

  setAlertRef(ref) {
    this.alertRef = ref;
  }

  alert(title, message, buttons = [{ text: 'OK' }]) {
    if (this.alertRef) {
      this.alertRef.show(title, message, buttons);
    }
  }
}

export const CustomAlert = new CustomAlertClass();

export class CustomAlertProvider extends React.Component {
  state = {
    visible: false,
    title: '',
    message: '',
    buttons: [],
    fadeAnim: new Animated.Value(0),
  };

  componentDidMount() {
    CustomAlert.setAlertRef(this);
  }

  show = (title, message, buttons) => {
    this.setState({ visible: true, title, message, buttons }, () => {
      Animated.timing(this.state.fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  hide = (onPress) => {
    Animated.timing(this.state.fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      this.setState({ visible: false });
      if (onPress) onPress();
    });
  };

  render() {
    const { visible, title, message, buttons, fadeAnim } = this.state;

    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={() => this.hide()}
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
                    onPress={() => this.hide(button.onPress)}
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
    );
  }
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