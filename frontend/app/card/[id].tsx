import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import storage from '@/src/utils/storage';
import { useAuth } from '@/src/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#3B82F6', '#1E293B', '#374151',
];

const POINTS_LABELS = ['Punkte', 'Stempel', 'Sterne', 'Herzen', 'Besuche'];

export default function CardEditor() {
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [cardName, setCardName] = useState('');
  const [businessName, setBusinessName] = useState(user?.business_name || '');
  const [maxPoints, setMaxPoints] = useState('10');
  const [rewardDescription, setRewardDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366F1');
  const [secondaryColor, setSecondaryColor] = useState('#818CF8');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [backgroundBase64, setBackgroundBase64] = useState<string | null>(null);
  const [pointsLabel, setPointsLabel] = useState('Punkte');

  useEffect(() => {
    if (!isNew) {
      fetchCard();
    }
  }, [id]);

  const fetchCard = async () => {
    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/cards/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (response.ok) {
        const card = await response.json();
        setCardName(card.card_name);
        setBusinessName(card.business_name);
        setMaxPoints(card.max_points.toString());
        setRewardDescription(card.reward_description);
        setPrimaryColor(card.primary_color);
        setSecondaryColor(card.secondary_color);
        setTextColor(card.text_color);
        setLogoBase64(card.logo_base64);
        setBackgroundBase64(card.background_base64);
        setPointsLabel(card.points_label || 'Punkte');
      }
    } catch (error) {
      console.error('Failed to fetch card:', error);
      Alert.alert('Fehler', 'Karte konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickBackground = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setBackgroundBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const saveCard = async () => {
    if (!cardName.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Kartennamen ein');
      return;
    }
    if (!businessName.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Geschäftsnamen ein');
      return;
    }
    if (!rewardDescription.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie eine Belohnung ein');
      return;
    }

    setSaving(true);
    try {
      const token = await storage.getItem('session_token');
      const cardData = {
        card_name: cardName.trim(),
        business_name: businessName.trim(),
        max_points: parseInt(maxPoints) || 10,
        reward_description: rewardDescription.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        text_color: textColor,
        logo_base64: logoBase64,
        background_base64: backgroundBase64,
        points_label: pointsLabel,
      };

      const response = await fetch(
        isNew ? `${API_URL}/api/cards` : `${API_URL}/api/cards/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(cardData),
          credentials: 'include',
        }
      );

      if (response.ok) {
        const savedCard = await response.json();
        if (isNew) {
          // Navigate to QR code page for new cards
          router.replace(`/card/${savedCard.card_id}/qrcode`);
        } else {
          Alert.alert(
            'Erfolg',
            'Karte aktualisiert!',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } else {
        const error = await response.json();
        Alert.alert('Fehler', error.detail || 'Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isNew ? 'Neue Karte' : 'Karte bearbeiten'}
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveCard}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionLabel}>Vorschau</Text>
            <View style={[styles.cardPreview, { backgroundColor: primaryColor }]}>
              {backgroundBase64 && (
                <Image
                  source={{ uri: backgroundBase64 }}
                  style={styles.cardBackground}
                  resizeMode="cover"
                />
              )}
              <View style={styles.cardPreviewContent}>
                <View style={styles.cardPreviewHeader}>
                  {logoBase64 ? (
                    <Image source={{ uri: logoBase64 }} style={styles.cardLogoImage} />
                  ) : (
                    <View style={[styles.cardLogo, { backgroundColor: secondaryColor }]}>
                      <Ionicons name="card" size={20} color={textColor} />
                    </View>
                  )}
                </View>
                <Text style={[styles.cardPreviewName, { color: textColor }]}>
                  {cardName || 'Kartenname'}
                </Text>
                <Text style={[styles.cardPreviewBusiness, { color: textColor + 'CC' }]}>
                  {businessName || 'Geschäftsname'}
                </Text>
                <View style={styles.cardPreviewFooter}>
                  <View>
                    <Text style={[styles.cardPreviewPointsLabel, { color: textColor + 'AA' }]}>
                      {pointsLabel}
                    </Text>
                    <Text style={[styles.cardPreviewPoints, { color: textColor }]}>
                      0 / {maxPoints || 10}
                    </Text>
                  </View>
                <View style={[styles.cardPreviewReward, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="gift" size={14} color={textColor} />
                  <Text style={[styles.cardPreviewRewardText, { color: textColor }]}>
                    {rewardDescription || 'Belohnung'}
                  </Text>
                </View>
              </View>
              </View>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kartenname</Text>
              <TextInput
                style={styles.input}
                value={cardName}
                onChangeText={setCardName}
                placeholder="z.B. Kaffee-Treuekarte"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Geschäftsname</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Ihr Geschäftsname"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Punkte bis zur Belohnung</Text>
              <TextInput
                style={styles.input}
                value={maxPoints}
                onChangeText={setMaxPoints}
                placeholder="10"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Belohnung</Text>
              <TextInput
                style={styles.input}
                value={rewardDescription}
                onChangeText={setRewardDescription}
                placeholder="z.B. Gratis Kaffee"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bezeichnung für Punkte</Text>
              <View style={styles.labelPicker}>
                {POINTS_LABELS.map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.labelOption,
                      pointsLabel === label && styles.labelOptionSelected,
                    ]}
                    onPress={() => setPointsLabel(label)}
                  >
                    <Text
                      style={[
                        styles.labelOptionText,
                        pointsLabel === label && styles.labelOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Colors */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Design</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hauptfarbe</Text>
              <View style={styles.colorPicker}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      primaryColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setPrimaryColor(color)}
                  >
                    {primaryColor === color && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Akzentfarbe</Text>
              <View style={styles.colorPicker}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      secondaryColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSecondaryColor(color)}
                  >
                    {secondaryColor === color && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Textfarbe</Text>
              <View style={styles.textColorPicker}>
                <TouchableOpacity
                  style={[
                    styles.textColorOption,
                    { backgroundColor: '#FFFFFF' },
                    textColor === '#FFFFFF' && styles.colorOptionSelected,
                  ]}
                  onPress={() => setTextColor('#FFFFFF')}
                >
                  {textColor === '#FFFFFF' && (
                    <Ionicons name="checkmark" size={16} color="#000000" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.textColorOption,
                    { backgroundColor: '#000000' },
                    textColor === '#000000' && styles.colorOptionSelected,
                  ]}
                  onPress={() => setTextColor('#000000')}
                >
                  {textColor === '#000000' && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.logoButton} onPress={pickLogo}>
              <Ionicons name="image-outline" size={20} color="#6366F1" />
              <Text style={styles.logoButtonText}>
                {logoBase64 ? 'Logo ändern' : 'Logo hinzufügen'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoButton} onPress={pickBackground}>
              <Ionicons name="images-outline" size={20} color="#6366F1" />
              <Text style={styles.logoButtonText}>
                {backgroundBase64 ? 'Hintergrund ändern' : 'Hintergrundbild hinzufügen'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  scrollContent: {
    padding: 20,
  },
  previewSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardPreview: {
    borderRadius: 20,
    padding: 20,
    minHeight: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  cardPreviewContent: {
    position: 'relative',
    zIndex: 1,
  },
  cardPreviewHeader: {
    marginBottom: 16,
  },
  cardLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  cardPreviewName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardPreviewBusiness: {
    fontSize: 13,
    marginBottom: 16,
  },
  cardPreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  cardPreviewPointsLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  cardPreviewPoints: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardPreviewReward: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  cardPreviewRewardText: {
    fontSize: 11,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  textColorPicker: {
    flexDirection: 'row',
    gap: 10,
  },
  textColorOption: {
    width: 50,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  labelPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  labelOptionSelected: {
    backgroundColor: '#6366F1',
  },
  labelOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  labelOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    marginTop: 12,
    gap: 8,
  },
  logoButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
});
