import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Modal, Linking, Platform } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import MapView, { Marker, Circle, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/utils/supabase';
import { AQICard } from '@/components/AQICard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { fetchAirQuality } from '@/utils/airQuality';
import BluetoothManager from '@/components/BluetoothManager';
import SOSButton, { sendAutoEmergencySMS } from '@/components/SOSButton';
import TestPredictiveRiskAPIs from '@/components/TestPredictiveRiskAPIs';
import PredictiveRiskAlert from '@/components/PredictiveRiskAlert';
import { getRemainingDoses } from '@/utils/inhalerCounter';
import { sendRedZoneAlert } from '@/utils/notificationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type Hospital = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  vicinity?: string;
  distance?: number;
  type: 'hospital' | 'pharmacy';
};

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [triggers, setTriggers] = useState<InhalerTrigger[]>([]);
  const [redZones, setRedZones] = useState<RedZone[]>([]);
  const [selectedTrigger, setSelectedTrigger] = useState<InhalerTrigger | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [bluetoothModalVisible, setBluetoothModalVisible] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [showingHospitals, setShowingHospitals] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [remainingDoses, setRemainingDoses] = useState<number>(30);
  const [testApisModalVisible, setTestApisModalVisible] = useState(false);
  const [riskMonitorModalVisible, setRiskMonitorModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [directionModalVisible, setDirectionModalVisible] = useState(false);
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const lastRedZoneAlertRef = useRef<{ zoneId: string; timestamp: number } | null>(null);
  const RED_ZONE_RADIUS_METERS = 500;
  const RED_ZONE_ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  const mapBottomPadding = 350 + insets.bottom;
  const floatingButtonOffset = 64 + insets.bottom;
  const triggerButtonOffset = 60 + insets.bottom;

  // Debug: Monitor hospitals state changes
  useEffect(() => {
    console.log('🔄 STATE CHANGE - hospitals:', hospitals.length, 'showingHospitals:', showingHospitals, 'loadingHospitals:', loadingHospitals);
    if (hospitals.length > 0) {
      console.log('🏥 Hospitals in state:', hospitals.map(h => ({ name: h.name, lat: h.latitude, lng: h.longitude })));
    }
  }, [hospitals, showingHospitals, loadingHospitals]);

  useEffect(() => {
    console.log('🏥 Hospitals state changed:', hospitals.length, 'Showing:', showingHospitals);
  }, [hospitals, showingHospitals]);

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (isMounted) {
        await initializeLocation();
        await loadTriggers();
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
      // Cleanup: Clear state when component unmounts
      setTriggers([]);
      setRedZones([]);
      setSelectedTrigger(null);
    };
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startLocationWatch = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          timeInterval: 60 * 1000,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    };

    startLocationWatch();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    calculateRedZones();
    
    return () => {
      // Cleanup red zones calculation
      setRedZones([]);
    };
  }, [triggers]);

  // Refresh remaining doses whenever the dashboard gains focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getRemainingDoses()
        .then((val) => {
          if (active) setRemainingDoses(val);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

  // Ensure triggers refresh when returning to this tab (e.g., after deletion in Profile)
  useFocusEffect(
    React.useCallback(() => {
      loadTriggers();
      return () => {};
    }, [])
  );

  // Load inhaler remaining doses on mount and when triggers list updates
  useEffect(() => {
    getRemainingDoses().then(setRemainingDoses).catch(() => {});
  }, [triggers]);

  useEffect(() => {
    if (location) {
      checkRedZoneProximity(location);
    }
  }, [location, redZones]);

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
      
      // Auto-zoom to user location after map loads
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      }, 500);
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

  const checkRedZoneProximity = (currentLocation: Location.LocationObject) => {
    if (!currentLocation || redZones.length === 0) return;

    const { latitude, longitude } = currentLocation.coords;

    const activeZone = redZones.find((zone) => {
      const distance = getDistance(latitude, longitude, zone.latitude, zone.longitude);
      return distance <= RED_ZONE_RADIUS_METERS;
    });

    if (activeZone) {
      const zoneId = `${activeZone.latitude.toFixed(4)}-${activeZone.longitude.toFixed(4)}`;
      const now = Date.now();
      const lastAlert = lastRedZoneAlertRef.current;

      if (!lastAlert || lastAlert.zoneId !== zoneId || now - lastAlert.timestamp > RED_ZONE_ALERT_COOLDOWN_MS) {
        lastRedZoneAlertRef.current = { zoneId, timestamp: now };
        sendRedZoneAlert(activeZone.count).catch((error) => console.error('Failed to send red zone alert', error));
      }
    } else {
      lastRedZoneAlertRef.current = null;
    }
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
        Alert.alert('✅ Trigger Recorded', 'Inhaler use recorded. Sending emergency alert to contacts...');
        loadTriggers();
        // Decrement inhaler dose counter
        const { decrementDose } = await import('@/utils/inhalerCounter').then(m => m);
        await decrementDose();
        
        // Automatically send SOS to emergency contacts
        await sendAutoEmergencySMS();
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
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });
    }
  };

  const fetchNearbyHospitals = async () => {
    console.log('🏥 fetchNearbyHospitals called');

    if (!location) {
      console.log('❌ No location available');
      Alert.alert('Error', 'Location not available');
      return;
    }

    const radius = 5000;
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const overpassEndpoints = [
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass-api.de/api/interpreter',
      'https://overpass.openstreetmap.ru/cgi/interpreter'
    ];

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lon});
        way["amenity"="hospital"](around:${radius},${lat},${lon});
        node["amenity"="clinic"](around:${radius},${lat},${lon});
        way["amenity"="clinic"](around:${radius},${lat},${lon});
      );
      out center;
    `;

    let parsed: any | null = null;
    let lastError: any = null;

    for (const endpoint of overpassEndpoints) {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      console.log('📡 Trying Overpass endpoint:', endpoint);
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'QAirAsthmaApp/1.0 (contact: support@qair.example)'
          }
        });
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        if (!response.ok) {
          console.warn('⚠️ Non-OK response:', response.status, text.slice(0, 120));
          lastError = new Error(`Endpoint ${endpoint} returned ${response.status}`);
          continue;
        }
        if (!contentType.includes('application/json')) {
          // Likely HTML error page -> skip
          console.warn('⚠️ Unexpected content-type (expect JSON):', contentType, 'First chars:', text.slice(0, 60));
          lastError = new Error('Unexpected content type');
          continue;
        }
        try {
          parsed = JSON.parse(text);
          break; // success
        } catch (jsonErr) {
          console.error('❌ JSON parse failed for endpoint', endpoint, jsonErr);
          lastError = jsonErr;
        }
      } catch (err) {
        console.error('❌ Fetch error for endpoint', endpoint, err);
        lastError = err;
        continue;
      }
    }

    if (!parsed) {
      console.error('❌ All Overpass attempts failed:', lastError);
      Alert.alert('Error', 'Failed to fetch hospitals (Overpass unavailable). Please try again later.');
      setLoadingHospitals(false);
      return;
    }

    console.log('📦 Data parsed, elements:', parsed.elements?.length || 0);
    if (parsed.elements && parsed.elements.length > 0) {
      const hospitalList = parsed.elements
        .map((element: any) => {
          const hospitalLat = element.lat || element.center?.lat;
          const hospitalLon = element.lon || element.center?.lon;
          if (!hospitalLat || !hospitalLon) return null;
          return {
            id: element.id?.toString() || `hospital-${Math.random()}`,
            name: element.tags?.name || 'Unnamed Hospital',
            latitude: hospitalLat,
            longitude: hospitalLon,
            vicinity: element.tags?.['addr:street'] || '',
            distance: getDistance(lat, lon, hospitalLat, hospitalLon),
            type: 'hospital' as const,
          };
        })
        .filter((h: any) => h !== null)
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 5);

      setHospitals(hospitalList);
      setShowingHospitals(true);

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 1000);
      }
      Alert.alert('Success', `Found ${hospitalList.length} nearest hospitals`);
    } else {
      Alert.alert('No Results', 'No hospitals found nearby');
    }
    setLoadingHospitals(false);
  };

  const toggleHospitals = async () => {
    console.log('🔘 Toggle button pressed');
    console.log('Current state - loadingHospitals:', loadingHospitals, 'showingHospitals:', showingHospitals, 'hospitals.length:', hospitals.length);
    
    if (loadingHospitals) {
      console.log('⏳ Already loading, ignoring...');
      return;
    }

    if (showingHospitals) {
      console.log('👻 Hiding hospitals');
      setHospitals([]);
      setShowingHospitals(false);
    } else {
      console.log('👀 Showing hospitals - starting fetch...');
      setLoadingHospitals(true);
      await fetchNearbyHospitals();
      console.log('✅ Fetch complete, final state - hospitals.length:', hospitals.length, 'showingHospitals:', showingHospitals);
    }
  };

  const openDirections = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setDirectionModalVisible(true);
  };

  const navigateToHospital = () => {
    if (!selectedHospital) return;

    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    
    const latLng = `${selectedHospital.latitude},${selectedHospital.longitude}`;
    const label = encodeURIComponent(selectedHospital.name);
    
    const url = Platform.select({
      ios: `${scheme}?daddr=${latLng}&dirflg=d`,
      android: `${scheme}${latLng}?q=${latLng}(${label})`,
    });

    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
          setDirectionModalVisible(false);
        } else {
          // Fallback to Google Maps web
          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}&destination_place_id=${selectedHospital.name}`;
          Linking.openURL(googleMapsUrl);
          setDirectionModalVisible(false);
        }
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
            mapType="standard"
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onMapReady={() => setMapReady(true)}
            loadingEnabled
            loadingIndicatorColor="#6366F1"
            loadingBackgroundColor="#ffffff"
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            showsScale
            showsPointsOfInterest={true}
            showsBuildings={true}
            showsTraffic={false}
            mapPadding={{ top: 0, right: 0, bottom: mapBottomPadding, left: 0 }}>
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

            {/* Hospital Markers */}
            {showingHospitals && hospitals.map((facility) => {
              console.log('🏥 Rendering marker for:', facility.name, 'at', facility.latitude, facility.longitude);
              return (
              <Marker
                key={facility.id}
                coordinate={{
                  latitude: facility.latitude,
                  longitude: facility.longitude,
                }}
                pinColor="#3B82F6"
                title={facility.name}
                description={`${((facility.distance || 0) / 1000).toFixed(2)} km away`}
                onPress={() => openDirections(facility)}
              />
            );
            })}
          </MapView>
        )}

        {/* Floating Action Buttons */}
        <View className="absolute right-6 space-y-3" style={{ bottom: floatingButtonOffset }}>
          {/* SOS Button */}
          <SOSButton />
          
          <View className="h-4" />
          
          {/* Risk Monitor Button */}
          <TouchableOpacity
            onPress={() => setRiskMonitorModalVisible(true)}
            className="bg-yellow-500 w-16 h-16 rounded-full items-center justify-center shadow-2xl"
            style={{ elevation: 8 }}>
            <Ionicons name="shield-checkmark" size={32} color="white" />
          </TouchableOpacity>
          
          {/* API Test Button */}
          <TouchableOpacity
            onPress={() => setTestApisModalVisible(true)}
            className="bg-purple-500 w-16 h-16 rounded-full items-center justify-center shadow-2xl"
            style={{ elevation: 8 }}>
            <Ionicons name="flask" size={32} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={toggleHospitals}
            className={`${showingHospitals ? 'bg-green-500' : 'bg-white'} w-16 h-16 rounded-full items-center justify-center shadow-2xl mb-3`}
            style={{ elevation: 8 }}
            disabled={loadingHospitals}>
            {loadingHospitals ? (
              <ActivityIndicator size="small" color={showingHospitals ? 'white' : '#6366F1'} />
            ) : (
              <Ionicons 
                name="medical" 
                size={32} 
                color={showingHospitals ? 'white' : '#6366F1'} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={centerOnLocation}
            className="bg-white w-16 h-16 rounded-full items-center justify-center shadow-2xl"
            style={{ elevation: 8 }}>
            <Ionicons name="locate" size={32} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Add Trigger Button */}
        <View className="absolute self-center" style={{ bottom: triggerButtonOffset }}>
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
                onTriggerRecorded={async () => {
                  // Refresh triggers list and remaining doses after a physical trigger
                  try {
                    await loadTriggers();
                  } catch {}
                  try {
                    const v = await getRemainingDoses();
                    setRemainingDoses(v);
                  } catch {}
                }}
              />
            </View>
          </View>
        </Modal>

        {/* API Test Modal */}
        <Modal
          visible={testApisModalVisible}
          animationType="slide"
          onRequestClose={() => setTestApisModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>API Test Suite</Text>
              <TouchableOpacity
                onPress={() => setTestApisModalVisible(false)}
                style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="#6366F1" />
              </TouchableOpacity>
            </View>
            <TestPredictiveRiskAPIs />
          </View>
        </Modal>

        {/* Risk Monitor Modal */}
        <Modal
          visible={riskMonitorModalVisible}
          animationType="slide"
          onRequestClose={() => setRiskMonitorModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Risk Monitor</Text>
              <TouchableOpacity
                onPress={() => setRiskMonitorModalVisible(false)}
                style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="#6366F1" />
              </TouchableOpacity>
            </View>
            <PredictiveRiskAlert />
          </View>
        </Modal>

        {/* Direction Modal - Centered */}
        <Modal
          visible={directionModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setDirectionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxHeight: 'auto', padding: 24 }]}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View 
                  className="bg-blue-500 w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ elevation: 8 }}>
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>
                    H
                  </Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 8 }}>
                  {selectedHospital?.name}
                </Text>
                {selectedHospital?.vicinity && (
                  <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 }}>
                    {selectedHospital.vicinity}
                  </Text>
                )}
                <Text style={{ fontSize: 16, color: '#6366F1', fontWeight: '600' }}>
                  {((selectedHospital?.distance || 0) / 1000).toFixed(2)} km away
                </Text>
              </View>

              <TouchableOpacity
                onPress={navigateToHospital}
                style={{
                  backgroundColor: '#6366F1',
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                <Ionicons name="navigate" size={24} color="white" />
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
                  Get Directions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDirectionModalVisible(false)}
                style={{
                  backgroundColor: '#E5E7EB',
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  alignItems: 'center',
                }}>
                <Text style={{ color: '#4B5563', fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Inhaler Counter Badge */}
        <View style={{ position: 'absolute', top: insets.top + 12, right: 12 }}>
          <View className="bg-white px-3 py-2 rounded-full shadow-md flex-row items-center" style={{ elevation: 4 }}>
            <Ionicons name="medkit" size={16} color="#6366F1" />
            <Text className="text-gray-900 font-bold ml-2">{remainingDoses}/30</Text>
          </View>
        </View>
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
