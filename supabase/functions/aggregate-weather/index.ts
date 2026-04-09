/// <reference lib="deno.ns" />

/**
 * Weather Aggregator Edge Function
 * 
 * Responsibilities:
 * - Call weather APIs in parallel (OpenWeather, Metro Weather)
 * - Cache results to minimize API calls
 * - Store enriched weather data
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WeatherRequest {
  trigger_id: number;
  latitude: number;
  longitude: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  weather_condition: string;
  aqi: number;
  pm25: number;
  pm10: number;
  pollen_level: number | null;
  source: string;
  cached: boolean;
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const { trigger_id, latitude, longitude }: WeatherRequest = await req.json();

    if (!trigger_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[WeatherAggregator] Fetching weather for trigger:', trigger_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first (5-minute cache window)
    const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: cachedWeather } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('location_key', cacheKey)
      .gte('cached_at', fiveMinutesAgo)
      .order('cached_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedWeather) {
      console.log('[WeatherAggregator] Using cached weather data');

      // Update trigger with cached weather
      await supabase
        .from('triggers')
        .update({
          temperature: cachedWeather.temperature,
          humidity: cachedWeather.humidity,
          aqi: cachedWeather.aqi,
          weather_condition: cachedWeather.weather_condition,
        })
        .eq('id', trigger_id);

      return new Response(
        JSON.stringify({ success: true, cached: true, data: cachedWeather }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Fetch from APIs in parallel
    console.log('[WeatherAggregator] Fetching fresh weather data...');

    const [weatherResponse, airQualityResponse] = await Promise.allSettled([
      // Open-Meteo weather API
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weathercode,cloudcover,pressure_msl,visibility,wind_speed_10m&daily=uv_index_max&timezone=auto`
      ),
      // Open-Meteo air quality API
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,us_aqi&timezone=auto`
      ),
    ]);

    let weatherData: Partial<WeatherData> = {
      cached: false,
    };

    // Process Open-Meteo weather response
    if (weatherResponse.status === 'fulfilled') {
      const weatherApiData = await weatherResponse.value.json();
      const weatherCode = weatherApiData?.current?.weathercode;

      const weatherConditionMap: Record<number, string> = {
        0: 'Clear',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Fog',
        51: 'Drizzle',
        53: 'Drizzle',
        55: 'Drizzle',
        56: 'Freezing Drizzle',
        57: 'Freezing Drizzle',
        61: 'Rain',
        63: 'Rain',
        65: 'Heavy Rain',
        66: 'Freezing Rain',
        67: 'Freezing Rain',
        71: 'Snow',
        73: 'Snow',
        75: 'Heavy Snow',
        77: 'Snow Grains',
        80: 'Rain Showers',
        81: 'Rain Showers',
        82: 'Heavy Rain Showers',
        85: 'Snow Showers',
        86: 'Snow Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm',
        99: 'Thunderstorm',
      };

      weatherData = {
        ...weatherData,
        temperature: weatherApiData?.current?.temperature_2m,
        humidity: weatherApiData?.current?.relative_humidity_2m,
        pressure: weatherApiData?.current?.pressure_msl,
        weather_condition: weatherConditionMap[weatherCode] ?? 'Unknown',
        source: 'Open-Meteo',
      };
    }

    // Process Open-Meteo air quality response
    if (airQualityResponse.status === 'fulfilled') {
      const airQualityData = await airQualityResponse.value.json();
      weatherData = {
        ...weatherData,
        aqi: airQualityData?.current?.us_aqi,
        pm25: airQualityData?.current?.pm2_5,
        pm10: airQualityData?.current?.pm10,
        pollen_level: null,
      };
    }

    // Store in cache
    await supabase.from('weather_cache').insert({
      location_key: cacheKey,
      latitude,
      longitude,
      ...weatherData,
      cached_at: new Date().toISOString(),
    });

    // Update trigger with weather data
    await supabase
      .from('triggers')
      .update({
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        aqi: weatherData.aqi,
        weather_condition: weatherData.weather_condition,
      })
      .eq('id', trigger_id);

    console.log('[WeatherAggregator] Weather data stored successfully');

    return new Response(
      JSON.stringify({ success: true, cached: false, data: weatherData }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[WeatherAggregator] Error:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
