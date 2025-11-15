import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Linking,
  TextInput,
  Modal,
} from "react-native";
import { CustomAlert } from "../components/CustomAlert";

export default function HelpAndSupport({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [faqAnimations] = useState({}); // Store animation values for each FAQ
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const faqs = [
    {
      id: 1,
      question: "How do I create a new note?",
      answer: "Tap the green '+' button at the bottom right of the home screen. Fill in the title and content, then tap 'Save' to create your note."
    },
    {
      id: 2,
      question: "How do I organize notes into spaces?",
      answer: "Go to the Spaces screen from the menu. Create a new space, then when creating or editing a note, select the space you want to assign it to."
    },
    {
      id: 3,
      question: "How do I archive a note?",
      answer: "Swipe left on any note card to reveal the 'Archive' button. Archived notes can be found in the Archive screen accessible from the menu."
    },
    {
      id: 4,
      question: "How do I favorite a note?",
      answer: "Swipe right on any note card to add it to favorites. All favorited notes can be viewed in the Favorites screen."
    },
    {
      id: 5,
      question: "How do I delete a note permanently?",
      answer: "First archive the note by swiping left, then go to the Archive screen and swipe right on the note to permanently delete it."
    },
    // {
    //   id: 6,
    //   question: "Can I add attachments to notes?",
    //   answer: "Yes! When creating or editing a note, tap the attachment icon to add photos, videos, PDFs, or audio recordings."
    // },
    // {
    //   id: 7,
    //   question: "How do I set reminders for notes?",
    //   answer: "When creating or editing a note, look for the reminder option. Set a date and time, and you'll be notified when it's due."
    // },
    // {
    //   id: 8,
    //   question: "How do I use the Eisenhower Matrix categories?",
    //   answer: "Each note can be categorized as: Urgent & Important (Do First), Urgent & Unimportant (Delegate), Not Urgent & Important (Schedule), or Not Urgent & Unimportant (Eliminate). Select the category when creating or editing a note."
    // },
    // {
    //   id: 9,
    //   question: "How do I search for notes?",
    //   answer: "Use the search bar at the top of the home screen. You can search by title or content. You can also filter by category using the pills below the search bar."
    // },
    // {
    //   id: 10,
    //   question: "How do I select multiple notes at once?",
    //   answer: "Long press on any note to enter multi-select mode. Tap other notes to select them, then use the action buttons to delete or perform bulk operations."
    // },
  ];

  const quickLinks = [
    {
      id: 1,
      icon: "📧",
      title: "Email Support",
      subtitle: "support@notesapp.com",
      action: () => Linking.openURL("mailto:support@notesapp.com")
    },
    {
      id: 2,
      icon: "🌐",
      title: "Visit Website",
      subtitle: "www.notesapp.com",
      action: () => Linking.openURL("https://www.notesapp.com")
    },
    {
      id: 3,
      icon: "💬",
      title: "Live Chat",
      subtitle: "Chat with support team",
      action: () => CustomAlert.alert("Live Chat", "Live chat feature coming soon!", [{ text: "OK" }])
    },
    {
      id: 4,
      icon: "📱",
      title: "Contact Us",
      subtitle: "Send us a message",
      action: () => setShowContactModal(true)
    },
  ];

//   const tutorials = [
//     {
//       id: 1,
//       icon: "🎬",
//       title: "Getting Started",
//       duration: "3 min",
//       description: "Learn the basics of creating and managing notes"
//     },
//     {
//       id: 2,
//       icon: "📁",
//       title: "Using Spaces",
//       duration: "2 min",
//       description: "Organize notes into different workspaces"
//     },
//     {
//       id: 3,
//       icon: "⭐",
//       title: "Favorites & Archive",
//       duration: "2 min",
//       description: "Master note organization features"
//     },
//     {
//       id: 4,
//       icon: "📎",
//       title: "Attachments Guide",
//       duration: "4 min",
//       description: "Add photos, videos, and files to notes"
//     },
//   ];

  const toggleFAQ = (id) => {
    // Initialize animation value if it doesn't exist
    if (!faqAnimations[id]) {
      faqAnimations[id] = new Animated.Value(0);
    }

    const isExpanding = expandedFAQ !== id;
    
    // Animate the expansion/collapse
    Animated.timing(faqAnimations[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    setExpandedFAQ(isExpanding ? id : null);
  };

  const handleSubmitContact = () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      CustomAlert.alert("Required Fields", "Please fill in all fields", [{ text: "OK" }]);
      return;
    }

    // Here you would typically send the contact form data to your backend
    CustomAlert.alert(
      "Message Sent",
      "Thank you for contacting us! We'll get back to you within 24 hours.",
      [{ 
        text: "OK",
        onPress: () => {
          setShowContactModal(false);
          setContactName("");
          setContactEmail("");
          setContactMessage("");
        }
      }]
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>We are here to help</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
          <View style={styles.quickLinksGrid}>
            {quickLinks.map((link) => (
              <TouchableOpacity
                key={link.id}
                style={styles.quickLinkCard}
                onPress={link.action}
                activeOpacity={0.8}
              >
                <Text style={styles.quickLinkIcon}>{link.icon}</Text>
                <Text style={styles.quickLinkTitle}>{link.title}</Text>
                <Text style={styles.quickLinkSubtitle}>{link.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Video Tutorials */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>📺 Video Tutorials</Text>
          {tutorials.map((tutorial) => (
            <TouchableOpacity
              key={tutorial.id}
              style={styles.tutorialCard}
              activeOpacity={0.8}
              onPress={() => CustomAlert.alert("Tutorial", "Video tutorial coming soon!", [{ text: "OK" }])}
            >
              <View style={styles.tutorialIcon}>
                <Text style={styles.tutorialIconText}>{tutorial.icon}</Text>
              </View>
              <View style={styles.tutorialContent}>
                <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
                <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
              </View>
              <View style={styles.tutorialMeta}>
                <Text style={styles.tutorialDuration}>{tutorial.duration}</Text>
                <Text style={styles.tutorialArrow}>▶</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
          {faqs.map((faq) => {
            // Initialize animation value if it doesn't exist
            if (!faqAnimations[faq.id]) {
              faqAnimations[faq.id] = new Animated.Value(0);
            }

            const isExpanded = expandedFAQ === faq.id;
            const animatedHeight = faqAnimations[faq.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200], // Adjust max height as needed
            });

            const animatedOpacity = faqAnimations[faq.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            return (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleFAQ(faq.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <Animated.Text
                    style={[
                      styles.faqChevron,
                      {
                        transform: [
                          {
                            rotate: faqAnimations[faq.id].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['90deg', '270deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    ›
                  </Animated.Text>
                </TouchableOpacity>
                
                <Animated.View
                  style={[
                    styles.faqAnswerContainer,
                    {
                      maxHeight: animatedHeight,
                      opacity: animatedOpacity,
                    },
                  ]}
                >
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                </Animated.View>
              </View>
            );
          })}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ App Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>Nov 2024</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>React Native</Text>
            </View>
          </View>
        </View>

        {/* Still Need Help */}
        <View style={styles.needHelpCard}>
          <Text style={styles.needHelpIcon}>💡</Text>
          <Text style={styles.needHelpTitle}>Still need help?</Text>
          <Text style={styles.needHelpText}>
            Ca not find what you are looking for? Our support team is ready to assist you.
          </Text>
          <TouchableOpacity
            style={styles.needHelpButton}
            onPress={() => setShowContactModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.needHelpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NotesApp Support Team</Text>
          <Text style={styles.footerSubtext}>Available 24/7 to help you</Text>
        </View>
      </ScrollView>

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowContactModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={contactName}
                onChangeText={setContactName}
                placeholder="Your name"
                placeholderTextColor="#666"
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="your.email@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contactMessage}
                onChangeText={setContactMessage}
                placeholder="How can we help you?"
                placeholderTextColor="#666"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowContactModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSubmitContact}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextPrimary}>Send Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingTop: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  headerSubtitle: {
    color: "#999",
    fontSize: 13,
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  quickLinksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  quickLinkCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  quickLinkIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  quickLinkTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },

  quickLinkSubtitle: {
    color: "#999",
    fontSize: 11,
    textAlign: "center",
  },

  tutorialCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  tutorialIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(34,197,94,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  tutorialIconText: {
    fontSize: 24,
  },

  tutorialContent: {
    flex: 1,
  },

  tutorialTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },

  tutorialDescription: {
    color: "#999",
    fontSize: 13,
  },

  tutorialMeta: {
    alignItems: "center",
  },

  tutorialDuration: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },

  tutorialArrow: {
    color: "#666",
    fontSize: 20,
  },

  faqItem: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },

  faqQuestionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    paddingRight: 12,
  },

  faqChevron: {
    color: "#666",
    fontSize: 24,
    fontWeight: "300",
    transform: [{ rotate: "90deg" }],
  },

  faqChevronExpanded: {
    transform: [{ rotate: "270deg" }],
  },

  faqAnswer: {
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },

  faqAnswerText: {
    color: "#999",
    fontSize: 14,
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  infoLabel: {
    color: "#999",
    fontSize: 14,
  },

  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  needHelpCard: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    marginBottom: 32,
  },

  needHelpIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  needHelpTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },

  needHelpText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },

  needHelpButton: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },

  needHelpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },

  footerText: {
    color: "#666",
    fontSize: 14,
    marginBottom: 4,
  },

  footerSubtext: {
    color: "#555",
    fontSize: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxHeight: "90%",
  },

  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },

  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: "#fff",
    fontSize: 18,
  },

  modalContent: {
    padding: 20,
    maxHeight: 400,
  },

  inputLabel: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },

  textArea: {
    height: 120,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  modalButtonPrimary: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  modalButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});