import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import storage from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LoyaltyCard {
  card_id: string;
  card_name: string;
  business_name: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  max_points: number;
  reward_description: string;
  logo_base64?: string;
  active: boolean;
}

export default function CardsScreen() {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchCards = useCallback(async () => {
    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/cards`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCards();
  };

  const deleteCard = async (cardId: string) => {
    Alert.alert(
      'Karte löschen',
      'Möchten Sie diese Karte wirklich löschen? Alle Kundendaten werden ebenfalls gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItem('session_token');
              const response = await fetch(`${API_URL}/api/cards/${cardId}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                credentials: 'include',
              });
              if (response.ok) {
                setCards(cards.filter(c => c.card_id !== cardId));
              }
            } catch (error) {
              console.error('Failed to delete card:', error);
            }
          },
        },
      ]
    );
  };

  const CardPreview = ({ card }: { card: LoyaltyCard }) => (
    <View
      style={[
        styles.cardPreview,
        { backgroundColor: card.primary_color }
      ]}
    >
      <View style={styles.cardHeader}>
        <TouchableOpacity 
          style={styles.cardLogo}
          onPress={() => router.push(`/card/${card.card_id}/qrcode`)}
        >
          <Ionicons name="card" size={24} color={card.text_color} />
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.customersButton}
            onPress={() => router.push(`/card/${card.card_id}/customers`)}
          >
            <Ionicons name="people" size={20} color={card.text_color} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.qrButton}
            onPress={() => router.push(`/card/${card.card_id}/qrcode`)}
          >
            <Ionicons name="qr-code" size={20} color={card.text_color} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteCard(card.card_id)}
          >
            <Ionicons name="trash-outline" size={20} color={card.text_color} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => router.push(`/card/${card.card_id}/qrcode`)}>
        <Text style={[styles.cardName, { color: card.text_color }]}>
          {card.card_name}
        </Text>
        <Text style={[styles.businessName, { color: card.text_color + 'CC' }]}>
          {card.business_name}
        </Text>
      </TouchableOpacity>
      <View style={styles.cardFooter}>
        <View style={styles.pointsContainer}>
          <Text style={[styles.pointsLabel, { color: card.text_color + 'AA' }]}>
            Punkte zum Einlösen
          </Text>
          <Text style={[styles.pointsValue, { color: card.text_color }]}>
            {card.max_points}
          </Text>
        </View>
        <View style={styles.rewardContainer}>
          <Ionicons name="gift" size={16} color={card.text_color} />
          <Text style={[styles.rewardText, { color: card.text_color }]}>
            {card.reward_description}
          </Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.title}>Meine Treuekarten</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/card/new')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      >
        {cards.length > 0 ? (
          cards.map((card) => (
            <CardPreview key={card.card_id} card={card} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="card-outline" size={64} color="#475569" />
            </View>
            <Text style={styles.emptyTitle}>Keine Karten</Text>
            <Text style={styles.emptyText}>
              Erstellen Sie Ihre erste Treuekarte, um Kunden zu belohnen
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/card/new')}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Karte erstellen</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  cardPreview: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  qrButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  pointsContainer: {},
  pointsLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
