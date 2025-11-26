import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import BluetoothManager from '@/components/BluetoothManager';
import EmergencyContactsManager from '@/components/EmergencyContactsManager';
import AsthmaActionPlanManager from '@/components/AsthmaActionPlanManager';
import { generateHealthReport } from '@/utils/pdfGenerator';

const screenWidth = Dimensions.get('window').width;

type TriggerData = {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  created_at?: string;
  aqi?: number;
  category?: string;
  pm25?: number;
  temperature?: number;
  humidity?: number;
};

type VisitedPlace = {
  location: string;
  count: number;
  lastVisit: string;
  avgAqi: number;
};

type DayData = {
  date: string;
  count: number;
  avgAqi: number;
};

type WeekDay = {
  date: string;
  dayName: string;
};

export default function ProfilePage() {
  const [userName, setUserName] = useState('User');
  const [triggers, setTriggers] = useState<TriggerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weekLabels, setWeekLabels] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [totalTriggers, setTotalTriggers] = useState(0);
  const [avgAqi, setAvgAqi] = useState(0);
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (isMounted) {
        await loadUserData();
        await loadTriggers();
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
      // Cleanup: Clear state when component unmounts
      setTriggers([]);
      setVisitedPlaces([]);
      setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
      setMarkedDates({});
    };
  }, []);

  // Reload data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      if (isMounted) {
        loadTriggers();
      }
      
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get display name from user metadata (full_name from registration)
        const displayName = user.user_metadata?.full_name;
        if (displayName) {
          setUserName(displayName);
        } else if (user.email) {
          // Fallback to email if no full_name
          const username = user.email.split('@')[0];
          setUserName(username.charAt(0).toUpperCase() + username.slice(1));
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadTriggers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('inhaler_triggers')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error loading triggers:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setTriggers(data);
        processTriggersData(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading triggers:', error);
      setLoading(false);
    }
  };

  const processTriggersData = (data: TriggerData[]) => {
    // Calculate total triggers
    setTotalTriggers(data.length);

    // Calculate average AQI
    const validAqi = data.filter(t => t.aqi).map(t => t.aqi!);
    if (validAqi.length > 0) {
      const avg = validAqi.reduce((sum, aqi) => sum + aqi, 0) / validAqi.length;
      setAvgAqi(Math.round(avg));
    }

    // Process calendar data
    const dates: any = {};
    const dailyData: { [key: string]: DayData } = {};

    data.forEach(trigger => {
      const date = new Date(trigger.timestamp).toISOString().split('T')[0];
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          count: 0,
          avgAqi: 0,
        };
      }
      
      dailyData[date].count++;
      if (trigger.aqi) {
        dailyData[date].avgAqi += trigger.aqi;
      }

      // Mark date on calendar
      const aqiColor = trigger.aqi 
        ? trigger.aqi <= 50 ? '#10B981' 
          : trigger.aqi <= 100 ? '#F59E0B'
          : '#EF4444'
        : '#6366F1';

      dates[date] = {
        marked: true,
        dotColor: aqiColor,
        selected: date === selectedDate,
        selectedColor: aqiColor,
      };
    });

    // Calculate average AQI per day
    Object.keys(dailyData).forEach(date => {
      if (dailyData[date].count > 0) {
        dailyData[date].avgAqi = Math.round(dailyData[date].avgAqi / dailyData[date].count);
      }
    });

    setMarkedDates(dates);

    // Process weekly data for line chart (last 7 days)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
      };
    });

    const weeklyTriggers = last7Days.map(day => {
      const dayTriggers = data.filter(t => 
        new Date(t.timestamp).toISOString().split('T')[0] === day.date
      );
      return dayTriggers.length;
    });

    // Set day labels
    setWeekLabels(last7Days.map(d => d.dayName));
    
    // Ensure we have at least one non-zero value to prevent all-zero graph
    const maxValue = Math.max(...weeklyTriggers, 1);
    
    setWeeklyData(weeklyTriggers.length > 0 ? weeklyTriggers : [0, 0, 0, 0, 0, 0, 0]);

    // Process visited places (group by approximate location)
    const places: { [key: string]: VisitedPlace } = {};
    
    data.forEach(trigger => {
      // Group by rounded coordinates (0.01 degree ≈ 1km)
      const lat = Math.round(trigger.latitude * 100) / 100;
      const lon = Math.round(trigger.longitude * 100) / 100;
      const key = `${lat},${lon}`;

      if (!places[key]) {
        places[key] = {
          location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          count: 0,
          lastVisit: trigger.timestamp,
          avgAqi: 0,
        };
      }

      places[key].count++;
      if (trigger.aqi) {
        places[key].avgAqi += trigger.aqi;
      }
    });

    // Calculate average AQI and sort by count
    const placesArray = Object.values(places)
      .map(place => ({
        ...place,
        avgAqi: place.count > 0 ? Math.round(place.avgAqi / place.count) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 places

    setVisitedPlaces(placesArray);
  };

  const handleDateSelect = (day: any) => {
    const date = day.dateString;
    setSelectedDate(date);

    const dayTriggers = triggers.filter(t => 
      new Date(t.timestamp).toISOString().split('T')[0] === date
    );

    if (dayTriggers.length > 0) {
      const avgAqi = dayTriggers
        .filter(t => t.aqi)
        .reduce((sum, t) => sum + t.aqi!, 0) / dayTriggers.filter(t => t.aqi).length;

      Alert.alert(
        `${date}`,
        `Triggers: ${dayTriggers.length}\nAverage AQI: ${Math.round(avgAqi)}\n\nLocations visited: ${dayTriggers.length}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('No Data', `No triggers recorded on ${date}`);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleExportReport = async () => {
    try {
      setGeneratingReport(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Login Required', 'Please log in again to export your report.');
        return;
      }
      
      // Check if user has any triggers
      const { data: triggers, error } = await supabase
        .from('inhaler_triggers')
        .select('*')
          .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!triggers || triggers.length === 0) {
        Alert.alert('No Data', 'You don\'t have any recorded triggers yet.');
        setGeneratingReport(false);
        return;
      }

        const validAqi = triggers.filter(t => t.aqi).map(t => t.aqi!) ?? [];
        const avgAqi = validAqi.length > 0
          ? Math.round(validAqi.reduce((sum, value) => sum + value, 0) / validAqi.length)
          : 0;

        const firstDate = new Date(triggers[triggers.length - 1].created_at || triggers[triggers.length - 1].timestamp);
        const lastDate = new Date(triggers[0].created_at || triggers[0].timestamp);
        const dateRange = `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`;

        const displayName = userName || user.user_metadata?.full_name || 'QAir User';
        const openRouterApiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';

        await generateHealthReport({
          userName: displayName,
          userEmail: user.email || 'Not provided',
          triggers,
          totalTriggers: triggers.length,
          avgAqi,
          dateRange,
        }, openRouterApiKey);

        Alert.alert('Success', 'Your comprehensive PDF report is ready to share.');
      
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSettings = () => {
    router.push('/settings-page');
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return '#10B981';
    if (aqi <= 100) return '#F59E0B';
    if (aqi <= 150) return '#F97316';
    if (aqi <= 200) return '#EF4444';
    if (aqi <= 300) return '#9333EA';
    return '#7C2D12';
  };

  const getAQICategory = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    const maxValue = Math.max(...weeklyData, 0);
    
    return {
      labels: weekLabels,
      datasets: [
        { 
          data: weeklyData.length > 0 && weeklyData.some(v => v > 0) 
            ? weeklyData 
            : [0, 0, 0, 0, 0, 0, 0],
        }
      ],
    };
  }, [weeklyData, weekLabels]);

  // Calculate Y-axis configuration based on max value
  const yAxisConfig = useMemo(() => {
    const maxValue = Math.max(...weeklyData, 0);
    
    if (maxValue <= 5) {
      // For small values (0-5), show 0,1,2,3,4,5
      return {
        segments: 5,
        yAxisSuffix: '',
        fromZero: true,
      };
    } else {
      // For larger values, round up to nearest 5 and show intervals of 5
      const roundedMax = Math.ceil(maxValue / 5) * 5;
      return {
        segments: Math.min(roundedMax / 5, 6), // Max 6 segments
        yAxisSuffix: '',
        fromZero: true,
      };
    }
  }, [weeklyData]);

  const chartConfig = useMemo(() => ({
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 16 },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#F3F4F6',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 10,
    },
    barPercentage: 0.6,
    fillShadowGradient: '#6366F1',
    fillShadowGradientOpacity: 1,
  }), []);

  // Memoize filtered places to improve performance
  const displayedPlaces = useMemo(() => {
    return showAllPlaces ? visitedPlaces : visitedPlaces.slice(0, 5);
  }, [showAllPlaces, visitedPlaces]);

  // Memoize triggers display to avoid re-renders
  const displayedTriggers = useMemo(() => {
    return showAllPlaces ? triggers : triggers.slice(0, 10);
  }, [showAllPlaces, triggers]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-gray-600 mt-4">Loading profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSettings}
              className="mr-4 bg-white/20 p-2 rounded-full">
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Profile Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          className="px-6 py-8">
          <View className="items-center">
            <View className="bg-white/20 w-24 h-24 rounded-full items-center justify-center mb-4">
              <Ionicons name="person" size={48} color="white" />
            </View>
            <Text className="text-white text-3xl font-bold">{userName}</Text>
            <Text className="text-white/80 text-base mt-1">Asthma Patient</Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row justify-between mt-6">
            <View className="bg-white/20 rounded-2xl p-4 flex-1 mr-2">
              <Ionicons name="location" size={24} color="white" />
              <Text className="text-white text-2xl font-bold mt-2">{totalTriggers}</Text>
              <Text className="text-white/80 text-xs">Total Triggers</Text>
            </View>
            <View className="bg-white/20 rounded-2xl p-4 flex-1 ml-2">
              <Ionicons name="speedometer" size={24} color="white" />
              <Text className="text-white text-2xl font-bold mt-2">{avgAqi}</Text>
              <Text className="text-white/80 text-xs">Average AQI</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Bluetooth IoT Device Connection */}
        <View className="mx-5 mt-5">
          <BluetoothManager
            onDeviceConnected={(device) => {
              console.log('Device connected:', device);
              // You can handle device connection here (e.g., start receiving data)
            }}
            onDeviceDisconnected={() => {
              console.log('Device disconnected');
              // Handle disconnection here
            }}
          />
        </View>

        {/* Weekly Triggers Chart */}
        <View className="bg-white mx-5 mt-5 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-900 text-xl font-bold">Weekly Activity</Text>
              <Text className="text-gray-500 text-sm">Last 7 days</Text>
            </View>
            <Ionicons name="trending-up" size={24} color="#6366F1" />
          </View>

          {totalTriggers > 0 ? (
            <View style={{ overflow: 'visible', paddingLeft: 5 }}>
              <BarChart
                data={chartData}
                width={screenWidth - 60}
                height={220}
                withInnerLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                chartConfig={chartConfig}
                style={{ 
                  marginVertical: 8,
                  marginLeft: -25,
                  borderRadius: 16,
                }}
                segments={yAxisConfig.segments}
                yAxisLabel=""
                yAxisSuffix={yAxisConfig.yAxisSuffix}
                fromZero={yAxisConfig.fromZero}
                showBarTops={false}
                showValuesOnTopOfBars={true}
              />
            </View>
          ) : (
            <View className="py-8 items-center">
              <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2">No data yet</Text>
            </View>
          )}
        </View>

        {/* Calendar */}
        <View className="bg-white mx-5 mt-5 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-900 text-xl font-bold">Trigger Calendar</Text>
              <Text className="text-gray-500 text-sm">Tap a date to see details</Text>
            </View>
            <Ionicons name="calendar" size={24} color="#6366F1" />
          </View>

          <Calendar
            markedDates={markedDates}
            onDayPress={handleDateSelect}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#6B7280',
              selectedDayBackgroundColor: '#6366F1',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#6366F1',
              dayTextColor: '#1F2937',
              textDisabledColor: '#D1D5DB',
              dotColor: '#6366F1',
              selectedDotColor: '#ffffff',
              arrowColor: '#6366F1',
              monthTextColor: '#1F2937',
              textMonthFontWeight: 'bold',
            }}
          />

          <View className="flex-row items-center justify-center mt-4 space-x-4">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              <Text className="text-gray-600 text-xs">Good</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
              <Text className="text-gray-600 text-xs">Moderate</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <Text className="text-gray-600 text-xs">Unhealthy</Text>
            </View>
          </View>
        </View>

        {/* Visited Places */}
        <View className="bg-white mx-5 mt-5 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-900 text-xl font-bold">Top Visited Places</Text>
              <Text className="text-gray-500 text-sm">Your frequent locations</Text>
            </View>
            <Ionicons name="location-sharp" size={24} color="#6366F1" />
          </View>

          {visitedPlaces.length > 0 ? (
            <>
              {displayedPlaces.map((place, index) => (
                <View
                  key={`${place.location}-${index}`}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-indigo-50 w-12 h-12 rounded-xl items-center justify-center mr-3">
                      <Text className="text-indigo-600 font-bold text-lg">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                        {place.location}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {place.count} visit{place.count > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="px-3 py-1 rounded-lg"
                    style={{ backgroundColor: getAQIColor(place.avgAqi) + '20' }}>
                    <Text
                      className="font-bold text-xs"
                      style={{ color: getAQIColor(place.avgAqi) }}>
                      AQI {place.avgAqi}
                    </Text>
                  </View>
                </View>
              ))}
              
              {visitedPlaces.length > 5 && (
                <TouchableOpacity
                  onPress={() => setShowAllPlaces(!showAllPlaces)}
                  className="bg-indigo-50 mt-4 py-3 rounded-xl flex-row items-center justify-center">
                  <Text className="text-indigo-600 font-semibold mr-2">
                    {showAllPlaces ? 'Show Less' : `Show All ${visitedPlaces.length} Places`}
                  </Text>
                  <Ionicons 
                    name={showAllPlaces ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6366F1" 
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View className="py-8 items-center">
              <Ionicons name="location-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2">No places visited yet</Text>
            </View>
          )}
        </View>

        {/* All Marked Places */}
        <View className="bg-white mx-5 mt-5 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-900 text-xl font-bold">All Marked Places</Text>
              <Text className="text-gray-500 text-sm">Complete trigger history</Text>
            </View>
            <View className="bg-indigo-50 px-3 py-1 rounded-full">
              <Text className="text-indigo-600 font-bold">{totalTriggers}</Text>
            </View>
          </View>

          {triggers.length > 0 ? (
            <>
              <ScrollView 
                style={{ maxHeight: showAllPlaces ? 500 : 400 }} 
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}>
                {displayedTriggers.map((trigger, index) => {
                  const date = new Date(trigger.timestamp);
                  const dateStr = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  });
                  const timeStr = date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  return (
                    <View
                      key={trigger.id}
                      className="flex-row items-center justify-between py-4 border-b border-gray-100">
                      <View className="flex-row items-center flex-1">
                        <View className="bg-indigo-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
                          <Ionicons name="location" size={20} color="#6366F1" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                            {trigger.latitude.toFixed(4)}, {trigger.longitude.toFixed(4)}
                          </Text>
                          <Text className="text-gray-500 text-xs mt-1">
                            {dateStr} • {timeStr}
                          </Text>
                          {trigger.temperature && (
                            <Text className="text-gray-400 text-xs mt-1">
                              {trigger.temperature}°C • Humidity: {trigger.humidity}%
                            </Text>
                          )}
                        </View>
                      </View>
                      {trigger.aqi && (
                        <View
                          className="px-3 py-2 rounded-lg ml-2"
                          style={{ backgroundColor: getAQIColor(trigger.aqi) }}>
                          <Text className="text-white font-bold text-xs">
                            {trigger.aqi}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
              
              {triggers.length > 10 && (
                <TouchableOpacity
                  onPress={() => setShowAllPlaces(!showAllPlaces)}
                  className="bg-indigo-50 mt-4 py-3 rounded-xl flex-row items-center justify-center">
                  <Text className="text-indigo-600 font-semibold mr-2">
                    {showAllPlaces ? 'Show Less' : `Show All ${triggers.length} Places`}
                  </Text>
                  <Ionicons 
                    name={showAllPlaces ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6366F1" 
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View className="py-8 items-center">
              <Ionicons name="map-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2">No places marked yet</Text>
              <Text className="text-gray-400 text-xs mt-1">Start recording triggers on the map</Text>
            </View>
          )}
        </View>

        {/* Weather Quality Summary */}
        <View className="bg-white mx-5 mt-5 rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-900 text-xl font-bold">Air Quality Summary</Text>
              <Text className="text-gray-500 text-sm">Overall exposure</Text>
            </View>
            <Ionicons name="cloud" size={24} color="#6366F1" />
          </View>

          <View className="bg-gray-50 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-600">Average AQI</Text>
              <View
                className="px-4 py-2 rounded-xl"
                style={{ backgroundColor: getAQIColor(avgAqi) }}>
                <Text className="text-white font-bold text-lg">{avgAqi}</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-600">Category</Text>
              <Text
                className="font-semibold"
                style={{ color: getAQIColor(avgAqi) }}>
                {getAQICategory(avgAqi)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-gray-600">Total Recordings</Text>
              <Text className="text-gray-900 font-bold">{totalTriggers}</Text>
            </View>
          </View>

          {avgAqi > 100 && (
            <View className="bg-orange-50 rounded-2xl p-4 mt-4 border border-orange-200">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="#F97316" />
                <Text className="text-orange-900 font-semibold ml-2">Health Alert</Text>
              </View>
              <Text className="text-orange-800 text-sm mt-2">
                Your average air quality exposure is concerning. Consider avoiding outdoor activities
                in high AQI areas and keep your inhaler handy.
              </Text>
            </View>
          )}
        </View>

        {/* Emergency Settings Section */}
        <View className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mx-5 mt-5">
          <View className="flex-row items-center mb-2">
            <View className="bg-red-500 w-10 h-10 rounded-full items-center justify-center">
              <Ionicons name="warning" size={24} color="white" />
            </View>
            <Text className="text-red-900 font-bold text-2xl ml-3">Emergency Setup</Text>
          </View>
          <Text className="text-red-700 text-sm">
            Configure emergency contacts and action plan for the SOS button
          </Text>
        </View>

        {/* Emergency Contacts Manager */}
        <View className="mx-5 mt-5">
          <EmergencyContactsManager />
        </View>

        {/* Asthma Action Plan Manager */}
        <View className="mx-5 mt-5">
          <AsthmaActionPlanManager />
        </View>

        {/* Export Report Button */}
        <TouchableOpacity
          onPress={handleExportReport}
          disabled={generatingReport}
          className="bg-indigo-600 mx-5 mt-5 rounded-2xl p-5 shadow-md"
          style={{ elevation: 4, opacity: generatingReport ? 0.6 : 1 }}>
          <View className="flex-row items-center justify-center">
            {generatingReport ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="document-text" size={24} color="white" />
            )}
            <Text className="text-white font-bold text-lg ml-3">
              {generatingReport ? 'Generating...' : 'Export Report (PDF)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 mx-5 mt-5 mb-32 rounded-2xl p-5 shadow-md"
          style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-3">Logout</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
