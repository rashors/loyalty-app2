import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CustomerCardData {
  customer_card_id: string;
  customer_name: string;
  current_points: number;
  max_points: number;
  reward_description: string;
  business_name: string;
  qr_code: string;
  redemption_qr?: string;
  card_design: {
    card_name: string;
    primary_color: string;
    secondary_color: string;
    text_color: string;
    logo_base64?: string;
  };
}

export default function WalletCardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [cardData, setCardData] = useState<CustomerCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCardData();
  }, [id]);

  const fetchCardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customers/${id}/card`);
      if (response.ok) {
        const data = await response.json();
        setCardData(data);
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

  const shareCard = async () => {
    if (!cardData) return;
    
    const shareUrl = `${API_URL}/wallet/${cardData.customer_card_id}`;
    try {
      await Share.share({
        message: `Meine Treuekarte bei ${cardData.business_name}: ${shareUrl}`,
        url: shareUrl,
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
          <Text style={styles.loadingText}>Karte wird geladen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !cardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="card-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>{error || 'Fehler'}</Text>
          <Text style={styles.errorText}>Die Karte konnte nicht geladen werden</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = (cardData.current_points / cardData.max_points) * 100;
  const isFull = cardData.current_points >= cardData.max_points;

  return (
    <View style={[styles.container, { backgroundColor: cardData.card_design.primary_color }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: cardData.card_design.secondary_color }]}>
              {cardData.card_design.logo_base64 ? (
                <Image
                  source={{ uri: cardData.card_design.logo_base64 }}
                  style={styles.logo}
                />
              ) : (
                <Ionicons name="card" size={32} color={cardData.card_design.text_color} />
              )}
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={shareCard}>
              <Ionicons name="share-outline" size={24} color={cardData.card_design.text_color} />
            </TouchableOpacity>
          </View>

          {/* Business Info */}
          <View style={styles.businessInfo}>
            <Text style={[styles.cardName, { color: cardData.card_design.text_color }]}>
              {cardData.card_design.card_name}
            </Text>
            <Text style={[styles.businessName, { color: cardData.card_design.text_color + 'CC' }]}>
              {cardData.business_name}
            </Text>
          </View>

          {/* Customer Name */}
          <View style={[styles.customerBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="person" size={16} color={cardData.card_design.text_color} />
            <Text style={[styles.customerName, { color: cardData.card_design.text_color }]}>
              {cardData.customer_name}
            </Text>
          </View>

          {/* Points Progress */}
          <View style={styles.pointsSection}>
            <View style={styles.pointsHeader}>
              <Text style={[styles.pointsLabel, { color: cardData.card_design.text_color + 'AA' }]}>
                Gesammelte Punkte
              </Text>
              <Text style={[styles.pointsValue, { color: cardData.card_design.text_color }]}>
                {cardData.current_points} / {cardData.max_points}
              </Text>
            </View>
            
            {/* Progress Dots */}
            <View style={styles.progressDots}>
              {Array.from({ length: cardData.max_points }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: index < cardData.current_points
                        ? cardData.card_design.text_color
                        : 'rgba(255,255,255,0.2)',
                    },
                  ]}
                >
                  {index < cardData.current_points && (
                    <Ionicons name="checkmark" size={12} color={cardData.card_design.primary_color} />
                  )}
                </View>
              ))}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: cardData.card_design.text_color,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Reward Info */}
          <View style={[styles.rewardCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={styles.rewardIconContainer}>
              <Ionicons
                name={isFull ? 'gift' : 'gift-outline'}
                size={28}
                color={isFull ? '#10B981' : cardData.card_design.text_color}
              />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={[styles.rewardLabel, { color: cardData.card_design.text_color + 'AA' }]}>
                {isFull ? 'Belohnung bereit!' : 'Ihre Belohnung'}
              </Text>
              <Text style={[styles.rewardDescription, { color: cardData.card_design.text_color }]}>
                {cardData.reward_description}
              </Text>
            </View>
          </View>

          {/* QR Code */}
          <View style={styles.qrSection}>
            <Text style={[styles.qrLabel, { color: cardData.card_design.text_color + 'AA' }]}>
              {isFull ? 'Zeigen Sie diesen Code zum Einlösen' : 'Scannen zum Punkte sammeln'}
            </Text>
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: `data:image/png;base64,${isFull && cardData.redemption_qr ? cardData.redemption_qr : cardData.qr_code}` }}
                style={styles.qrCode}
                resizeMode="contain"
              />
            </View>
            {isFull && (
              <View style={styles.redeemBadge}>
                <Ionicons name="star" size={16} color="#FFFFFF" />
                <Text style={styles.redeemBadgeText}>Jetzt einlösen!</Text>
              </View>
            )}
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessInfo: {
    marginBottom: 16,
  },
  cardName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
  },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  pointsSection: {
    marginBottom: 24,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsLabel: {
    fontSize: 14,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  rewardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 18,
    fontWeight: '600',
  },
  qrSection: {
    alignItems: 'center',
  },
  qrLabel: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  redeemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  redeemBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
