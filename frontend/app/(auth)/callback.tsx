import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { handleOAuthCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        // Get session_id from URL hash or params
        let sessionId = params.session_id as string;
        
        // For web, check hash
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          sessionId = hashParams.get('session_id') || sessionId;
        }

        if (sessionId) {
          await handleOAuthCallback(sessionId);
          router.replace('/(tabs)');
        } else {
          console.error('No session_id found');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        router.replace('/(auth)/login');
      }
    };

    processCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.text}>Authentifizierung...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
});
