import { sendLowInhalerAlert } from '@/utils/notificationService';
import { supabase } from '@/utils/supabase';

const DEFAULT_TOTAL = 30;
const LOW_THRESHOLD = 5;
const WARNING_THRESHOLD = 10;

/**
 * Get remaining doses from database
 * If no record exists, creates one with default value (30 doses)
 */
export async function getRemainingDoses(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_TOTAL;

    // Try to get existing record
    const { data, error } = await supabase
      .from('inhaler_count')
      .select('remaining_doses')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record exists, create one using upsert to handle race conditions
        const { data: newData, error: upsertError } = await supabase
          .from('inhaler_count')
          .upsert({
            user_id: user.id,
            remaining_doses: DEFAULT_TOTAL,
            total_doses: DEFAULT_TOTAL,
            last_reset_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          })
          .select('remaining_doses')
          .single();

        if (upsertError) {
          console.error('Error creating inhaler count:', upsertError);
          return DEFAULT_TOTAL;
        }

        return newData?.remaining_doses ?? DEFAULT_TOTAL;
      }

      console.error('Error fetching inhaler count:', error);
      return DEFAULT_TOTAL;
    }

    return Math.max(0, data?.remaining_doses ?? DEFAULT_TOTAL);
  } catch (error) {
    console.error('Error in getRemainingDoses:', error);
    return DEFAULT_TOTAL;
  }
}

/**
 * Decrement dose count by 1 in database
 * Sends alert notification if doses are low (≤5) or warning if <10
 */
export async function decrementDose(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_TOTAL;

    const current = await getRemainingDoses();
    const next = Math.max(0, current - 1);

    // Update in database
    const { error } = await supabase
      .from('inhaler_count')
      .update({ 
        remaining_doses: next,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error decrementing dose:', error);
      return current;
    }

    // Send notifications based on remaining doses
    if (next > 0 && next < WARNING_THRESHOLD) {
      await sendLowInhalerAlert(next).catch(() => {});
    }

    return next;
  } catch (error) {
    console.error('Error in decrementDose:', error);
    const current = await getRemainingDoses();
    return current;
  }
}

/**
 * Reset inhaler count to specified total (default 30) in database
 * @param total Number of doses to reset to (default: 30)
 */
export async function resetDoses(total = DEFAULT_TOTAL): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_TOTAL;

    const t = total > 0 ? total : DEFAULT_TOTAL;

    // Use upsert to handle both insert and update scenarios
    const { error } = await supabase
      .from('inhaler_count')
      .upsert({
        user_id: user.id,
        remaining_doses: t,
        total_doses: t,
        last_reset_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error resetting doses:', error);
      return t;
    }

    return t;
  } catch (error) {
    console.error('Error in resetDoses:', error);
    return total > 0 ? total : DEFAULT_TOTAL;
  }
}
