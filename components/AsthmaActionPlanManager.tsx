import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';

type ActionPlanData = {
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

export default function AsthmaActionPlanManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasActionPlan, setHasActionPlan] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Form fields
  const [greenZoneActions, setGreenZoneActions] = useState('');
  const [yellowZoneActions, setYellowZoneActions] = useState('');
  const [redZoneActions, setRedZoneActions] = useState('');
  const [medications, setMedications] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [allergies, setAllergies] = useState('');

  useEffect(() => {
    loadActionPlan();
  }, []);

  const loadActionPlan = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('asthma_action_plan')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading action plan:', error);
      } else if (data) {
        setHasActionPlan(true);
        setGreenZoneActions(data.green_zone_actions || '');
        setYellowZoneActions(data.yellow_zone_actions || '');
        setRedZoneActions(data.red_zone_actions || '');
        setMedications(data.medications || '');
        setDoctorName(data.doctor_name || '');
        setDoctorPhone(data.doctor_phone || '');
        setHospitalName(data.hospital_name || '');
        setHospitalAddress(data.hospital_address || '');
        setAllergies(data.allergies || '');
      }
    } catch (error) {
      console.error('Error loading action plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveActionPlan = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const planData: ActionPlanData = {
        green_zone_actions: greenZoneActions.trim(),
        yellow_zone_actions: yellowZoneActions.trim(),
        red_zone_actions: redZoneActions.trim(),
        medications: medications.trim(),
        doctor_name: doctorName.trim(),
        doctor_phone: doctorPhone.trim(),
        hospital_name: hospitalName.trim(),
        hospital_address: hospitalAddress.trim(),
        allergies: allergies.trim(),
      };

      if (hasActionPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('asthma_action_plan')
          .update({
            ...planData,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          Alert.alert('Error', 'Failed to update action plan');
          console.error('Update error:', error);
        } else {
          Alert.alert('Success', 'Action plan updated successfully');
        }
      } else {
        // Insert new plan
        const { error } = await supabase
          .from('asthma_action_plan')
          .insert({
            user_id: user.id,
            ...planData,
          });

        if (error) {
          Alert.alert('Error', 'Failed to save action plan');
          console.error('Insert error:', error);
        } else {
          setHasActionPlan(true);
          Alert.alert('Success', 'Action plan saved successfully');
        }
      }
    } catch (error) {
      console.error('Error saving action plan:', error);
      Alert.alert('Error', 'Failed to save action plan');
    } finally {
      setSaving(false);
    }
  };

  const setDefaultPlan = () => {
    setGreenZoneActions('No symptoms. Continue daily controller medications as prescribed. Can do normal activities.');
    setYellowZoneActions('Symptoms worsening (coughing, wheezing, shortness of breath). Use quick-relief inhaler. Contact doctor if symptoms persist for more than 24 hours.');
    setRedZoneActions('EMERGENCY! Severe symptoms, difficulty breathing, blue lips. Use quick-relief inhaler immediately. Call 911 or go to emergency room.');
    setMedications('List your daily controller medications and quick-relief inhalers here.');
    Alert.alert('Default Plan Loaded', 'You can now customize it to match your doctor\'s recommendations.');
    
    // Scroll to top to show the loaded content
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  if (loading) {
    return (
      <View className="bg-white rounded-2xl p-6">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-gray-500 text-center mt-4">Loading action plan...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl p-6">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-gray-900 text-xl font-bold">Asthma Action Plan</Text>
          <Text className="text-gray-500 text-sm mt-1">
            For emergency situations
          </Text>
        </View>
        {!hasActionPlan && (
          <TouchableOpacity
            onPress={setDefaultPlan}
            className="bg-blue-500 px-3 py-2 rounded-xl">
            <Text className="text-white font-semibold text-xs">Load Default</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={{ maxHeight: 600 }}
        showsVerticalScrollIndicator={true} 
        nestedScrollEnabled={true}>
        {/* Green Zone */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <View className="w-4 h-4 rounded-full bg-green-500 mr-2" />
            <Text className="text-gray-900 font-bold text-base">Green Zone - All Clear</Text>
          </View>
          <TextInput
            value={greenZoneActions}
            onChangeText={setGreenZoneActions}
            placeholder="What to do when feeling well..."
            multiline
            numberOfLines={3}
            className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Yellow Zone */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <View className="w-4 h-4 rounded-full bg-yellow-500 mr-2" />
            <Text className="text-gray-900 font-bold text-base">Yellow Zone - Caution</Text>
          </View>
          <TextInput
            value={yellowZoneActions}
            onChangeText={setYellowZoneActions}
            placeholder="What to do when symptoms worsen..."
            multiline
            numberOfLines={3}
            className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Red Zone */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <View className="w-4 h-4 rounded-full bg-red-500 mr-2" />
            <Text className="text-gray-900 font-bold text-base">Red Zone - Emergency</Text>
          </View>
          <TextInput
            value={redZoneActions}
            onChangeText={setRedZoneActions}
            placeholder="Emergency actions to take..."
            multiline
            numberOfLines={3}
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Medications */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="medical" size={16} color="#6366F1" />
            <Text className="text-gray-900 font-bold text-base ml-2">Medications</Text>
          </View>
          <TextInput
            value={medications}
            onChangeText={setMedications}
            placeholder="List your medications (daily and rescue)..."
            multiline
            numberOfLines={3}
            className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Allergies */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="alert-circle" size={16} color="#9333EA" />
            <Text className="text-gray-900 font-bold text-base ml-2">Allergies</Text>
          </View>
          <TextInput
            value={allergies}
            onChangeText={setAllergies}
            placeholder="List any allergies (medications, environmental, food)..."
            multiline
            numberOfLines={2}
            className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Doctor Information */}
        <View className="mb-4">
          <Text className="text-gray-900 font-bold text-base mb-2">Doctor Information</Text>
          <TextInput
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Doctor's name"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-3"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            value={doctorPhone}
            onChangeText={setDoctorPhone}
            placeholder="Doctor's phone number"
            keyboardType="phone-pad"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Hospital Information */}
        <View className="mb-6">
          <Text className="text-gray-900 font-bold text-base mb-2">Hospital Information</Text>
          <TextInput
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="Hospital name"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-3"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            value={hospitalAddress}
            onChangeText={setHospitalAddress}
            placeholder="Hospital address"
            multiline
            numberOfLines={2}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Info Box */}
        <View className="bg-blue-50 rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text className="text-blue-900 font-semibold ml-2">Important</Text>
          </View>
          <Text className="text-blue-800 text-sm leading-5">
            This action plan will be displayed during SOS emergencies for you and first responders. 
            Make sure it reflects your doctor's recommendations.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button - Outside ScrollView, always visible */}
      <TouchableOpacity
        onPress={saveActionPlan}
        disabled={saving}
        className="bg-indigo-600 py-4 rounded-xl items-center mt-4 shadow-lg"
        style={{ elevation: 5 }}>
        {saving ? (
          <View className="flex-row items-center">
            <ActivityIndicator color="white" />
            <Text className="text-white font-bold text-lg ml-2">Saving...</Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <Ionicons name="save" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-3">
              {hasActionPlan ? 'Update Action Plan' : 'Save Action Plan'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
