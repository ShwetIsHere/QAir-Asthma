import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import ChallengeCard from './ChallengeCard';

type Challenge = {
  id: string;
  user_id: string;
  challenge_type: string;
  title: string;
  description: string;
  goal_target: number;
  current_progress: number;
  status: 'active' | 'completed' | 'failed' | 'expired';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  start_date: string;
  end_date: string;
  metadata: any;
  created_at: string;
};

export default function ChallengesManager() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [totalPoints, setTotalPoints] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, [filter]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query;

      if (error) throw error;

      setChallenges(data || []);

      // Calculate total points
      const { data: completedChallenges } = await supabase
        .from('user_challenges')
        .select('points')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const total = completedChallenges?.reduce((sum, c) => sum + c.points, 0) || 0;
      setTotalPoints(total);
    } catch (error) {
      console.error('Error loading challenges:', error);
      Alert.alert('Error', 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const logProgress = async (challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) return;

      // Log today's progress
      const today = new Date().toISOString().split('T')[0];
      const { error: logError } = await supabase
        .from('challenge_progress_logs')
        .upsert({
          challenge_id: challengeId,
          user_id: user.id,
          log_date: today,
          progress_value: 1,
          notes: 'Progress logged from app'
        }, {
          onConflict: 'challenge_id,log_date'
        });

      if (logError) throw logError;

      // Update challenge progress
      const newProgress = challenge.current_progress + 1;
      const newStatus = newProgress >= challenge.goal_target ? 'completed' : 'active';

      const { error: updateError } = await supabase
        .from('user_challenges')
        .update({
          current_progress: newProgress,
          status: newStatus
        })
        .eq('id', challengeId);

      if (updateError) throw updateError;

      if (newStatus === 'completed') {
        Alert.alert(
          '🎉 Challenge Completed!',
          `Congratulations! You've earned ${challenge.points} points!`,
          [{ text: 'Awesome!', onPress: loadChallenges }]
        );
      } else {
        Alert.alert('Progress Logged', `Great job! ${challenge.goal_target - newProgress} more to go!`);
        loadChallenges();
      }
    } catch (error) {
      console.error('Error logging progress:', error);
      Alert.alert('Error', 'Failed to log progress');
    }
  };

  const generateChallenges = async () => {
    try {
      setGenerating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's trigger data
      const { data: triggers } = await supabase
        .from('inhaler_triggers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      // Generate personalized challenges based on user data
      const newChallenges: Omit<Challenge, 'id' | 'created_at'>[] = [];

      // Challenge 1: Record Triggers This Week
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'trigger_tracking',
        title: '📍 Record 5 Asthma Triggers',
        description: 'Track 5 locations or situations that triggered your asthma symptoms. This helps identify patterns!',
        goal_target: 5,
        current_progress: 0,
        status: 'active',
        difficulty: 'easy',
        points: 50,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { type: 'location_tracking' }
      });

      // Challenge 2: Complete Your Action Plan
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'action_plan',
        title: '� Complete Asthma Action Plan',
        description: 'Fill out your complete Asthma Action Plan with Green, Yellow, and Red zone instructions.',
        goal_target: 1,
        current_progress: 0,
        status: 'active',
        difficulty: 'easy',
        points: 100,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { type: 'setup_action_plan' }
      });

      // Challenge 3: Check AQI Daily
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'aqi_monitoring',
        title: '🌤️ Daily AQI Check',
        description: 'Check the air quality before going outside for 5 consecutive days to stay safe.',
        goal_target: 5,
        current_progress: 0,
        status: 'active',
        difficulty: 'easy',
        points: 60,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { type: 'daily_check' }
      });

      // Challenge 4: Add Emergency Contacts
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'emergency_setup',
        title: '🆘 Set Up Emergency Contacts',
        description: 'Add at least 2 emergency contacts to your profile for safety during asthma attacks.',
        goal_target: 2,
        current_progress: 0,
        status: 'active',
        difficulty: 'easy',
        points: 75,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { type: 'emergency_contacts' }
      });

      // Challenge 5: Walk on Good Air Days
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'walk_good_air',
        title: '�‍♂️ Walk on Clean Air Days',
        description: 'Take a 15-minute outdoor walk on 3 days when the AQI is good (below 50). Stay active safely!',
        goal_target: 3,
        current_progress: 0,
        status: 'active',
        difficulty: 'medium',
        points: 80,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { aqi_threshold: 50, duration_minutes: 15 }
      });

      // Challenge 6: Weekly Login Streak
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'streak',
        title: '🔥 7-Day Activity Streak',
        description: 'Open the app and monitor your air quality for 7 consecutive days. Build healthy habits!',
        goal_target: 7,
        current_progress: 0,
        status: 'active',
        difficulty: 'medium',
        points: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { type: 'consecutive_days' }
      });

      // Challenge 7: Avoid Red Zones
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'avoid_danger',
        title: '⚠️ Avoid High-Risk Areas',
        description: 'Stay away from areas with poor air quality (AQI > 150) for 5 days. Protect your lungs!',
        goal_target: 5,
        current_progress: 0,
        status: 'active',
        difficulty: 'hard',
        points: 150,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { aqi_threshold: 150 }
      });

      // Challenge 8: Identify Trigger Patterns
      newChallenges.push({
        user_id: user.id,
        challenge_type: 'pattern_analysis',
        title: '🔍 Find Your Trigger Patterns',
        description: 'Record triggers at different times of day (morning, afternoon, evening) to identify patterns.',
        goal_target: 10,
        current_progress: 0,
        status: 'active',
        difficulty: 'hard',
        points: 200,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { type: 'time_based_tracking' }
      });

      // Insert challenges
      const { error } = await supabase
        .from('user_challenges')
        .insert(newChallenges);

      if (error) throw error;

      Alert.alert(
        'Challenges Generated!',
        `${newChallenges.length} new personalized challenges have been created for you!`,
        [{ text: 'Let\'s Go!', onPress: loadChallenges }]
      );
    } catch (error) {
      console.error('Error generating challenges:', error);
      Alert.alert('Error', 'Failed to generate challenges');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-indigo-600 p-5 pb-6 rounded-t-3xl">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-white text-2xl font-bold">Your Challenges</Text>
            <Text className="text-indigo-100 text-sm">Stay motivated & healthy!</Text>
          </View>
          <View className="bg-white/20 backdrop-blur-lg px-4 py-3 rounded-2xl">
            <View className="flex-row items-center">
              <Ionicons name="trophy" size={24} color="#FCD34D" />
              <Text className="text-white text-xl font-bold ml-2">{totalPoints}</Text>
            </View>
            <Text className="text-indigo-100 text-xs text-center">points</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="flex-row bg-white/10 backdrop-blur-lg rounded-2xl p-1">
          <TouchableOpacity
            onPress={() => setFilter('active')}
            className={`flex-1 py-2 rounded-xl ${filter === 'active' ? 'bg-white' : ''}`}>
            <Text className={`text-center font-semibold ${filter === 'active' ? 'text-indigo-600' : 'text-white'}`}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('completed')}
            className={`flex-1 py-2 rounded-xl ${filter === 'completed' ? 'bg-white' : ''}`}>
            <Text className={`text-center font-semibold ${filter === 'completed' ? 'text-indigo-600' : 'text-white'}`}>
              Completed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            className={`flex-1 py-2 rounded-xl ${filter === 'all' ? 'bg-white' : ''}`}>
            <Text className={`text-center font-semibold ${filter === 'all' ? 'text-indigo-600' : 'text-white'}`}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Challenges List */}
      {loading ? (
        <View className="flex-1 items-center justify-center bg-gray-50">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1 bg-gray-50" 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
          {challenges.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 text-lg font-semibold mt-4">
                {filter === 'active' ? 'No active challenges' : 'No challenges yet'}
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center px-6">
                Generate personalized challenges to start earning points!
              </Text>
            </View>
          ) : (
            challenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onProgress={() => logProgress(challenge.id)}
              />
            ))
          )}

          {/* Generate Button */}
          <TouchableOpacity
            onPress={generateChallenges}
            disabled={generating}
            className="bg-indigo-600 rounded-2xl p-5 mb-4 flex-row items-center justify-center shadow-lg"
            style={{ elevation: 4 }}>
            {generating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="sparkles" size={24} color="white" />
                <Text className="text-white text-lg font-bold ml-3">Generate New Challenges</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
