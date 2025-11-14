import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Keyboard } from 'react-native';

export default function SearchBar({ searchQuery, onSearchChange, onClearSearch }) {
  const [isFocused, setIsFocused] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const inputRef = useRef(null);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onClearSearch();
    if (inputRef.current) {
      inputRef.current.blur();
    }
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.searchInputContainer,
        isFocused && styles.searchInputContainerFocused,
        searchQuery.length > 0 && styles.searchInputContainerActive
      ]}>
        {/* Glass morphism overlay */}
        <View style={styles.glassOverlay} />
        
        {/* Search Icon with gradient background */}
        <View style={styles.iconWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
        
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search by title or content..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor="#22c55e"
          returnKeyType="search"
          onSubmitEditing={handleBlur}
        />
        
        {searchQuery.length > 0 && (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              activeOpacity={0.8}
            >
              <View style={styles.clearButtonInner}>
                <Text style={styles.clearButtonText}>✕</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        
        {/* Active indicator */}
        {isFocused && (
          <View style={styles.activeIndicator} />
        )}
      </View>
      
      {/* Search hint */}
      {isFocused && searchQuery.length === 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>💡 Try searching for keywords or phrases</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,15,15,0.95)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  searchInputContainerFocused: {
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(20,20,20,0.98)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.2,
  },
  searchInputContainerActive: {
    borderColor: 'rgba(34,197,94,0.25)',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    backdropFilter: 'blur(10px)',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchIcon: {
    fontSize: 28,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
    paddingVertical: 2,
  },
  clearButton: {
    marginLeft: 12,
  },
  clearButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  hintContainer: {
    marginTop: 12,
    paddingHorizontal: 18,
  },
  hintText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});