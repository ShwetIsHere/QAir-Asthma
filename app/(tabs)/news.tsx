import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type NewsArticle = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
  category: 'Health' | 'Air Quality' | 'Asthma' | 'Research';
  author?: string;
};

// API endpoint for real-time health news from India
const NEWS_API_URL = 'https://saurav.tech/NewsAPI/top-headlines/category/health/in.json';

// Fallback mock data in case API fails
const MOCK_NEWS: NewsArticle[] = [
  {
    id: '1',
    title: 'New Research Shows Link Between Air Quality and Asthma Attacks',
    description: 'Scientists have discovered a stronger correlation between PM2.5 particles and asthma exacerbations in urban areas.',
    url: 'https://example.com/article1',
    imageUrl: 'https://via.placeholder.com/400x200/6366F1/FFFFFF?text=Air+Quality',
    source: 'Health Journal',
    publishedAt: '2025-10-09',
    category: 'Research',
  },
  {
    id: '2',
    title: 'WHO Updates Air Quality Guidelines for Asthma Patients',
    description: 'The World Health Organization has released new guidelines for managing asthma in areas with poor air quality.',
    url: 'https://example.com/article2',
    imageUrl: 'https://via.placeholder.com/400x200/8B5CF6/FFFFFF?text=WHO+Guidelines',
    source: 'WHO',
    publishedAt: '2025-10-08',
    category: 'Health',
  },
  {
    id: '3',
    title: 'Smart Inhaler Technology: The Future of Asthma Management',
    description: 'New smart inhaler devices are helping patients track their medication usage and identify trigger patterns.',
    url: 'https://example.com/article3',
    imageUrl: 'https://via.placeholder.com/400x200/10B981/FFFFFF?text=Smart+Inhalers',
    source: 'Tech Health News',
    publishedAt: '2025-10-07',
    category: 'Asthma',
  },
  {
    id: '4',
    title: 'Air Pollution Levels Drop 15% in Major Cities',
    description: 'Environmental agencies report significant improvements in air quality across metropolitan areas this quarter.',
    url: 'https://example.com/article4',
    imageUrl: 'https://via.placeholder.com/400x200/F59E0B/FFFFFF?text=Air+Quality',
    source: 'Environmental News',
    publishedAt: '2025-10-06',
    category: 'Air Quality',
  },
  {
    id: '5',
    title: 'Seasonal Allergies and Asthma: What You Need to Know',
    description: 'Allergists provide tips for managing asthma symptoms during high pollen seasons.',
    url: 'https://example.com/article5',
    imageUrl: 'https://via.placeholder.com/400x200/EF4444/FFFFFF?text=Allergies',
    source: 'Allergy Clinic',
    publishedAt: '2025-10-05',
    category: 'Health',
  },
  {
    id: '6',
    title: 'Exercise and Asthma: Finding the Right Balance',
    description: 'New study shows how proper exercise routines can improve lung capacity in asthma patients.',
    url: 'https://example.com/article6',
    imageUrl: 'https://via.placeholder.com/400x200/6366F1/FFFFFF?text=Exercise',
    source: 'Sports Medicine',
    publishedAt: '2025-10-04',
    category: 'Health',
  },
];

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>(MOCK_NEWS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Health', 'Air Quality', 'Asthma', 'Research'];

  // Fetch real-time news from API
  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch(NEWS_API_URL);
      const data = await response.json();

      if (data.status === 'ok' && data.articles && data.articles.length > 0) {
        // Transform API data to our format
        const transformedArticles: NewsArticle[] = data.articles.map((article: any, index: number) => {
          // Categorize article based on keywords
          const text = (article.title + ' ' + (article.description || '')).toLowerCase();
          let category: 'Health' | 'Air Quality' | 'Asthma' | 'Research' = 'Health';
          
          if (text.includes('asthma') || text.includes('respiratory') || text.includes('inhaler') || text.includes('breathing')) {
            category = 'Asthma';
          } else if (text.includes('air quality') || text.includes('pollution') || text.includes('aqi') || text.includes('smog') || text.includes('particulate')) {
            category = 'Air Quality';
          } else if (text.includes('research') || text.includes('study') || text.includes('scientists') || text.includes('clinical trial')) {
            category = 'Research';
          }

          return {
            id: `${index}-${Date.now()}`,
            title: article.title || 'No title available',
            description: article.description || article.content?.substring(0, 150) || 'No description available',
            url: article.url || '#',
            imageUrl: article.urlToImage || 'https://via.placeholder.com/400x200/6366F1/FFFFFF?text=Health+News',
            source: article.source?.name || 'Unknown Source',
            publishedAt: article.publishedAt || new Date().toISOString(),
            category,
            author: article.author || undefined,
          };
        });

        setNews(transformedArticles);
      } else {
        // Use mock data if API returns no results
        setNews(MOCK_NEWS);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      // Use mock data as fallback
      setNews(MOCK_NEWS);
    } finally {
      setLoading(false);
    }
  };

  // Load news on component mount
  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const filteredNews = selectedCategory === 'All' 
    ? news 
    : news.filter(article => article.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Health': return '#10B981';
      case 'Air Quality': return '#F59E0B';
      case 'Asthma': return '#EF4444';
      case 'Research': return '#6366F1';
      default: return '#9CA3AF';
    }
  };

  const handleArticlePress = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening article:', err));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'News',
          headerShown: true,
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header Banner */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          className="px-6 py-8">
          <View className="flex-row items-center mb-4">
            <View className="bg-white/20 w-12 h-12 rounded-full items-center justify-center mr-4">
              <Ionicons name="newspaper" size={28} color="white" />
            </View>
            <View>
              <Text className="text-white text-2xl font-bold">Latest News</Text>
              <Text className="text-white/80 text-sm">Stay informed about asthma & air quality</Text>
            </View>
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row">
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`mr-3 px-4 py-2 rounded-full ${
                  selectedCategory === category 
                    ? 'bg-white' 
                    : 'bg-white/20'
                }`}>
                <Text className={`font-semibold ${
                  selectedCategory === category 
                    ? 'text-indigo-600' 
                    : 'text-white'
                }`}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* News Articles */}
        <View className="px-5 py-5">
          {loading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#6366F1" />
              <Text className="text-gray-500 mt-4">Loading news...</Text>
            </View>
          ) : filteredNews.length === 0 ? (
            <View className="py-20 items-center">
              <Ionicons name="newspaper-outline" size={64} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 text-center">
                No news articles found in this category
              </Text>
            </View>
          ) : (
            filteredNews.map((article) => (
              <TouchableOpacity
                key={article.id}
                onPress={() => handleArticlePress(article.url)}
                className="bg-white rounded-3xl mb-5 overflow-hidden"
                style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                {/* Article Image */}
                {article.imageUrl && (
                  <View className="w-full h-48 bg-gray-200">
                    <Image
                      source={{ uri: article.imageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute top-3 right-3">
                      <View 
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: getCategoryColor(article.category) }}>
                        <Text className="text-white text-xs font-bold">{article.category}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Article Content */}
                <View className="p-5">
                  <Text className="text-gray-900 text-lg font-bold mb-2">
                    {article.title}
                  </Text>
                  <Text className="text-gray-600 text-sm leading-6 mb-4">
                    {article.description}
                  </Text>
                  
                  {/* Meta Info */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="newspaper-outline" size={16} color="#9CA3AF" />
                      <Text className="text-gray-500 text-xs ml-2">{article.source}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                      <Text className="text-gray-500 text-xs ml-2">{formatDate(article.publishedAt)}</Text>
                    </View>
                  </View>

                  {/* Read More Button */}
                  <View className="flex-row items-center mt-4 pt-4 border-t border-gray-100">
                    <Text className="text-indigo-600 font-semibold mr-2">Read Full Article</Text>
                    <Ionicons name="arrow-forward" size={16} color="#6366F1" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Footer Info */}
        <View className="px-5 pb-8">
          <View className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
            <View className="flex-row items-center mb-3">
              <Ionicons name="information-circle" size={24} color="#6366F1" />
              <Text className="text-indigo-900 font-bold text-base ml-3">Stay Informed</Text>
            </View>
            <Text className="text-indigo-700 text-sm leading-6">
              We curate the latest news about asthma management, air quality research, and health tips 
              to help you stay informed and make better decisions about your respiratory health.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
