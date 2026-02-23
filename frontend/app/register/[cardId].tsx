import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CardInfo {
  card_id: string;
  card_name: string;
  business_name: string;
  max_points: number;
  reward_description: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  logo_base64?: string;
}

export default function CustomerRegisterScreen() {
  const { cardId } = useLocalSearchParams();
  const router = useRouter();
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCardInfo();
  }, [cardId]);

  const fetchCardInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/public/card/${cardId}`);
      if (response.ok) {
        const data = await response.json();
        setCardInfo(data);
      } else {
        setError('Karte nicht gefunden');
      }
    } catch (err) {
      console.error('Failed to fetch card:', err);
      setError('Fehler beim Laden der Karte');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!customerName.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie Ihren Namen ein');
      return;
    }

    setRegistering(true);
    try {
      const response = await fetch(`${API_URL}/api/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: cardId,
          customer_name: customerName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to wallet page
        router.replace(`/wallet/${data.customer_card_id}`);
      } else {
        const err = await response.json();
        Alert.alert('Fehler', err.detail || 'Registrierung fehlgeschlagen');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      Alert.alert('Fehler', 'Registrierung fehlgeschlagen');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Laden...</Text>
      </View>
    );
  }

  if (error || !cardInfo) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>{error || 'Fehler'}</Text>
        <Text style={styles.errorText}>Diese Treuekarte existiert nicht mehr.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardInfo.primary_color }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with Logo */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: cardInfo.secondary_color }]}>
                {cardInfo.logo_base64 ? (
                  <Image
                    source={{ uri: cardInfo.logo_base64 }}
                    style={styles.logo}
                  />
                ) : (
                  <Ionicons name="card" size={40} color={cardInfo.text_color} />
                )}
              </View>
            </View>

            {/* Business Info */}
            <View style={styles.businessInfo}>
              <Text style={[styles.businessName, { color: cardInfo.text_color }]}>
                {cardInfo.business_name}
              </Text>
              <Text style={[styles.cardName, { color: cardInfo.text_color + 'CC' }]}>
                {cardInfo.card_name}
              </Text>
            </View>

            {/* Reward Info */}
            <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="gift" size={24} color={cardInfo.text_color} />
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardLabel, { color: cardInfo.text_color + 'AA' }]}>
                  Sammle {cardInfo.max_points} Punkte und erhalte:
                </Text>
                <Text style={[styles.rewardDescription, { color: cardInfo.text_color }]}>
                  {cardInfo.reward_description}
                </Text>
              </View>
            </View>

            {/* Registration Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Jetzt Treuekarte holen!</Text>
              <Text style={styles.formSubtitle}>
                Geben Sie Ihren Namen ein, um Ihre persönliche Treuekarte zu erhalten.
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ihr Name"
                  placeholderTextColor="#64748B"
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>

              <TouchableOpacity
                style={[styles.registerButton, registering && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#FFFFFF" />
                    <Text style={styles.registerButtonText}>Treuekarte erstellen</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.privacyText}>
                Mit der Registrierung akzeptieren Sie die Datenschutzbestimmungen.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  businessInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  businessName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 18,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    color: '#1E293B',
    fontSize: 16,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 52,
    gap: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
  },
});
