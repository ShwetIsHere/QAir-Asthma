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
const openWeatherApiKey = Deno.env.get('OPENWEATHER_API_KEY')!;
const metroWeatherApiKey = Deno.env.get('METRO_WEATHER_API_KEY')!;

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

    const [openWeatherResponse, metroWeatherResponse] = await Promise.allSettled([
      // OpenWeather API
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}&units=metric`
      ),
      // Metro Weather API (for AQI and pollen)
      fetch(
        `https://api.metroweather.com/v1/air-quality?lat=${latitude}&lon=${longitude}&key=${metroWeatherApiKey}`
      ),
    ]);

    let weatherData: Partial<WeatherData> = {
      cached: false,
    };

    // Process OpenWeather response
    if (openWeatherResponse.status === 'fulfilled') {
      const owData = await openWeatherResponse.value.json();
      weatherData = {
        ...weatherData,
        temperature: owData.main.temp,
        humidity: owData.main.humidity,
        pressure: owData.main.pressure,
        weather_condition: owData.weather[0].main,
        source: 'OpenWeather',
      };
    }

    // Process Metro Weather response
    if (metroWeatherResponse.status === 'fulfilled') {
      const mwData = await metroWeatherResponse.value.json();
      weatherData = {
        ...weatherData,
        aqi: mwData.aqi,
        pm25: mwData.pm25,
        pm10: mwData.pm10,
        pollen_level: mwData.pollen_level,
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
