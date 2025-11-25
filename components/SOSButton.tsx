import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
  ScrollView,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';

type EmergencyContact = {
  id: string;
  name: string;
  phone_number: string;
  relationship: string;
  is_primary: boolean;
};

type AsthmaActionPlan = {
  green_zone_actions: string;
  yellow_zone_actions: string;
  red_zone_actions: string;
  medications: string;
  doctor_name: string;
  doctor_phone: string;
  hospital_name: string;
  hospital_address: string;
  allergies: string;
};

// Export function to send emergency SMS automatically
export const sendAutoEmergencySMS = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load emergency contacts
    const { data: contactsData } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });

    if (!contactsData || contactsData.length === 0) {
      console.log('No emergency contacts to alert');
      Alert.alert(
        '⚠️ No Emergency Contacts',
        'Please add emergency contacts in Profile to enable automatic alerts',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get location
    let locationText = 'Location unavailable';
    try {
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude.toFixed(6);
      const lon = location.coords.longitude.toFixed(6);
      locationText = `https://maps.google.com/?q=${lat},${lon}`;
    } catch (err) {
      console.log('Could not get location');
    }

    const userName = user?.user_metadata?.full_name || 'QAir User';
    
    // Prepare SMS message
    const message = `🚨 ASTHMA ALERT 🚨\n\n${userName} just used their inhaler and may need help!\n\nLocation: ${locationText}\n\nTime: ${new Date().toLocaleString()}\n\nAutomatic alert from QAir app.`;

    // Open SMS app with message pre-filled for all contacts
    const allPhones = contactsData.map(c => c.phone_number).join(Platform.OS === 'ios' ? ',' : ';');
    const smsUrl = Platform.select({
      ios: `sms:${allPhones}&body=${encodeURIComponent(message)}`,
      android: `sms:${allPhones}?body=${encodeURIComponent(message)}`,
    });

    if (smsUrl) {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        // Vibrate to indicate alert is being sent
        Vibration.vibrate([0, 200, 100, 200]);
        await Linking.openURL(smsUrl);
      }
    }
  } catch (error) {
    console.error('Error sending auto emergency SMS:', error);
  }
};

