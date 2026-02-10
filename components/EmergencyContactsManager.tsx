import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';

type EmergencyContact = {
  id: string;
  name: string;
  phone_number: string;
  relationship: string;
  is_primary: boolean;
};

export default function EmergencyContactsManager() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading contacts:', error);
        Alert.alert('Error', 'Failed to load emergency contacts');
      } else if (data) {
        setContacts(data);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhoneNumber('');
    setRelationship('');
    setIsPrimary(contacts.length === 0); // Auto-set primary if first contact
    setModalVisible(true);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhoneNumber(contact.phone_number);
    setRelationship(contact.relationship);
    setIsPrimary(contact.is_primary);
    setModalVisible(true);
  };

  const saveContact = async () => {
    if (!name.trim() || !phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Name and phone number are required');
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If setting as primary, unset other primary contacts first
      if (isPrimary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const contactData = {
        user_id: user.id,
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        relationship: relationship.trim(),
        is_primary: isPrimary,
        updated_at: new Date().toISOString(),
      };

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('emergency_contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) {
          Alert.alert('Error', 'Failed to update contact');
          console.error('Update error:', error);
        } else {
          Alert.alert('Success', 'Emergency contact updated');
          setModalVisible(false);
          loadContacts();
        }
      } else {
        // Insert new contact
        const { error } = await supabase
          .from('emergency_contacts')
          .insert(contactData);

        if (error) {
          Alert.alert('Error', 'Failed to add contact');
          console.error('Insert error:', error);
        } else {
          Alert.alert('Success', 'Emergency contact added');
          setModalVisible(false);
          loadContacts();
        }
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const deleteContact = async (contactId: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('emergency_contacts')
                .delete()
                .eq('id', contactId);

              if (error) {
                Alert.alert('Error', 'Failed to delete contact');
              } else {
                Alert.alert('Success', 'Emergency contact deleted');
                loadContacts();
              }
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="bg-white/10 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
        <ActivityIndicator size="large" color="#818CF8" />
        <Text className="text-slate-300 text-center mt-4">Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View className="bg-white/10 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-slate-100 text-xl font-bold">Emergency Contacts</Text>
          <Text className="text-slate-300 text-sm mt-1">
            Contacts for SOS alerts
          </Text>
        </View>
        <TouchableOpacity
          onPress={openAddModal}
          className="bg-indigo-600 px-5 py-3 rounded-xl flex-row items-center shadow-md"
          style={{ elevation: 4 }}>
          <Ionicons name="add-circle" size={22} color="white" />
          <Text className="text-white font-bold ml-2 text-base">Add</Text>
        </TouchableOpacity>
      </View>

      {contacts.length === 0 ? (
        <View className="py-8 items-center">
          <Ionicons name="people-outline" size={48} color="#A9B7CC" />
          <Text className="text-slate-400 mt-2">No emergency contacts yet</Text>
          <Text className="text-slate-400 text-xs mt-1">Add contacts for SOS alerts</Text>
        </View>
      ) : (
        <ScrollView 
          className="max-h-80" 
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}>
          {contacts.map((contact) => (
            <View
              key={contact.id}
              className="flex-row items-center justify-between py-4 border-b border-white/10">
              <View className="flex-1 flex-row items-center">
                <View className="bg-white/10 w-12 h-12 rounded-full items-center justify-center mr-3">
                  <Ionicons name="person" size={24} color="#818CF8" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-slate-100 font-semibold text-base">
                      {contact.name}
                    </Text>
                    {contact.is_primary && (
                      <View className="bg-green-500/20 px-2 py-1 rounded-md ml-2">
                        <Text className="text-green-400 text-xs font-semibold">Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-slate-300 text-sm mt-1">{contact.phone_number}</Text>
                  {contact.relationship && (
                    <Text className="text-slate-400 text-xs mt-1">{contact.relationship}</Text>
                  )}
                </View>
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => openEditModal(contact)}
                  className="bg-blue-500/20 p-2 rounded-lg mr-2">
                  <Ionicons name="pencil" size={20} color="#60A5FA" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteContact(contact.id)}
                  className="bg-red-500/20 p-2 rounded-lg">
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Contact Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-gray-900 text-2xl font-bold">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#6366F1" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter name"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Phone Number Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Phone Number *</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+1 (555) 123-4567"
                  keyboardType="phone-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Relationship Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Relationship</Text>
                <TextInput
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="e.g., Mother, Friend, Spouse"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Primary Contact Toggle */}
              <TouchableOpacity
                onPress={() => setIsPrimary(!isPrimary)}
                className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-4 mb-6">
                <View>
                  <Text className="text-gray-900 font-semibold">Set as Primary Contact</Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    This contact will be called first during SOS
                  </Text>
                </View>
                <View
                  className={`w-12 h-7 rounded-full ${
                    isPrimary ? 'bg-green-500' : 'bg-gray-300'
                  } justify-center px-1`}>
                  <View
                    className={`w-5 h-5 rounded-full bg-white ${
                      isPrimary ? 'ml-auto' : ''
                    }`}
                  />
                </View>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                onPress={saveContact}
                className="bg-indigo-600 py-5 rounded-xl items-center mb-4 shadow-lg"
                style={{ elevation: 5 }}>
                <View className="flex-row items-center">
                  <Ionicons name="save" size={24} color="white" />
                  <Text className="text-white font-bold text-xl ml-3">
                    {editingContact ? 'Update Contact' : 'Save Contact'}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
