import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryCache = new Map<string, string>();

function safeDecode(value: string): string {
  if (!value) return value;
  
  // กำจัดช่องว่างที่แทรกอยู่ใน percent-encoding เช่น "%E0% B8% 81" -> "%E0%B8%81"
  let cleaned = value.replace(/%([0-9A-Fa-f])\s+([0-9A-Fa-f])/g, '%$1$2');
  cleaned = cleaned.replace(/%\s+([0-9A-Fa-f]{2})/g, '%$1');

  if (!/%[0-9A-Fa-f]{2}/.test(cleaned)) return cleaned;
  try {
    return decodeURIComponent(cleaned);
  } catch {
    return value;
  }
}

export async function translateText(
  text: string,
  targetLang: 'th' | 'en' = 'en'
): Promise<string> {
  const raw = String(text ?? '').trim();
  if (!raw) return String(text ?? '');

  if (targetLang === 'th') return raw;
  if (!/[ก-๙a-zA-Z]/.test(raw)) return raw;

  const cacheKey = `en:${raw}`;

  if (memoryCache.has(cacheKey)) {
    return safeDecode(memoryCache.get(cacheKey)!);
  }

  try {
    const stored = await AsyncStorage.getItem(`tr:${cacheKey}`);
    if (stored) {
      const decoded = safeDecode(stored);
      if (decoded !== stored && /%[0-9A-Fa-f]{2}/.test(stored)) {
        await AsyncStorage.removeItem(`tr:${cacheKey}`);
      } else {
        memoryCache.set(cacheKey, decoded);
        return decoded;
      }
    }
  } catch {}

  try {
    const email = 'jeerananbuanlerst@gmail.com'; 
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      raw
    )}&langpair=th|en&de=${email}`;

    const res = await fetch(url);
    const json = await res.json();

    let translated: string =
      json?.responseData?.translatedText ||
      json?.matches?.[0]?.translation ||
      raw;

    translated = safeDecode(String(translated || raw)).trim();
    if (!translated) translated = raw;

    memoryCache.set(cacheKey, translated);
    AsyncStorage.setItem(`tr:${cacheKey}`, translated).catch(() => {});
    return translated;
  } catch (e) {
    console.log('translateText error', e);
    return raw;
  }
}

export async function clearTranslateCache() {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const trKeys = keys.filter((k) => k.startsWith('tr:'));
    if (trKeys.length) {
      await AsyncStorage.multiRemove(trKeys);
      console.log('Translate cache cleared successfully.');
    }
  } catch (e) {
    console.log('Clear cache error:', e);
  }
}