export default function SOSButton() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [actionPlan, setActionPlan] = useState<AsthmaActionPlan | null>(null);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);

  // Load data on mount and set up interval to check periodically
  useEffect(() => {
    loadEmergencyData();
    
    // Reload data every 30 seconds to keep it fresh
    const interval = setInterval(() => {
      loadEmergencyData();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadEmergencyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      console.log('Loading emergency data...');

      // Load emergency contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (contactsError) {
        console.error('Error loading contacts:', contactsError);
      } else {
        console.log('Loaded emergency contacts:', contactsData?.length || 0);
        setContacts(contactsData || []);
      }

      // Load action plan
      const { data: planData, error: planError } = await supabase
        .from('asthma_action_plan')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (planError && planError.code !== 'PGRST116') {
        console.error('Error loading action plan:', planError);
      } else if (planData) {
        console.log('Loaded action plan successfully');
        setActionPlan(planData);
      } else {
        console.log('No action plan found');
        setActionPlan(null);
      }
    } catch (error) {
      console.error('Error loading emergency data:', error);
    }
  };

  const getCurrentLocation = async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return 'Location unavailable';
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Create Google Maps link
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nView on map: ${mapsUrl}`;
    } catch (error) {
      console.error('Error getting location:', error);
      return 'Location unavailable';
    }
  };

  const handleSOSPress = async () => {
    // Reload data first to ensure we have latest info
    await loadEmergencyData();
    
    // Vibrate to give feedback
    Vibration.vibrate([0, 200, 100, 200]);

    // Debug info
    console.log('SOS Pressed - Contacts:', contacts.length, 'Action Plan:', actionPlan ? 'Yes' : 'No');

    // Check if user has set up emergency features
    if (contacts.length === 0 && !actionPlan) {
      Alert.alert(
        '⚠️ Setup Required',
        'No emergency contacts or action plan found.\n\nPlease set up emergency contacts and action plan in the Profile tab first.',
        [
          { text: 'OK' }
        ]
      );
      return;
    }

    Alert.alert(
      '🚨 SOS EMERGENCY',
      `Ready to help!\n\n📞 ${contacts.length} contact(s) saved\n📋 Action plan: ${actionPlan ? 'Available' : 'Not set'}`,
      [
        {
          text: 'Call Emergency Contact',
          onPress: () => callEmergencyContact(),
          style: 'default',
        },
        {
          text: 'Send Alert SMS',
          onPress: () => sendEmergencySMS(),
          style: 'default',
        },
        {
          text: 'View Action Plan',
          onPress: () => setShowActionPlan(true),
          style: 'default',
        },
        {
          text: 'Do Everything',
          onPress: () => activateFullSOS(),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const callEmergencyContact = async () => {
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts in Settings first.',
        [
          {
            text: 'OK',
            onPress: () => {},
          },
        ]
      );
      return;
    }

    // Get primary contact or first contact
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    
    // Directly call without confirmation - it's an emergency!
    try {
      const phoneUrl = `tel:${primaryContact.phone_number}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        console.log(`Calling ${primaryContact.name} at ${primaryContact.phone_number}`);
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone call. Check phone permissions.');
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const sendEmergencySMS = async () => {
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts in Settings first.'
      );
      return;
    }

    setLoading(true);
    
    try {
      // Get current location
      const locationText = await getCurrentLocation();
      
      // Get user name
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || 'QAir User';

      // Compose message
      const message = `🚨 ASTHMA EMERGENCY ALERT 🚨\n\n${userName} is having an asthma attack and needs immediate help!\n\nLocation:\n${locationText}\n\nTime: ${new Date().toLocaleString()}\n\nThis is an automated SOS alert from QAir app.`;

      // For multiple contacts, we'll need to send SMS one by one or show options
      const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
      
      setLoading(false);

      // Show options for SMS
      Alert.alert(
        'Send Emergency SMS',
        `Send alert to ${primaryContact.name}?\n\nMessage preview:\n${message.substring(0, 100)}...`,
        [
          {
            text: 'Send to Primary',
            onPress: async () => {
              const smsUrl = Platform.select({
                ios: `sms:${primaryContact.phone_number}&body=${encodeURIComponent(message)}`,
                android: `sms:${primaryContact.phone_number}?body=${encodeURIComponent(message)}`,
              });
              
              if (smsUrl) {
                const canOpen = await Linking.canOpenURL(smsUrl);
                if (canOpen) {
                  await Linking.openURL(smsUrl);
                } else {
                  Alert.alert('Error', 'Unable to open SMS app');
                }
              }
            },
          },
          {
            text: 'Send to All Contacts',
            onPress: async () => {
              // Open SMS with all contacts
              const allPhones = contacts.map(c => c.phone_number).join(Platform.OS === 'ios' ? ',' : ';');
              const smsUrl = Platform.select({
                ios: `sms:${allPhones}&body=${encodeURIComponent(message)}`,
                android: `sms:${allPhones}?body=${encodeURIComponent(message)}`,
              });
              
              if (smsUrl) {
                const canOpen = await Linking.canOpenURL(smsUrl);
                if (canOpen) {
                  await Linking.openURL(smsUrl);
                } else {
                  Alert.alert('Error', 'Unable to open SMS app');
                }
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error preparing SMS:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to prepare emergency SMS');
    }
  };

  const activateFullSOS = async () => {
    setSosActivated(true);
    Vibration.vibrate([0, 500, 200, 500]);

    // Show action plan immediately
    setShowActionPlan(true);

    // Send SMS to all contacts
    await sendEmergencySMS();

    // Wait a moment, then offer to call
    setTimeout(() => {
      if (contacts.length > 0) {
        const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
        Alert.alert(
          'Call Primary Contact?',
          `Would you like to call ${primaryContact.name}?`,
          [
            {
              text: 'Call Now',
              onPress: async () => {
                const phoneUrl = `tel:${primaryContact.phone_number}`;
                await Linking.openURL(phoneUrl);
              },
              style: 'destructive',
            },
            {
              text: 'Not Now',
              style: 'cancel',
            },
          ]
        );
      }
      setSosActivated(false);
    }, 2000);
  };

  return (
    <>
      {/* SOS Button */}
      <TouchableOpacity
        onPress={handleSOSPress}
        disabled={loading || sosActivated}
        className={`${
          sosActivated ? 'bg-red-700' : 'bg-red-600'
        } w-20 h-20 rounded-full items-center justify-center shadow-2xl border-4 border-white`}
        style={{ 
          elevation: 12,
          shadowColor: '#EF4444',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}>
        {loading || sosActivated ? (
          <ActivityIndicator size="large" color="white" />
        ) : (
          <>
            <Ionicons name="warning" size={36} color="white" />
            <Text className="text-white font-bold text-xs mt-1">SOS</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Action Plan Modal */}
      <Modal
        visible={showActionPlan}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowActionPlan(false)}>
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="bg-red-600 px-6 pt-12 pb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white text-3xl font-bold">Asthma Action Plan</Text>
                <Text className="text-white/90 text-sm mt-1">For Emergency Responders</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowActionPlan(false)}
                className="bg-white/20 p-2 rounded-full">
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
            {actionPlan ? (
              <>
                {/* RED ZONE - Emergency */}
                <View className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 mb-5">
                  <View className="flex-row items-center mb-3">
                    <View className="bg-red-500 w-8 h-8 rounded-full items-center justify-center">
                      <Ionicons name="alert-circle" size={20} color="white" />
                    </View>
                    <Text className="text-red-900 text-xl font-bold ml-3">RED ZONE - Emergency</Text>
                  </View>
                  <Text className="text-red-900 text-base leading-6">
                    {actionPlan.red_zone_actions || 'Call 911 immediately. Use rescue inhaler.'}
                  </Text>
                </View>

                {/* YELLOW ZONE - Caution */}
                <View className="bg-yellow-50 border-2 border-yellow-500 rounded-2xl p-5 mb-5">
                  <View className="flex-row items-center mb-3">
                    <View className="bg-yellow-500 w-8 h-8 rounded-full items-center justify-center">
                      <Ionicons name="warning" size={20} color="white" />
                    </View>
                    <Text className="text-yellow-900 text-xl font-bold ml-3">YELLOW ZONE - Caution</Text>
                  </View>
                  <Text className="text-yellow-900 text-base leading-6">
                    {actionPlan.yellow_zone_actions || 'Symptoms worsening. Use prescribed medications.'}
                  </Text>
                </View>

                {/* GREEN ZONE - All Clear */}
                <View className="bg-green-50 border-2 border-green-500 rounded-2xl p-5 mb-5">
                  <View className="flex-row items-center mb-3">
                    <View className="bg-green-500 w-8 h-8 rounded-full items-center justify-center">
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                    </View>
                    <Text className="text-green-900 text-xl font-bold ml-3">GREEN ZONE - All Clear</Text>
                  </View>
                  <Text className="text-green-900 text-base leading-6">
                    {actionPlan.green_zone_actions || 'No symptoms. Continue regular medications.'}
                  </Text>
                </View>

                {/* Medications */}
                {actionPlan.medications && (
                  <View className="bg-blue-50 rounded-2xl p-5 mb-5">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="medical" size={24} color="#3B82F6" />
                      <Text className="text-blue-900 text-lg font-bold ml-3">Medications</Text>
                    </View>
                    <Text className="text-blue-900 text-base leading-6">
                      {actionPlan.medications}
                    </Text>
                  </View>
                )}

                {/* Allergies */}
                {actionPlan.allergies && (
                  <View className="bg-purple-50 rounded-2xl p-5 mb-5">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="alert" size={24} color="#9333EA" />
                      <Text className="text-purple-900 text-lg font-bold ml-3">Allergies</Text>
                    </View>
                    <Text className="text-purple-900 text-base leading-6">
                      {actionPlan.allergies}
                    </Text>
                  </View>
                )}

                {/* Doctor Info */}
                {actionPlan.doctor_name && (
                  <View className="bg-gray-50 rounded-2xl p-5 mb-5">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="person" size={24} color="#6B7280" />
                      <Text className="text-gray-900 text-lg font-bold ml-3">Doctor Information</Text>
                    </View>
                    <Text className="text-gray-900 text-base font-semibold">
                      {actionPlan.doctor_name}
                    </Text>
                    {actionPlan.doctor_phone && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${actionPlan.doctor_phone}`)}
                        className="flex-row items-center mt-2">
                        <Ionicons name="call" size={18} color="#6366F1" />
                        <Text className="text-indigo-600 text-base ml-2">
                          {actionPlan.doctor_phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Hospital Info */}
                {actionPlan.hospital_name && (
                  <View className="bg-gray-50 rounded-2xl p-5 mb-5">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="business" size={24} color="#6B7280" />
                      <Text className="text-gray-900 text-lg font-bold ml-3">Hospital Information</Text>
                    </View>
                    <Text className="text-gray-900 text-base font-semibold">
                      {actionPlan.hospital_name}
                    </Text>
                    {actionPlan.hospital_address && (
                      <Text className="text-gray-600 text-sm mt-2">
                        {actionPlan.hospital_address}
                      </Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
                <Text className="text-gray-400 text-lg mt-4">No Action Plan Found</Text>
                <Text className="text-gray-400 text-sm text-center mt-2 px-8">
                  Please set up your Asthma Action Plan in Settings to display it during emergencies.
                </Text>
              </View>
            )}

            {/* Emergency Call Button */}
            <TouchableOpacity
              onPress={callEmergencyContact}
              className="bg-red-600 py-5 rounded-2xl items-center mb-8">
              <View className="flex-row items-center">
                <Ionicons name="call" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-3">
                  Call Emergency Contact
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
