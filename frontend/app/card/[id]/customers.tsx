import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import storage from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Customer {
  customer_card_id: string;
  customer_name: string;
  customer_email?: string;
  current_points: number;
  total_points_earned: number;
  rewards_redeemed: number;
  last_visit?: string;
  visit_count: number;
  created_at: string;
}

interface CardInfo {
  card_name: string;
  max_points: number;
}

export default function CustomersScreen() {
  const { cardId } = useLocalSearchParams();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const token = await storage.getItem('session_token');
      
      // Fetch card info
      const cardResponse = await fetch(`${API_URL}/api/cards/${cardId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (cardResponse.ok) {
        const card = await cardResponse.json();
        setCardInfo({ card_name: card.card_name, max_points: card.max_points });
      }

      // Fetch customers
      const response = await fetch(`${API_URL}/api/cards/${cardId}/customers`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nie';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeSince = (dateString?: string) => {
    if (!dateString) return 'Nie besucht';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    if (diffDays < 30) return `Vor ${Math.floor(diffDays / 7)} Wochen`;
    return `Vor ${Math.floor(diffDays / 30)} Monaten`;
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Kunden</Text>
          <Text style={styles.headerSubtitle}>{cardInfo?.card_name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.customerCount}>{customers.length}</Text>
        </View>
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
        {customers.length > 0 ? (
          customers.map((customer) => (
            <TouchableOpacity
              key={customer.customer_card_id}
              style={styles.customerCard}
              onPress={() => router.push(`/customer/${customer.customer_card_id}`)}
            >
              <View style={styles.customerHeader}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.avatarText}>
                    {customer.customer_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.customer_name}</Text>
                  <Text style={styles.lastVisit}>{getTimeSince(customer.last_visit)}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>
                    {customer.current_points}/{cardInfo?.max_points || 10}
                  </Text>
                </View>
              </View>

              <View style={styles.customerStats}>
                <View style={styles.stat}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.statValue}>{customer.total_points_earned}</Text>
                  <Text style={styles.statLabel}>Punkte gesamt</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="gift" size={16} color="#EC4899" />
                  <Text style={styles.statValue}>{customer.rewards_redeemed}</Text>
                  <Text style={styles.statLabel}>Eingelöst</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="calendar" size={16} color="#10B981" />
                  <Text style={styles.statValue}>{customer.visit_count || 1}</Text>
                  <Text style={styles.statLabel}>Besuche</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={64} color="#475569" />
            </View>
            <Text style={styles.emptyTitle}>Noch keine Kunden</Text>
            <Text style={styles.emptyText}>
              Sobald Kunden sich für diese Karte registrieren, erscheinen sie hier.
            </Text>
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
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  headerRight: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  customerCount: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  lastVisit: {
    fontSize: 12,
    color: '#94A3B8',
  },
  pointsBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
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
  },
});
