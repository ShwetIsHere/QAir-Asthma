import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLowInhalerAlert } from '@/utils/notificationService';

const KEY = 'inhalerRemainingDoses';
const DEFAULT_TOTAL = 30;
const LOW_THRESHOLD = 5;

export async function getRemainingDoses() {
  const val = await AsyncStorage.getItem(KEY);
  if (val === null) {
    await AsyncStorage.setItem(KEY, String(DEFAULT_TOTAL));
    return DEFAULT_TOTAL;
  }
  return Math.max(0, Number(val));
}

export async function decrementDose() {
  const current = await getRemainingDoses();
  const next = Math.max(0, current - 1);
  await AsyncStorage.setItem(KEY, String(next));
  if (next > 0 && next <= LOW_THRESHOLD) {
    // Fire one-time alert per value; to reduce spam, rely on notification cooldown globally if needed
    await sendLowInhalerAlert(next).catch(() => {});
  }
  return next;
}

export async function resetDoses(total = DEFAULT_TOTAL) {
  const t = total > 0 ? total : DEFAULT_TOTAL;
  await AsyncStorage.setItem(KEY, String(t));
  return t;
}
