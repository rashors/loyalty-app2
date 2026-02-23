import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import storage from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LoyaltyCard {
  card_id: string;
  card_name: string;
  business_name: string;
  primary_color: string;
  text_color: string;
  max_points: number;
  reward_description: string;
}

export default function CardQRCodeScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // The registration URL for customers
  const registrationUrl = `${API_URL?.replace('/api', '')}/register/${id}`;

  useEffect(() => {
    fetchCardAndQR();
  }, [id]);

  const fetchCardAndQR = async () => {
    try {
      const token = await storage.getItem('session_token');
      
      // Fetch card details
      const cardResponse = await fetch(`${API_URL}/api/cards/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (cardResponse.ok) {
        const cardData = await cardResponse.json();
        setCard(cardData);
      }

      // Generate QR code for registration URL
      const qrResponse = await fetch(`${API_URL}/api/cards/${id}/qrcode`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        setQrCode(qrData.qr_code);
      }
    } catch (error) {
      console.error('Failed to fetch card/QR:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareQRCode = async () => {
    try {
      await Share.share({
        message: `Registrieren Sie sich für die Treuekarte von ${card?.business_name}: ${registrationUrl}`,
        url: registrationUrl,
      });
    } catch (error) {
      console.error('Share error:', error);
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR-Code für Kunden</Text>
        <TouchableOpacity style={styles.shareButton} onPress={shareQRCode}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Card Info */}
        <View style={[styles.cardPreview, { backgroundColor: card?.primary_color || '#6366F1' }]}>
          <Text style={[styles.cardName, { color: card?.text_color || '#FFFFFF' }]}>
            {card?.card_name}
          </Text>
          <Text style={[styles.businessName, { color: (card?.text_color || '#FFFFFF') + 'CC' }]}>
            {card?.business_name}
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Kunden-Registrierung</Text>
          <Text style={styles.qrSubtitle}>
            Kunden scannen diesen Code, um ihre Treuekarte zu erhalten
          </Text>
          
          <View style={styles.qrContainer}>
            {qrCode ? (
              <Image
                source={{ uri: `data:image/png;base64,${qrCode}` }}
                style={styles.qrCode}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code" size={100} color="#CBD5E1" />
              </View>
            )}
          </View>

          <View style={styles.urlContainer}>
            <Text style={styles.urlLabel}>Link zur Registrierung:</Text>
            <Text style={styles.urlText} numberOfLines={2}>
              {registrationUrl}
            </Text>
          </View>
        </View>

        {/* Customer List Button */}
        <TouchableOpacity
          style={styles.customersButton}
          onPress={() => router.push(`/card/${id}/customers`)}
        >
          <Ionicons name="people" size={20} color="#FFFFFF" />
          <Text style={styles.customersButtonText}>Kundenliste anzeigen</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>So funktioniert's:</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Drucken Sie den QR-Code aus oder zeigen Sie ihn im Laden</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Kunden scannen den Code mit ihrem Handy</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Kunden geben ihren Namen ein und erhalten ihre Karte</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  cardPreview: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
  },
  qrSection: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlContainer: {
    width: '100%',
  },
  urlLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 12,
    color: '#6366F1',
    textAlign: 'center',
  },
  customersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  customersButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  instructions: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
  },
});
