/// <reference lib="deno.ns" />

/**
 * Trigger Processor Edge Function
 * 
 * Responsibilities:
 * - Validate incoming trigger payloads
 * - Enrich data with additional context
 * - Store in PostgreSQL
 * - Trigger downstream processing (weather, risk analysis)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TriggerPayload {
  trigger_timestamp: string;
  fsr_value: number;
  latitude: number | null;
  longitude: number | null;
  aqi: number | null;
  temperature: number | null;
  humidity: number | null;
  weather_condition: string | null;
  device_id: string | null;
}

serve(async (req: Request) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Parse request body
    const payload: TriggerPayload = await req.json();

    // Validate payload
    if (!payload.trigger_timestamp || typeof payload.fsr_value !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[TriggerProcessor] Processing trigger for user:', user.id);

    // Enrich trigger data
    const enrichedTrigger = {
      ...payload,
      user_id: user.id,
      processed_at: new Date().toISOString(),
    };

    // Insert into triggers table
    const { data: insertedTrigger, error: insertError } = await supabase
      .from('triggers')
      .insert(enrichedTrigger)
      .select()
      .single();

    if (insertError) {
      console.error('[TriggerProcessor] Insert error:', insertError);
      throw insertError;
    }

    console.log('[TriggerProcessor] Trigger stored:', insertedTrigger.id);

    // Trigger downstream processing asynchronously
    const processingPromises = [];

    // 1. Weather aggregation (if location available)
    if (payload.latitude && payload.longitude) {
      processingPromises.push(
        supabase.functions.invoke('aggregate-weather', {
          body: {
            trigger_id: insertedTrigger.id,
            latitude: payload.latitude,
            longitude: payload.longitude,
          },
        })
      );
    }

    // 2. Risk analysis
    processingPromises.push(
      supabase.functions.invoke('analyze-risk', {
        body: {
          trigger_id: insertedTrigger.id,
          user_id: user.id,
        },
      })
    );

    // Don't wait for downstream processing (fire and forget)
    Promise.all(processingPromises).catch((error) => {
      console.error('[TriggerProcessor] Downstream processing error:', error);
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        trigger_id: insertedTrigger.id,
        message: 'Trigger processed successfully',
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
    console.error('[TriggerProcessor] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
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
