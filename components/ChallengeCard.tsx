import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Challenge = {
  id: string;
  challenge_type: string;
  title: string;
  description: string;
  goal_target: number;
  current_progress: number;
  status: 'active' | 'completed' | 'failed' | 'expired';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  end_date: string;
};

type Props = {
  challenge: Challenge;
  onComplete?: () => void;
  onProgress?: () => void;
};

export default function ChallengeCard({ challenge, onComplete, onProgress }: Props) {
  const progressPercentage = Math.min((challenge.current_progress / challenge.goal_target) * 100, 100);
  const isCompleted = challenge.status === 'completed';
  const isActive = challenge.status === 'active';

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'walk_good_air':
        return 'walk';
      case 'inhaler_technique':
        return 'fitness';
      case 'trigger_tracking':
        return 'location';
      case 'streak':
        return 'flame';
      case 'education':
        return 'book';
      case 'aqi_monitoring':
        return 'cloud';
      case 'action_plan':
        return 'clipboard';
      case 'emergency_setup':
        return 'call';
      case 'avoid_danger':
        return 'warning';
      case 'pattern_analysis':
        return 'analytics';
      default:
        return 'checkmark-circle';
    }
  };

  const getDifficultyColor = (difficulty: string): [string, string] => {
    switch (difficulty) {
      case 'easy':
        return ['#10B981', '#34D399'];
      case 'medium':
        return ['#F59E0B', '#FBBF24'];
      case 'hard':
        return ['#EF4444', '#F87171'];
      default:
        return ['#6366F1', '#8B5CF6'];
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '⭐ Easy';
      case 'medium':
        return '⭐⭐ Medium';
      case 'hard':
        return '⭐⭐⭐ Hard';
      default:
        return '';
    }
  };

  const getDaysRemaining = () => {
    if (!challenge.end_date) return null;
    const now = new Date();
    const endDate = new Date(challenge.end_date);
    const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = getDaysRemaining();
  const difficultyColors = getDifficultyColor(challenge.difficulty);

  return (
    <View className="bg-white rounded-3xl p-5 mb-4 shadow-md" style={{ elevation: 4 }}>
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 flex-row items-center">
          <LinearGradient
            colors={difficultyColors}
            className="w-14 h-14 rounded-2xl items-center justify-center mr-3">
            <Ionicons name={getChallengeIcon(challenge.challenge_type)} size={28} color="white" />
          </LinearGradient>
          
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-gray-900 text-base font-bold flex-1" numberOfLines={2}>
                {challenge.title}
              </Text>
            </View>
            <Text className="text-xs text-gray-500">
              {getDifficultyLabel(challenge.difficulty)}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        {isCompleted && (
          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-700 font-bold text-xs">✓ Done</Text>
          </View>
        )}
        {daysRemaining !== null && isActive && (
          <View className={`${daysRemaining <= 2 ? 'bg-red-100' : 'bg-blue-100'} px-3 py-1 rounded-full`}>
            <Text className={`${daysRemaining <= 2 ? 'text-red-700' : 'text-blue-700'} font-bold text-xs`}>
              {daysRemaining}d left
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text className="text-gray-600 text-sm mb-4 leading-5">
        {challenge.description}
      </Text>

      {/* Progress Bar */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-gray-700 text-sm font-semibold">
            Progress: {challenge.current_progress}/{challenge.goal_target}
          </Text>
          <Text className="text-indigo-600 text-sm font-bold">
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        
        <View className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <LinearGradient
            colors={isCompleted ? ['#10B981', '#34D399'] : ['#6366F1', '#8B5CF6']}
            style={{ width: `${progressPercentage}%`, height: '100%' }}
            className="rounded-full"
          />
        </View>
      </View>

      {/* Points & Action Button */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="trophy" size={18} color="#F59E0B" />
          <Text className="text-yellow-700 font-bold ml-2">
            {challenge.points} points
          </Text>
        </View>

        {isActive && !isCompleted && (
          <TouchableOpacity
            onPress={onProgress}
            className="bg-indigo-600 px-5 py-2 rounded-xl flex-row items-center">
            <Ionicons name="add-circle" size={18} color="white" />
            <Text className="text-white font-bold ml-2">Log Progress</Text>
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text className="text-green-600 font-bold ml-2">Completed!</Text>
          </View>
        )}
      </View>
    </View>
  );
}
