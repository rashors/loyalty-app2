import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, label, onPress, danger = false }: { icon: string; label: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, danger && styles.menuIconContainerDanger]}>
        <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : '#6366F1'} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#6366F1" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.business_name || user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geschäft</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="storefront-outline"
              label="Geschäftsdaten bearbeiten"
              onPress={() => Alert.alert('Info', 'Diese Funktion kommt bald!')}
            />
            <MenuItem
              icon="card-outline"
              label="Meine Karten"
              onPress={() => router.push('/(tabs)/cards')}
            />
            <MenuItem
              icon="people-outline"
              label="Kundenliste"
              onPress={() => Alert.alert('Info', 'Diese Funktion kommt bald!')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Einstellungen</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              label="Benachrichtigungen"
              onPress={() => Alert.alert('Info', 'Diese Funktion kommt bald!')}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              label="Datenschutz"
              onPress={() => Alert.alert('Info', 'Diese Funktion kommt bald!')}
            />
            <MenuItem
              icon="help-circle-outline"
              label="Hilfe & Support"
              onPress={() => Alert.alert('Info', 'Diese Funktion kommt bald!')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              label="Abmelden"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366F120',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconContainerDanger: {
    backgroundColor: '#EF444420',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  menuLabelDanger: {
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 8,
  },
});
