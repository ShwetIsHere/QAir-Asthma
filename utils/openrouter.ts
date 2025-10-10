import axios from 'axios';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter API client for AI-powered features
 * Can be used for health recommendations, trigger analysis, etc.
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * Send a chat completion request to OpenRouter
 */
export const chatCompletion = async (
  messages: ChatMessage[],
  model: string = 'openai/gpt-3.5-turbo'
): Promise<string> => {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await axios.post<ChatCompletionResponse>(
      `${BASE_URL}/chat/completions`,
      {
        model,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
};

/**
 * Analyze location suitability for asthma patients based on comprehensive weather data
 */
export const analyzeLocationSuitability = async (weatherData: {
  aqi: number;
  category: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pm25: number;
  pm10: number;
  uvIndex: number;
  weatherDescription: string;
  placeName?: string;
}): Promise<string> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a professional respiratory health consultant specializing in asthma management and environmental health. Analyze weather conditions and provide a brief, professional assessment of location suitability for asthma patients. Keep response under 3 sentences, be direct and actionable.',
    },
    {
      role: 'user',
      content: `Analyze this location for an asthma patient:
Location: ${weatherData.placeName || 'Current location'}
Air Quality Index: ${weatherData.aqi} (${weatherData.category})
PM2.5: ${weatherData.pm25} μg/m³
PM10: ${weatherData.pm10} μg/m³
Temperature: ${weatherData.temperature}°C
Humidity: ${weatherData.humidity}%
Wind Speed: ${weatherData.windSpeed} m/s
UV Index: ${weatherData.uvIndex}
Weather: ${weatherData.weatherDescription}

Is this location suitable for outdoor activities? Provide professional assessment.`,
    },
  ];

  try {
    const response = await chatCompletion(messages, 'openai/gpt-3.5-turbo');
    return response;
  } catch (error) {
    // If API fails, return empty string - we'll handle it in UI
    console.error('Failed to get AI analysis:', error);
    throw new Error('AI analysis unavailable');
  }
};

/**
 * Get personalized health recommendations based on AQI and trigger history
 */
export const getHealthRecommendations = async (
  aqi: number,
  recentTriggers: number,
  location: string
): Promise<string> => {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a helpful health assistant specializing in asthma management. Provide concise, actionable advice.',
    },
    {
      role: 'user',
      content: `Current air quality index is ${aqi}, I've had ${recentTriggers} inhaler triggers in the past week near ${location}. What advice do you have for me?`,
    },
  ];

  try {
    return await chatCompletion(messages);
  } catch (error) {
    return getFallbackRecommendations(aqi);
  }
};

/**
 * Analyze trigger patterns and provide insights
 */
export const analyzeTriggerPatterns = async (
  triggers: Array<{ aqi: number; timestamp: string; location: string }>
): Promise<string> => {
  const triggerSummary = triggers
    .map((t) => `AQI ${t.aqi} on ${new Date(t.timestamp).toLocaleDateString()}`)
    .join(', ');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are an asthma specialist analyzing trigger patterns. Provide insights and recommendations.',
    },
    {
      role: 'user',
      content: `Analyze these recent inhaler triggers: ${triggerSummary}. What patterns do you see and what should I be aware of?`,
    },
  ];

  try {
    return await chatCompletion(messages);
  } catch (error) {
    return 'Unable to analyze patterns at this time. Please consult your healthcare provider for personalized advice.';
  }
};

/**
 * Fallback recommendations when API is unavailable
 */
const getFallbackRecommendations = (aqi: number): string => {
  if (aqi <= 50) {
    return 'Air quality is good. Safe to enjoy outdoor activities!';
  } else if (aqi <= 100) {
    return 'Air quality is moderate. Sensitive individuals should consider limiting prolonged outdoor exertion.';
  } else if (aqi <= 150) {
    return 'Unhealthy for sensitive groups. People with asthma should limit outdoor activities and keep inhaler nearby.';
  } else if (aqi <= 200) {
    return 'Unhealthy air quality. Everyone should reduce outdoor activities. People with asthma should stay indoors.';
  } else {
    return 'Very unhealthy or hazardous air quality! Stay indoors, keep windows closed, and have your inhaler ready.';
  }
};
