// Profile.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabaseClient";

/**
 * Enhanced Profile screen
 *
 * Features added:
 * - Shows current user metadata (name, email, avatar)
 * - Pick avatar from gallery, upload to Supabase Storage (bucket: "avatars")
 * - Persist avatar URL & full_name into Supabase user metadata
 * - Change password (optional) with validation
 * - Sign out button
 * - Loading states + friendly alerts
 *
 * Note:
 * - This implementation assumes a bucket named "avatars" exists in your Supabase Storage
 *   and is configured for public access (or you can adapt to use signed URLs).
 * - If you don't have the bucket, either create it or remove the upload code and only store the local uri.
 */

export default function Profile({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [avatarLocalUri, setAvatarLocalUri] = useState(null); // local preview before upload
  const [avatarUrl, setAvatarUrl] = useState(null); // persisted avatar public url
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // optional change password UI
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // prefer getSession + user to be consistent
        const { data } = await supabase.auth.getSession();
        const currentUser = data?.session?.user ?? null;

        // fallback to getUser when session unavailable
        if (!currentUser) {
          const res = await supabase.auth.getUser();
          if (res?.data?.user) {
            setUser(res.data.user);
            setName(res.data.user?.user_metadata?.full_name || "");
            setAvatarUrl(res.data.user?.user_metadata?.avatar_url || res.data.user?.user_metadata?.avatar || null);
          } else {
            setUser(null);
          }
        } else {
          setUser(currentUser);
          setName(currentUser?.user_metadata?.full_name || "");
          setAvatarUrl(currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.avatar || null);
        }
      } catch (err) {
        Alert.alert("Error", err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // pick image from gallery
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Please allow photo library access to set an avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarLocalUri(asset.uri);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick image: " + (err?.message || String(err)));
    }
  };

  // upload selected image to Supabase Storage and return public url (best-effort)
  const uploadAvatarToStorage = async (uri, userId) => {
    if (!uri || !userId) return null;
    try {
      setIsUploading(true);

      // fetch blob from uri
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `${userId}.jpg`;
      const bucket = "avatars"; // ensure this bucket exists
      const path = `${filename}`;

      // attempt to remove existing file first (ignore errors)
      try {
        await supabase.storage.from(bucket).remove([path]);
      } catch (e) {
        // ignore
      }

      // upload
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      // get public URL
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = publicData?.publicUrl || null;

      setAvatarUrl(publicUrl);
      return publicUrl;
    } catch (err) {
      Alert.alert("Upload failed", err?.message || String(err));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Error", "No user session found.");
      return;
    }

    // password change validation (if shown)
    if (showPasswordFields) {
      if (!newPassword || newPassword.length < 6) {
        Alert.alert("Password", "Password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Password", "Passwords do not match.");
        return;
      }
    }

    try {
      setIsSaving(true);

      // first upload avatar if local uri present
      let finalAvatarUrl = avatarUrl;
      if (avatarLocalUri) {
        const uploadedUrl = await uploadAvatarToStorage(avatarLocalUri, user.id);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      // Build metadata update (keep previous metadata merged)
      const meta = {
        ...(user.user_metadata || {}),
        full_name: name || "",
      };
      if (finalAvatarUrl) meta.avatar_url = finalAvatarUrl;

      // Prepare payload for supabase update
      const updatePayload = { data: meta };

      // add password if user asked to change it
      if (showPasswordFields && newPassword) {
        updatePayload.password = newPassword;
      }

      const { error } = await supabase.auth.updateUser(updatePayload);
      if (error) throw error;

      // refresh local user state
      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed?.user ?? user);
      setAvatarLocalUri(null);
      setAvatarUrl(refreshed?.user?.user_metadata?.avatar_url || finalAvatarUrl);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err) {
      Alert.alert("Error", err?.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // navigate to auth/login screen - adapt as needed
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (err) {
      Alert.alert("Sign out failed", err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    // Most environments require server-side deletion. Offer guidance.
    Alert.alert(
      "Delete account",
      "Permanent account deletion must be performed from your account portal or via admin APIs. Do you want to clear profile metadata locally instead?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear metadata",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSaving(true);
              // remove user metadata fields (keeps account alive)
              const { error } = await supabase.auth.updateUser({ data: { full_name: "", avatar_url: "" } });
              if (error) throw error;
              setName("");
              setAvatarLocalUri(null);
              setAvatarUrl(null);
              Alert.alert("Cleared", "Profile metadata cleared. For account deletion, please contact support.");
            } catch (err) {
              Alert.alert("Error", err?.message || String(err));
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
          <View style={styles.avatarWrapper}>
            {avatarLocalUri ? (
              <Image source={{ uri: avatarLocalUri }} style={styles.avatar} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.email?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.smallText}>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />

        {/* read-only fields */}
        <Text style={[styles.label, { marginTop: 6 }]}>Email</Text>
        <TextInput
          style={[styles.input, styles.readOnly]}
          value={user?.email || ""}
          editable={false}
          selectTextOnFocus={false}
        />

        {/* Optional: change password */}
        <TouchableOpacity
          style={styles.togglePasswordRow}
          onPress={() => setShowPasswordFields((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.togglePasswordText}>{showPasswordFields ? "Hide password fields" : "Change password"}</Text>
          <Text style={styles.togglePasswordChevron}>{showPasswordFields ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {showPasswordFields && (
          <>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New password (min 6 chars)"
              placeholderTextColor="#666"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="#666"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || isUploading) && { opacity: 0.8 }]}
          onPress={handleSave}
          disabled={isSaving || isUploading}
          activeOpacity={0.8}
        >
          {isSaving || isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Danger: clear metadata */}
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount} activeOpacity={0.8}>
          <Text style={styles.deleteAccountText}>Clear Profile Metadata</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    paddingVertical: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop:20,
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  backButtonText: {
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 14,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#22c55e",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(34,197,94,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 44,
    color: "#fff",
    fontWeight: "700",
  },
  editBadge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  editBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  email: {
    color: "#999",
    fontSize: 15,
    marginTop: 12,
    fontWeight: "600",
  },
  smallText: {
    color: "#666",
    marginTop: 6,
    fontSize: 12,
  },
  form: {
    width: "100%",
    marginTop: 8,
  },
  label: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  readOnly: {
    opacity: 0.8,
  },
  togglePasswordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
    paddingVertical: 6,
  },
  togglePasswordText: {
    color: "#22c55e",
    fontWeight: "700",
  },
  togglePasswordChevron: {
    color: "#22c55e",
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  signOutButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  signOutText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteAccountButton: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  deleteAccountText: {
    color: "#f87171",
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
});
