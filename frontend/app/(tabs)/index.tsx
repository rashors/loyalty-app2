import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import storage from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Stats {
  total_cards: number;
  total_customers: number;
  total_points_given: number;
  total_redemptions: number;
  recent_transactions: any[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/stats`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
        <View style={styles.header}>
          <Text style={styles.greeting}>Hallo, {user?.business_name || user?.name}</Text>
          <Text style={styles.subtitle}>Hier ist Ihre Übersicht</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="card-outline"
            label="Treuekarten"
            value={stats?.total_cards || 0}
            color="#6366F1"
          />
          <StatCard
            icon="people-outline"
            label="Kunden"
            value={stats?.total_customers || 0}
            color="#10B981"
          />
          <StatCard
            icon="star-outline"
            label="Punkte vergeben"
            value={stats?.total_points_given || 0}
            color="#F59E0B"
          />
          <StatCard
            icon="gift-outline"
            label="Einlösungen"
            value={stats?.total_redemptions || 0}
            color="#EC4899"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letzte Aktivitäten</Text>
          {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
            stats.recent_transactions.map((tx, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: tx.type === 'add' ? '#10B98120' : '#EC489920' }
                ]}>
                  <Ionicons
                    name={tx.type === 'add' ? 'add-circle' : 'gift'}
                    size={20}
                    color={tx.type === 'add' ? '#10B981' : '#EC4899'}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {tx.type === 'add' 
                      ? `+${tx.points} Punkte vergeben`
                      : 'Belohnung eingelöst'
                    }
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(tx.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#475569" />
              <Text style={styles.emptyStateText}>Noch keine Aktivitäten</Text>
            </View>
          )}
        </View>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
});
