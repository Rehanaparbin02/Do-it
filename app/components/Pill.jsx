import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const categories = [
  { id: 'all', label: 'All', color: '#22c55e' },
  { id: 'urgent_important', label: 'Urgent & Important', color: '#ef4444' },
  { id: 'urgent_unimportant', label: 'Urgent & Unimportant', color: '#f59e0b' },
  { id: 'not_urgent_important', label: 'Not Urgent & Important', color: '#3b82f6' },
  { id: 'not_urgent_unimportant', label: 'Not Urgent & Unimportant', color: '#8b5cf6' },
];

export default function Pill({ selectedCategory, onSelectCategory }) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.pill,
                isSelected && {
                  backgroundColor: category.color,
                  borderColor: category.color,
                },
              ]}
              onPress={() => onSelectCategory(category.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected && styles.pillTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
    marginTop: 25,
  },
  scrollContent: {
    paddingRight: 20,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
});