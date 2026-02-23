import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import storage from '@/src/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ScanResult {
  type: string;
  customer_card_id: string;
  customer_name?: string;
  current_points?: number;
  max_points?: number;
  can_redeem?: boolean;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingPoints, setAddingPoints] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(1);
  const router = useRouter();

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/scan/${encodeURIComponent(data)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setScanResult(result);
      } else {
        const error = await response.json();
        Alert.alert('Fehler', error.detail || 'Ungültiger QR-Code');
        setScanned(false);
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Fehler', 'Scan fehlgeschlagen');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const addPoints = async () => {
    if (!scanResult) return;
    setAddingPoints(true);

    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/points/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_card_id: scanResult.customer_card_id,
          points: selectedPoints,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          'Erfolg',
          result.is_full
            ? `Karte voll! Belohnung: ${result.reward_description}`
            : `+${selectedPoints} Punkte hinzugefügt. Gesamt: ${result.new_points}/${result.max_points}`,
          [{ text: 'OK', onPress: resetScanner }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Fehler', error.detail || 'Punkte hinzufügen fehlgeschlagen');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Punkte hinzufügen fehlgeschlagen');
    } finally {
      setAddingPoints(false);
    }
  };

  const redeemReward = async () => {
    if (!scanResult) return;
    setAddingPoints(true);

    try {
      const token = await storage.getItem('session_token');
      const response = await fetch(`${API_URL}/api/rewards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_card_id: scanResult.customer_card_id,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Erfolg', result.message, [{ text: 'OK', onPress: resetScanner }]);
      } else {
        const error = await response.json();
        Alert.alert('Fehler', error.detail || 'Einlösen fehlgeschlagen');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Einlösen fehlgeschlagen');
    } finally {
      setAddingPoints(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
    setSelectedPoints(1);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="camera-outline" size={64} color="#6366F1" />
          </View>
          <Text style={styles.permissionTitle}>Kamera-Zugriff benötigt</Text>
          <Text style={styles.permissionText}>
            Um QR-Codes zu scannen, benötigen wir Zugriff auf Ihre Kamera
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Zugriff erlauben</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>QR-Code scannen</Text>
        <Text style={styles.subtitle}>Scannen Sie die Kundenkarte</Text>
      </View>

      {!scanResult ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </CameraView>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Verarbeite...</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <View style={styles.customerInfo}>
              <View style={styles.customerAvatar}>
                <Ionicons name="person" size={32} color="#6366F1" />
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{scanResult.customer_name}</Text>
                <Text style={styles.customerPoints}>
                  {scanResult.current_points} / {scanResult.max_points} Punkte
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        ((scanResult.current_points || 0) / (scanResult.max_points || 1)) * 100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {scanResult.can_redeem ? (
              <View style={styles.redeemSection}>
                <View style={styles.redeemBadge}>
                  <Ionicons name="gift" size={20} color="#10B981" />
                  <Text style={styles.redeemBadgeText}>Belohnung verfügbar!</Text>
                </View>
                <TouchableOpacity
                  style={styles.redeemButton}
                  onPress={redeemReward}
                  disabled={addingPoints}
                >
                  {addingPoints ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="gift" size={20} color="#FFFFFF" />
                      <Text style={styles.redeemButtonText}>Belohnung einlösen</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pointsSection}>
                <Text style={styles.pointsSectionTitle}>Punkte hinzufügen</Text>
                <View style={styles.pointsSelector}>
                  {[1, 2, 3, 5].map((points) => (
                    <TouchableOpacity
                      key={points}
                      style={[
                        styles.pointOption,
                        selectedPoints === points && styles.pointOptionSelected,
                      ]}
                      onPress={() => setSelectedPoints(points)}
                    >
                      <Text
                        style={[
                          styles.pointOptionText,
                          selectedPoints === points && styles.pointOptionTextSelected,
                        ]}
                      >
                        +{points}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addPoints}
                  disabled={addingPoints}
                >
                  {addingPoints ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>
                        {selectedPoints} Punkt{selectedPoints > 1 ? 'e' : ''} hinzufügen
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
            <Text style={styles.cancelButtonText}>Neuen Code scannen</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#6366F1',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  customerPoints: {
    fontSize: 14,
    color: '#94A3B8',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  redeemSection: {
    alignItems: 'center',
  },
  redeemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  redeemBadgeText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pointsSection: {},
  pointsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  pointsSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pointOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  pointOptionSelected: {
    backgroundColor: '#6366F1',
  },
  pointOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pointOptionTextSelected: {
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
});
