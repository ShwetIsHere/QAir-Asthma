/// <reference lib="deno.ns" />

/**
 * Dashboard Aggregator Edge Function
 * 
 * Responsibilities:
 * - Pre-compute statistics for dashboard
 * - Generate trends and insights
 * - Create report data
 * - Update materialized views
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DashboardRequest {
  user_id: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

interface DashboardStats {
  total_triggers: number;
  avg_daily_triggers: number;
  peak_day: string;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  environmental_factors: {
    avg_aqi: number;
    avg_temperature: number;
    common_weather: string;
  };
  trends: {
    increasing: boolean;
    percentage_change: number;
  };
  top_recommendations: string[];
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

    const { user_id, period = 'month' }: DashboardRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DashboardAggregator] Computing stats for user:', user_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date range
    const periodDays = {
      day: 1,
      week: 7,
      month: 30,
      year: 365,
    }[period];

    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch triggers for period
    const { data: triggers, error: triggersError } = await supabase
      .from('triggers')
      .select('*')
      .eq('user_id', user_id)
      .gte('trigger_timestamp', startDate)
      .order('trigger_timestamp', { ascending: false });

    if (triggersError) {
      throw triggersError;
    }

    // Fetch risk records
    const { data: riskRecords, error: riskError } = await supabase
      .from('risk_records')
      .select('*')
      .eq('user_id', user_id)
      .gte('analyzed_at', startDate);

    if (riskError) {
      console.warn('[DashboardAggregator] Risk records error:', riskError);
    }

    // Calculate statistics
    const totalTriggers = triggers?.length || 0;
    const avgDailyTriggers = totalTriggers / periodDays;

    // Find peak day
    const triggersByDay = triggers?.reduce((acc: Record<string, number>, t: any) => {
      const day = t.trigger_timestamp.split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakDay = Object.entries(triggersByDay || {}).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A';

    // Risk distribution
    const riskDistribution = {
      low: riskRecords?.filter((r: any) => r.risk_level === 'low').length || 0,
      medium: riskRecords?.filter((r: any) => r.risk_level === 'medium').length || 0,
      high: riskRecords?.filter((r: any) => r.risk_level === 'high').length || 0,
      critical: riskRecords?.filter((r: any) => r.risk_level === 'critical').length || 0,
    };

    // Environmental factors
    const validAqi = triggers?.filter((t: any) => t.aqi !== null).map((t: any) => t.aqi) || [];
    const validTemp = triggers?.filter((t: any) => t.temperature !== null).map((t: any) => t.temperature) || [];
    const weatherCounts = triggers?.reduce((acc: Record<string, number>, t: any) => {
      if (t.weather_condition) {
        acc[t.weather_condition] = (acc[t.weather_condition] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const avgAqi = validAqi.length > 0 ? validAqi.reduce((a: number, b: number) => a + b, 0) / validAqi.length : 0;
    const avgTemperature = validTemp.length > 0 ? validTemp.reduce((a: number, b: number) => a + b, 0) / validTemp.length : 0;
    const commonWeather = Object.entries(weatherCounts || {}).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'Unknown';

    // Calculate trends (compare to previous period)
    const previousPeriodStart = new Date(Date.now() - 2 * periodDays * 24 * 60 * 60 * 1000).toISOString();
    const previousPeriodEnd = startDate;

    const { data: previousTriggers } = await supabase
      .from('triggers')
      .select('id')
      .eq('user_id', user_id)
      .gte('trigger_timestamp', previousPeriodStart)
      .lt('trigger_timestamp', previousPeriodEnd);

    const previousCount = previousTriggers?.length || 0;
    const percentageChange = previousCount > 0 
      ? ((totalTriggers - previousCount) / previousCount) * 100 
      : 0;

    // Top recommendations
    const allRecommendations = riskRecords?.flatMap((r: any) => r.recommendations || []) || [];
    const recommendationCounts = allRecommendations.reduce((acc: Record<string, number>, rec: string) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRecommendations = Object.entries(recommendationCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([rec]) => rec);

    // Compile dashboard stats
    const dashboardStats: DashboardStats = {
      total_triggers: totalTriggers,
      avg_daily_triggers: Math.round(avgDailyTriggers * 10) / 10,
      peak_day: peakDay,
      risk_distribution: riskDistribution,
      environmental_factors: {
        avg_aqi: Math.round(avgAqi),
        avg_temperature: Math.round(avgTemperature * 10) / 10,
        common_weather: commonWeather,
      },
      trends: {
        increasing: percentageChange > 0,
        percentage_change: Math.round(percentageChange),
      },
      top_recommendations: topRecommendations,
    };

    // Cache the results
    await supabase.from('dashboard_cache').upsert({
      user_id,
      period,
      stats: dashboardStats,
      cached_at: new Date().toISOString(),
    });

    console.log('[DashboardAggregator] Stats computed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        stats: dashboardStats,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[DashboardAggregator] Error:', error);

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
