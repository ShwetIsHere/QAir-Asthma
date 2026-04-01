import axios from 'axios';

const getGeminiApiKeys = (): string[] => {
  const keys = [
    process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    process.env.EXPO_PUBLIC_BACKUP_API_KEY,
    process.env.backup_api_key,
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
  ].filter((key): key is string => Boolean(key));

  // Keep order while removing duplicates.
  return [...new Set(keys)];
};
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'models/gemini-flash-lite-latest';

// Simple in-memory cache for AI responses (10 minute TTL to reduce API calls)
const responseCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generate cache key from weather data
 */
const getCacheKey = (weatherData: any): string => {
  return `${weatherData.aqi}-${weatherData.temperature}-${weatherData.humidity}-${weatherData.pm25}`;
};

/**
 * Google Gemini API client for AI-powered features
 * Can be used for health recommendations, trigger analysis, etc.
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Delay helper for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send a chat completion request to Google Gemini with retry logic
 * Using Gemini Flash Lite model
 */
export const chatCompletion = async (
  messages: ChatMessage[],
  model: string = GEMINI_MODEL,
  retries: number = 2
): Promise<string> => {
  const apiKeys = getGeminiApiKeys();
  const totalAttempts = Math.max(retries + 1, apiKeys.length || 0);
  let lastError: any;
  
  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      const activeApiKey = apiKeys[Math.min(attempt, apiKeys.length - 1)];
      if (!activeApiKey) {
        console.error('Gemini API key is missing!');
        throw new Error('Gemini API key not configured. Set EXPO_PUBLIC_GEMINI_API_KEY and optionally EXPO_PUBLIC_BACKUP_API_KEY.');
      }

      if (attempt > 0) {
        const waitTime = Math.min(3000 * Math.pow(2, attempt - 1), 10000); // 3s, 6s, 10s max
        console.log(`Retry attempt ${attempt}/${retries}, waiting ${waitTime}ms...`);
        await delay(waitTime);
      }

      console.log('Making Gemini API request with Flash Lite model...');
      
      // Convert messages to Gemini format
      let prompt = '';
      let systemInstruction = '';
      
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemInstruction = msg.content;
        } else if (msg.role === 'user') {
          prompt += msg.content + '\n';
        }
      }
      
      // Combine system instruction with prompt
      const fullPrompt = systemInstruction 
        ? `${systemInstruction}\n\n${prompt}` 
        : prompt;

      console.log('Request payload:', {
        model,
        prompt: fullPrompt.substring(0, 100) + '...'
      });

      const response = await axios.post<GeminiResponse>(
        `${GEMINI_BASE_URL}/${model}:generateContent?key=${activeApiKey}`,
        {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('Gemini response received successfully!');
      
      // Check for error in response
      if (response.data.error) {
        throw new Error(`Gemini API Error: ${response.data.error.message}`);
      }

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error('No response content received from AI');
      }

      return content;
    } catch (error: any) {
      lastError = error;
      console.error(`Gemini API error (attempt ${attempt + 1}/${totalAttempts}):`, error?.message);
      
      // Don't retry on these errors
      const status = error?.response?.status;
      if (status === 400) {
        break; // Don't retry bad request errors
      }

      if (status === 401 || status === 403) {
        if (attempt + 1 < apiKeys.length) {
          console.warn('Primary API key failed, switching to backup key...');
          continue;
        }
        break;
      }
      
      // Only retry on 429 (rate limit) or network errors
      if (status === 429 || error?.code === 'ECONNABORTED' || error?.message?.includes('Network')) {
        if (attempt + 1 < totalAttempts) {
          continue; // Try again
        }
      } else {
        break; // Don't retry other errors
      }
    }
  }
  
  // All retries failed, throw the last error
  console.error('All retry attempts failed. Error details:', {
    message: lastError?.message,
    status: lastError?.response?.status,
    statusText: lastError?.response?.statusText,
    data: lastError?.response?.data,
  });
  
  // Check for specific error codes and throw proper errors
  if (lastError?.response?.status === 403) {
    throw new Error('Gemini API key is invalid or expired. Please check your API key.');
  } else if (lastError?.response?.status === 401) {
    throw new Error('Gemini API key is unauthorized. Please check your API key.');
  } else if (lastError?.response?.status === 429) {
    throw new Error('Rate limit exceeded. Please try again in a minute.');
  } else if (lastError?.response?.status === 400) {
    throw new Error('Invalid request format. Please try again.');
  } else if (lastError?.code === 'ECONNABORTED' || lastError?.message?.includes('timeout')) {
    throw new Error('Request timeout. Please check your internet connection and try again.');
  } else if (lastError?.message?.includes('Network Error') || lastError?.message?.includes('ENOTFOUND')) {
    throw new Error('Network error. Please check your internet connection.');
  }
  
  // Re-throw with better error message
  throw new Error(lastError?.response?.data?.error?.message || lastError?.message || 'Failed to get AI analysis. Please try again.');
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
  console.log('Analyzing location suitability for:', weatherData.placeName);
  
  // Check cache first
  const cacheKey = getCacheKey(weatherData);
  const cached = responseCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ Returning cached AI analysis (saves API calls!)');
    return cached.data;
  }
  
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a professional respiratory health consultant specializing in asthma management. Analyze weather conditions and provide a brief assessment (2-3 sentences) for asthma patients. Be direct and actionable.',
    },
    {
      role: 'user',
      content: `Analyze weather conditions for an asthma patient at ${weatherData.placeName || 'this location'}:

AQI: ${weatherData.aqi} (${weatherData.category})
PM2.5: ${weatherData.pm25} μg/m³, PM10: ${weatherData.pm10} μg/m³
Temperature: ${weatherData.temperature}°C, Humidity: ${weatherData.humidity}%
Wind: ${weatherData.windSpeed} m/s, UV Index: ${weatherData.uvIndex}
Weather: ${weatherData.weatherDescription}

Is this location suitable for outdoor activities? Give brief professional assessment.`,
    },
  ];

  try {
    console.log('Sending request to Gemini AI...');
    const response = await chatCompletion(messages, GEMINI_MODEL);
    
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response received from AI');
    }
    
    console.log('AI analysis received successfully');
    
    // Cache the response
    responseCache.set(cacheKey, {
      data: response.trim(),
      timestamp: Date.now(),
    });
    
    // Clean old cache entries (keep max 20 entries)
    if (responseCache.size > 20) {
      const firstKey = responseCache.keys().next().value;
      if (firstKey) {
        responseCache.delete(firstKey);
      }
    }
    
    return response.trim();
  } catch (error: any) {
    console.error('Failed to get AI analysis:', error);
    
    // Pass through the error message from chatCompletion
    if (error?.message) {
      throw error;
    }
    
    // Fallback error
    throw new Error('Unable to get AI health analysis at this time. Please try again later.');
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
    const response = await chatCompletion(messages);
    
    if (!response) {
      throw new Error('No response received from AI');
    }
    
    return response;
  } catch (error) {
    throw new Error('Failed to get health recommendations. Please check your internet connection.');
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
    const response = await chatCompletion(messages);
    
    if (!response) {
      throw new Error('No response received from AI');
    }
    
    return response;
  } catch (error) {
    throw new Error('Unable to analyze trigger patterns. Please consult your healthcare provider for personalized advice.');
  }
};
