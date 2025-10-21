import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Stack, router } from 'expo-router';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/utils/supabase';
import { AQICard } from '@/components/AQICard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { fetchAirQuality } from '@/utils/airQuality';
import BluetoothManager from '@/components/BluetoothManager';

type InhalerTrigger = {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  aqi?: number;
  category?: string;
  pm25?: number;
  pm10?: number;
  temperature?: number;
  humidity?: number;
};

type RedZone = {
  latitude: number;
  longitude: number;
  count: number;
};

export default function Dashboard() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [triggers, setTriggers] = useState<InhalerTrigger[]>([]);
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [selectedTrigger, setSelectedTrigger] = useState<InhalerTrigger | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [bluetoothModalVisible, setBluetoothModalVisible] = useState(false);
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    initializeLocation();
    loadTriggers();
  }, []);

  useEffect(() => {
    calculateRedZones();
  }, [triggers]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this app');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
      setLoading(false);
    }
  };

  const loadTriggers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('inhaler_triggers')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error loading triggers:', error);
      } else if (data) {
        setTriggers(data);
      }
    } catch (error) {
      console.error('Error loading triggers:', error);
    }
  };

  const calculateRedZones = () => {
    const zones: RedZone[] = [];
    const radius = 500; // 500 meters

    triggers.forEach((trigger, index) => {
      let nearbyCount = 1;
      const nearbyTriggers = [trigger];

      triggers.forEach((otherTrigger, otherIndex) => {
        if (index !== otherIndex) {
          const distance = getDistance(
            trigger.latitude,
            trigger.longitude,
            otherTrigger.latitude,
            otherTrigger.longitude
          );

          if (distance <= radius) {
            nearbyCount++;
            nearbyTriggers.push(otherTrigger);
          }
        }
      });

      if (nearbyCount >= 5) {
        const centerLat =
          nearbyTriggers.reduce((sum, t) => sum + t.latitude, 0) / nearbyTriggers.length;
        const centerLon =
          nearbyTriggers.reduce((sum, t) => sum + t.longitude, 0) / nearbyTriggers.length;

        const existingZone = zones.find(
          (zone) => getDistance(zone.latitude, zone.longitude, centerLat, centerLon) <= radius
        );

        if (!existingZone) {
          zones.push({
            latitude: centerLat,
            longitude: centerLon,
            count: nearbyCount,
          });
        }
      }
    });

    setRedZones(zones);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleAddTrigger = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch air quality data (mock for now, replace with real API)
      const airQualityData = await fetchAirQuality(
        location.coords.latitude,
        location.coords.longitude
      );

      const { data, error } = await supabase
        .from('inhaler_triggers')
        .insert({
          user_id: user.id,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toISOString(),
          aqi: airQualityData.aqi,
          category: airQualityData.category,
          pm25: airQualityData.pm25,
          pm10: airQualityData.pm10,
          temperature: airQualityData.temperature,
          humidity: airQualityData.humidity,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', 'Failed to record trigger');
      } else {
        Alert.alert('Success', 'Inhaler trigger recorded');
        loadTriggers();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record trigger');
    }
  };



  const handleMarkerPress = (trigger: InhalerTrigger) => {
    // Navigate to detailed weather page
    router.push({
      pathname: '/trigger-details',
      params: {
        latitude: trigger.latitude,
        longitude: trigger.longitude,
        timestamp: trigger.timestamp,
        aqi: trigger.aqi,
        category: trigger.category,
      },
    });
  };

  const handleInhalerConnect = () => {
    setBluetoothModalVisible(true);
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading map..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1">
        <Stack.Screen
          options={{
            title: 'Map',
            headerShown: true,
            headerStyle: { backgroundColor: '#6366F1' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
              <TouchableOpacity
                onPress={handleInhalerConnect}
                className="mr-4 bg-white/20 p-2 rounded-full">
                <Ionicons name="bluetooth" size={24} color="white" />
              </TouchableOpacity>
            ),
          }}
        />

        {/* Map Loading Overlay */}
        {!mapReady && (
          <View className="absolute inset-0 bg-white items-center justify-center z-10">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="text-gray-600 mt-4 text-base">Loading map...</Text>
          </View>
        )}

        {location && (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            mapType="satellite"
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            onMapReady={() => setMapReady(true)}
            loadingEnabled
            loadingIndicatorColor="#6366F1"
            loadingBackgroundColor="#ffffff"
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            showsScale
            mapPadding={{ top: 0, right: 0, bottom: 120, left: 0 }}>
            {/* Inhaler Trigger Markers */}
            {triggers.map((trigger) => (
              <Marker
                key={trigger.id}
                coordinate={{
                  latitude: trigger.latitude,
                  longitude: trigger.longitude,
                }}
                onPress={() => handleMarkerPress(trigger)}>
                <View className="bg-red-500 w-12 h-12 rounded-full items-center justify-center border-3 border-white shadow-xl"
                  style={{ elevation: 8 }}>
                  <Ionicons name="fitness" size={24} color="white" />
                </View>
              </Marker>
            ))}

            {/* Red Zones */}
            {redZones.map((zone, index) => (
              <Circle
                key={`zone-${index}`}
                center={{
                  latitude: zone.latitude,
                  longitude: zone.longitude,
                }}
                radius={500}
                fillColor="rgba(239, 68, 68, 0.2)"
                strokeColor="rgba(239, 68, 68, 0.8)"
                strokeWidth={2}
              />
            ))}
          </MapView>
        )}

        {/* Floating Action Buttons */}
        <View className="absolute right-6 bottom-32 space-y-3">
          <TouchableOpacity
            onPress={centerOnLocation}
            className="bg-white w-16 h-16 rounded-full items-center justify-center shadow-2xl"
            style={{ elevation: 8 }}>
            <Ionicons name="locate" size={32} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Add Trigger Button */}
        <View className="absolute bottom-28 self-center">
          <TouchableOpacity
            onPress={handleAddTrigger}
            className="bg-red-500 px-10 py-5 rounded-full flex-row items-center shadow-2xl"
            style={{ elevation: 10 }}>
            <Ionicons name="add-circle" size={32} color="white" />
            <Text className="text-white font-bold text-lg ml-3">Record Trigger</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet for Marker Details - Deprecated, using navigation instead */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['65%']}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: '#F9FAFB' }}>
          <View className="px-6 py-4">
            <Text className="text-2xl font-bold text-gray-900 mb-4">Location Details</Text>
            {selectedTrigger && (
              <AQICard
                aqi={selectedTrigger.aqi || 0}
                category={selectedTrigger.category || 'Unknown'}
                pm25={selectedTrigger.pm25 || 0}
                pm10={selectedTrigger.pm10 || 0}
                temperature={selectedTrigger.temperature || 0}
                humidity={selectedTrigger.humidity || 0}
              />
            )}
            <Text className="text-gray-500 text-sm mt-4 text-center">
              Recorded on {selectedTrigger?.timestamp ? new Date(selectedTrigger.timestamp).toLocaleString() : ''}
            </Text>
          </View>
        </BottomSheet>

        {/* Bluetooth Device Connection Modal */}
        <Modal
          visible={bluetoothModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBluetoothModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Connect IoT Device</Text>
                <TouchableOpacity
                  onPress={() => setBluetoothModalVisible(false)}
                  style={styles.closeButton}>
                  <Ionicons name="close-circle" size={32} color="#6366F1" />
                </TouchableOpacity>
              </View>
              
              <BluetoothManager
                onDeviceConnected={(device) => {
                  console.log('Device connected:', device);
                  setBluetoothModalVisible(false);
                  Alert.alert(
                    'Connected!',
                    `Successfully connected to ${device.name}. Your device will now sync data automatically.`,
                    [{ text: 'OK' }]
                  );
                }}
                onDeviceDisconnected={() => {
                  console.log('Device disconnected');
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
});
