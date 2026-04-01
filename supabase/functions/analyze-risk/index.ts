/// <reference lib="deno.ns" />

/**
 * Gemini AI Analyzer Edge Function
 * 
 * Responsibilities:
 * - Pattern matching for trigger patterns
 * - Risk prediction based on historical data
 * - Generate personalized risk alerts
 * - Identify triggers and correlations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('BACKUP_API_KEY') || Deno.env.get('backup_api_key');

if (!geminiApiKey) {
  throw new Error('Missing Gemini API key. Set GEMINI_API_KEY or BACKUP_API_KEY.');
}

interface RiskAnalysisRequest {
  trigger_id: number;
  user_id: string;
}

interface RiskAnalysisResult {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  patterns_detected: string[];
  recommendations: string[];
  alert_required: boolean;
  alert_message: string | null;
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

    const { trigger_id, user_id }: RiskAnalysisRequest = await req.json();

    if (!trigger_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GeminiAnalyzer] Analyzing risk for trigger:', trigger_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current trigger
    const { data: currentTrigger, error: triggerError } = await supabase
      .from('triggers')
      .select('*')
      .eq('id', trigger_id)
      .single();

    if (triggerError || !currentTrigger) {
      throw new Error('Trigger not found');
    }

    // Get user's recent trigger history (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentTriggers, error: historyError } = await supabase
      .from('triggers')
      .select('*')
      .eq('user_id', user_id)
      .gte('trigger_timestamp', thirtyDaysAgo)
      .order('trigger_timestamp', { ascending: false })
      .limit(100);

    if (historyError) {
      console.error('[GeminiAnalyzer] Error fetching history:', historyError);
    }

    // Calculate basic risk metrics
    const triggerCount30Days = recentTriggers?.length || 0;
    const avgTriggersPerDay = triggerCount30Days / 30;

    // Count today's triggers
    const today = new Date().toISOString().split('T')[0];
    const todayTriggers = recentTriggers?.filter((t: any) =>
      t.trigger_timestamp.startsWith(today)
    ).length || 0;

    // Prepare data for Gemini AI analysis
    const analysisContext = {
      current_trigger: {
        timestamp: currentTrigger.trigger_timestamp,
        aqi: currentTrigger.aqi,
        temperature: currentTrigger.temperature,
        humidity: currentTrigger.humidity,
        weather: currentTrigger.weather_condition,
      },
      history: {
        total_triggers_30d: triggerCount30Days,
        avg_triggers_per_day: avgTriggersPerDay,
        triggers_today: todayTriggers,
        recent_triggers: recentTriggers?.slice(0, 10).map((t: any) => ({
          timestamp: t.trigger_timestamp,
          aqi: t.aqi,
          temperature: t.temperature,
          weather: t.weather_condition,
        })),
      },
    };

    // Call Gemini AI for pattern analysis
    console.log('[GeminiAnalyzer] Calling Gemini AI...');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this asthma trigger event and identify patterns and risk factors:

${JSON.stringify(analysisContext, null, 2)}

Provide a risk assessment with:
1. Risk level (low/medium/high/critical)
2. Risk score (0-100)
3. Detected patterns (e.g., "High AQI correlation", "Weather sensitivity")
4. Specific recommendations
5. Whether an immediate alert is needed

Format response as JSON.`,
                },
              ],
            },
          ],
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const aiAnalysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse AI response (with fallback)
    let riskAnalysis: RiskAnalysisResult;

    try {
      const parsed = JSON.parse(aiAnalysis);
      riskAnalysis = {
        risk_level: parsed.risk_level || 'medium',
        risk_score: parsed.risk_score || 50,
        patterns_detected: parsed.patterns_detected || [],
        recommendations: parsed.recommendations || [],
        alert_required: parsed.alert_required || false,
        alert_message: parsed.alert_message || null,
      };
    } catch {
      // Fallback to rule-based analysis
      riskAnalysis = {
        risk_level: todayTriggers >= 3 ? 'high' : avgTriggersPerDay > 2 ? 'medium' : 'low',
        risk_score: Math.min(100, todayTriggers * 20 + avgTriggersPerDay * 10),
        patterns_detected: [
          todayTriggers >= 3 ? 'Multiple triggers today' : '',
          currentTrigger.aqi && currentTrigger.aqi > 100 ? 'Poor air quality' : '',
        ].filter(Boolean),
        recommendations: [
          'Monitor your inhaler usage',
          'Check environmental conditions',
        ],
        alert_required: todayTriggers >= 3,
        alert_message: todayTriggers >= 3 ? 'High trigger frequency detected today' : null,
      };
    }

    // Store risk record
    const { data: riskRecord, error: riskError } = await supabase
      .from('risk_records')
      .insert({
        trigger_id,
        user_id,
        risk_level: riskAnalysis.risk_level,
        risk_score: riskAnalysis.risk_score,
        patterns_detected: riskAnalysis.patterns_detected,
        recommendations: riskAnalysis.recommendations,
        analyzed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (riskError) {
      console.error('[GeminiAnalyzer] Error storing risk record:', riskError);
    }

    // Send alert if required
    if (riskAnalysis.alert_required && riskAnalysis.alert_message) {
      console.log('[GeminiAnalyzer] Triggering alert broadcast...');

      // Broadcast alert via Realtime
      await supabase
        .from('risk_alerts')
        .insert({
          user_id,
          trigger_id,
          risk_level: riskAnalysis.risk_level,
          alert_message: riskAnalysis.alert_message,
          created_at: new Date().toISOString(),
        });
    }

    console.log('[GeminiAnalyzer] Analysis completed');

    return new Response(
      JSON.stringify({
        success: true,
        risk_analysis: riskAnalysis,
        risk_record_id: riskRecord?.id,
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
    console.error('[GeminiAnalyzer] Error:', error);

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
