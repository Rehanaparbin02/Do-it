import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function Home({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);

  // ✅ Auth state + session persistence (without auto-redirect)
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Session Error:', error);

      // Set user if session exists
      if (data?.session?.user && isMounted) {
        setUser(data.session.user);
        fetchNotes(data.session.user.id);
      } else if (isMounted) {
        // Fetch anonymous notes if not logged in
        fetchNotes(null);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchNotes(session.user.id);
      } else {
        // Fetch anonymous notes when logged out
        fetchNotes(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ✅ Fetch user notes (or all notes if not logged in)
  const fetchNotes = async (userId) => {
    setLoading(true);
    let query = supabase
      .from('notes')
      .select('*')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: false });
    
    // If logged in, only show user's notes
    // If not logged in, show all notes with null user_id (anonymous notes)
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Fetch Notes Error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      setNotes(data);
    }
    setLoading(false);
  };

  // ✅ Add / Update note (works with or without login)
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      if (editingNoteId) {
        const updateData = { title, content, updated_at: new Date() };
        const query = supabase
          .from('notes')
          .update(updateData)
          .eq('id', editingNoteId);
        
        // Only filter by user_id if logged in
        if (user) {
          query.eq('user_id', user.id);
        } else {
          query.is('user_id', null);
        }
        
        const { error } = await query;
        if (error) throw error;
      } else {
        // Insert note with user_id if logged in, null if not
        const { error } = await supabase
          .from('notes')
          .insert([{ user_id: user?.id || null, title, content, completed: false }]);
        if (error) throw error;
      }
      resetForm();
      fetchNotes(user?.id);
    } catch (err) {
      console.error('Save Note Error:', err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Toggle note completion status
  const toggleComplete = async (noteId, currentStatus) => {
    try {
      const query = supabase
        .from('notes')
        .update({ completed: !currentStatus, updated_at: new Date() })
        .eq('id', noteId);
      
      // Only filter by user_id if logged in
      if (user) {
        query.eq('user_id', user.id);
      } else {
        query.is('user_id', null);
      }
      
      const { error } = await query;
      if (error) throw error;
      
      fetchNotes(user?.id);
    } catch (err) {
      console.error('Toggle Complete Error:', err.message);
      Alert.alert('Error', err.message);
    }
  };

  // ✅ Delete note (works with or without login)
  const handleDelete = async (noteId) => {
    Alert.alert('Confirm', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const query = supabase
            .from('notes')
            .delete()
            .eq('id', noteId);
          
          // Only filter by user_id if logged in
          if (user) {
            query.eq('user_id', user.id);
          } else {
            query.is('user_id', null);
          }
          
          const { error } = await query;
          if (error) Alert.alert('Error', error.message);
          else fetchNotes(user?.id);
        },
      },
    ]);
  };

  // ✅ Edit note
  const handleEdit = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingNoteId(note.id);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingNoteId(null);
  };

  // ✅ Logout
  const handleLogout = async () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setUser(null);
          setNotes([]);
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101010" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Notes</Text>
          {user ? (
            <Text style={styles.userInfo}>👤 {user.email}</Text>
          ) : (
            <Text style={styles.userInfo}>👤 Guest Mode</Text>
          )}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Note Form */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {editingNoteId ? '✏️ Edit Note' : '➕ New Note'}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Write your note..."
          placeholderTextColor="#666"
          value={content}
          multiline
          onChangeText={setContent}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editingNoteId ? 'Update' : 'Add Note'}
              </Text>
            )}
          </TouchableOpacity>

          {editingNoteId && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notes List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          📝 Your Notes ({notes.length})
        </Text>
        
        {loading && notes.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySubtitle}>Create your first note above!</Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.noteCard}>
                <View style={styles.noteRow}>
                  {/* Checkbox */}
                  <TouchableOpacity 
                    style={styles.checkbox}
                    onPress={() => toggleComplete(item.id, item.completed)}
                  >
                    <View style={[
                      styles.checkboxInner,
                      item.completed && styles.checkboxChecked
                    ]}>
                      {item.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>

                  {/* Note Content */}
                  <TouchableOpacity 
                    style={styles.noteContent}
                    onPress={() => handleEdit(item)}
                  >
                    <Text style={[
                      styles.noteTitle,
                      item.completed && styles.completedText
                    ]}>
                      {item.title}
                    </Text>
                    {item.content ? (
                      <Text style={[
                        styles.noteDescription,
                        item.completed && styles.completedText
                      ]}>
                        {item.content.length > 80
                          ? item.content.slice(0, 80) + '...'
                          : item.content}
                      </Text>
                    ) : null}
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 14,
    color: '#999',
  },
  logoutButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  logoutText: {
    color: '#ff6b6b',
    fontWeight: '600',
    fontSize: 14,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 16,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#999',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  noteCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 4,
    color: '#fff',
  },
  noteDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
});