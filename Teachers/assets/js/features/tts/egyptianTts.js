/**
 * Egyptian Arabic Text-to-Speech tool — Sabeel Academy
 * Pure ES module: spelling correction + multi-engine speech synthesis.
 */

const API_KEY_STORAGE = 'sabeel_gemini_api_key';
const HISTORY_STORAGE = 'sabeel_tts_history_v1';
const TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const TEXT_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];

export const VOICE_PRESETS = [
  { id: 'sheikh', name: 'الشيخ الهادئ', desc: 'وقار وهدوء تعليمي', voice: 'Fenrir', gender: 'male', icon: 'book-open' },
  { id: 'teacher', name: 'المعلّم المصري', desc: 'شرح واضح وحماسي', voice: 'Charon', gender: 'male', icon: 'presentation' },
  { id: 'broadcaster', name: 'المذيع الإعلاني', desc: 'إعلانات وحملات', voice: 'Puck', gender: 'male', icon: 'mic' },
  { id: 'youth', name: 'الشاب العصري', desc: 'سوشيال ميديا وريلز', voice: 'Zephyr', gender: 'male', icon: 'zap' },
  { id: 'mother', name: 'الأم المصرية', desc: 'دفء وودّ عائلي', voice: 'Kore', gender: 'female', icon: 'heart' },
  { id: 'documentary', name: 'المعلّقة الرسمية', desc: 'وثائقيات وكورسات', voice: 'Aoede', gender: 'female', icon: 'clapperboard' },
];

export const ACCENTS = [
  { id: 'egyptian_cairene', name: 'مصري قاهري', guide: 'Modern Cairene Egyptian Arabic. Soft glottal stops, modern Cairene Jim, urban cadence, crisp friendly clarity.' },
  { id: 'egyptian_saidi', name: 'صعيدي', guide: 'Authentic Saidi Upper Egyptian Arabic. Deep resonant Qaf, heavy emphatic consonants, warm traditional gravitas.' },
  { id: 'egyptian_alexandrian', name: 'إسكندراني', guide: 'Coastal Alexandrian Egyptian Arabic. Melodic maritime rhythm, extended vowels, relaxed Mediterranean warmth.' },
  { id: 'egyptian_bedouin', name: 'بدوي / سينائي', guide: 'Bedouin Sinai Arabic. Soft rhythmic desert cadence, wise and hospitable traditional tone.' },
  { id: 'egyptian_documentary', name: 'وثائقي مصري', guide: 'Classic Egyptian golden-age broadcast style. Flawless Arabic phonetics with deep authoritative documentary warmth.' },
];

export const TONES = [
  { id: 'calm', name: 'هادئ', prompt: 'calm, relaxed and reassuring' },
  { id: 'friendly', name: 'ودود', prompt: 'warm, friendly and intimate' },
  { id: 'energetic', name: 'حماسي', prompt: 'energetic, enthusiastic and upbeat' },
  { id: 'formal', name: 'رسمي', prompt: 'formal, composed and professional' },
  { id: 'emotional', name: 'عاطفي', prompt: 'emotionally expressive and heartfelt' },
];

/* ------------------------------------------------------------------ */
/* API key                                                             */
/* ------------------------------------------------------------------ */

export function getApiKey() {
  try { return (localStorage.getItem(API_KEY_STORAGE) || '').trim(); } catch { return ''; }
}

export function setApiKey(key) {
  try {
    const value = (key || '').trim();
    if (value) localStorage.setItem(API_KEY_STORAGE, value);
    else localStorage.removeItem(API_KEY_STORAGE);
    return true;
  } catch { return false; }
}

/* ------------------------------------------------------------------ */
/* Deterministic Arabic spelling correction                           */
/* ------------------------------------------------------------------ */

const WORD_FIXES = {
  // hamza / alef
  انا: 'أنا', اناا: 'أنا', انت: 'أنت', انتو: 'إنتو', احنا: 'إحنا',
  اخو: 'أخو', ابو: 'أبو', ام: 'أم', اخبارك: 'أخبارك', اخبار: 'أخبار',
  اكيد: 'أكيد', اوي: 'أوي', اويي: 'أوي', ايه: 'إيه', ازيك: 'إزيك',
  اسف: 'آسف', اسفين: 'آسفين', استاذ: 'أستاذ', استاذه: 'أستاذة',
  اساسا: 'أساسًا', اخيرا: 'أخيرًا', اخر: 'آخر', الان: 'الآن', امس: 'أمس', المسا: 'المساء',
  الاداره: 'الإدارة', الامل: 'الأمل', الاب: 'الأب', الام: 'الأم', الاخ: 'الأخ',
  // المصرية اليومية
  اللى: 'اللي', الللى: 'اللي', الى: 'إلى',
  مدرسه: 'مدرسة', جامعه: 'جامعة', شركه: 'شركة', مشكله: 'مشكلة', فكره: 'فكرة',
  جميله: 'جميلة', كبيره: 'كبيرة', صغيره: 'صغيرة', طويله: 'طويلة', قصيره: 'قصيرة',
  جديده: 'جديدة', قديمه: 'قديمة', غاليه: 'غالية', رخيصه: 'رخيصة', مهمه: 'مهمة',
  واضحه: 'واضحة', ممتازه: 'ممتازة', مبروكه: 'مبروكة',
  المعلمه: 'المعلمة', المدرسه: 'المدرسة', الجامعه: 'الجامعة', الشركه: 'الشركة',
  المحافظه: 'المحافظة', المدينه: 'المدينة', القريه: 'القرية', المزرعه: 'المزرعة',
  الحديقه: 'الحديقة', المكتبه: 'المكتبة', الاساتذه: 'الأساتذة',
  // تنوين
  شكرا: 'شكرًا', شكررا: 'شكرًا', جدا: 'جدًا', غالبا: 'غالبًا', طبعا: 'طبعًا',
  مثلا: 'مثلًا', خصوصا: 'خصوصًا', عموما: 'عمومًا', فعلا: 'فعلًا',
  فعليا: 'فعليًا', اساسيا: 'أساسيًا', طبيعيا: 'طبيعيًا',
  // مفردات المدرسة والدراسة
  اسئلة: 'أسئلة', اسئله: 'أسئلة', اجابات: 'إجابات', اجابه: 'إجابة',
  درجه: 'درجة', الدرجه: 'الدرجة', نتيجه: 'نتيجة', النتيجه: 'النتيجة',
  لغه: 'لغة', اللغه: 'اللغة', انجليزي: 'إنجليزي', مادّه: 'مادة',
  المعلم: 'المعلّم', معلم: 'معلّم', المعلمين: 'المعلّمين',
  عربيه: 'عربية', مصريه: 'مصرية', إنجليزيه: 'إنجليزية', انجليزيه: 'إنجليزية',
  وطنيه: 'وطنية', علميه: 'علمية', أدبيه: 'أدبية', تجاريه: 'تجارية',
  إداريه: 'إدارية', اداريه: 'إدارية', ماليه: 'مالية', اجتماعيه: 'اجتماعية',
};

const PHRASE_FIXES = [
  ['الحمدلله', 'الحمد لله'],
  ['الحمد لله', 'الحمد لله'],
  ['ان شاء الله', 'إن شاء الله'],
  ['انشاءالله', 'إن شاء الله'],
  ['انشاء الله', 'إن شاء الله'],
  ['الله اعلم', 'الله أعلم'],
  ['مع السلامه', 'مع السلامة'],
  ['كل عام وانت بخير', 'كل عام وأنت بخير'],
  ['كل سنه وانت طيب', 'كل سنة وأنت طيب'],
  ['شكرا جزيلا', 'شكرًا جزيلًا'],
  ['شكررا جزيلا', 'شكرًا جزيلًا'],
  ['يا استاذ', 'يا أستاذ'],
];

const ARABIC_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

// These words legitimately end with alif maqsura and must NOT become ي.
const FINAL_YA_EXCLUDE = new Set(['على', 'إلى', 'الى', 'حتى', 'متى', 'موسى', 'عيسى', 'يحيى', 'بلى', 'لدى', 'أنى']);
// Arabic clitics that attach directly to the following word (والمدرسة، بالشركة...).
const CLITICS = ['و', 'ف', 'ب', 'ل', 'ك'];

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const letterRx = '[\\p{L}\\p{M}]';

function collectChange(changes, from, to, type) {
  if (from !== to && !changes.some((c) => c.from === from && c.to === to)) {
    changes.push({ from, to, type });
  }
}

/** Removes Arabic diacritics only from the text sent to the speech engine. */
export function stripTashkeelText(text) {
  // Keep shadda (\u0651): it carries consonant gemination that TTS needs.
  return String(text || '').replace(/[\u064B-\u0650\u0652-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Corrects common Egyptian Arabic misspellings deterministically.
 * @returns {{corrected: string, changes: Array<{from:string,to:string,type:string}>}}
 */
export function normalizeEgyptianArabic(input, { stripTashkeel = false } = {}) {
  const changes = [];
  let text = String(input || '').normalize('NFC');

  // Strip invisible control characters and tatweel.
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\uFEFF\u0640]/g, '');

  if (stripTashkeel) text = stripTashkeelText(text);

  // Arabic-Indic digits are read less reliably by TTS engines.
  text = text.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] || d);

  // Repeated letters caused by typing slips: شكررا / مممكن / اويي
  text = text.replace(/(.)\1{2,}/gu, (m, ch) => {
    const fixed = ch + ch;
    collectChange(changes, m, fixed, 'تكرار حروف');
    return fixed;
  });

  // Multi-word phrases first (longest match wins).
  const sortedPhrases = [...PHRASE_FIXES].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sortedPhrases) {
    const rx = new RegExp(`(?<!${letterRx})${escapeRx(from)}(?!${letterRx})`, 'gu');
    text = text.replace(rx, (m) => {
      collectChange(changes, m, to, 'صياغة');
      return to;
    });
  }

  // Single words — token-based so attached clitics (و/ف/ب/ل/ك) are corrected too.
  text = text.replace(/[\p{L}\p{M}]+/gu, (token) => {
    let fixed = WORD_FIXES[token];
    let type = 'إملاء';

    if (!fixed) {
      for (const clitic of CLITICS) {
        if (token.length > 3 && token.startsWith(clitic)) {
          const rest = token.slice(1);
          if (WORD_FIXES[rest]) { fixed = clitic + WORD_FIXES[rest]; break; }
        }
      }
    }

    // Final alif maqsura → regular ya, except for words where it is correct.
    if (!fixed && token.endsWith('ى') && token.length > 2 && !FINAL_YA_EXCLUDE.has(token)) {
      fixed = `${token.slice(0, -1)}ي`;
      type = 'ألف مقصورة';
    }

    if (fixed && fixed !== token) {
      collectChange(changes, token, fixed, type);
      return fixed;
    }
    return token;
  });

  // Punctuation spacing.
  text = text.replace(/[ \t]+([،؛؟.!،,])/g, '$1');
  text = text.replace(/([،؛؟.!،,])(?=\p{L})/gu, '$1 ');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.split('\n').map((line) => line.trim()).join('\n');
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return { corrected: text, changes };
}

/** Words whose corrected form changed — used for highlighting. */
export function changedWords(changes) {
  return new Set(changes.map((c) => c.to).filter(Boolean));
}

/* ------------------------------------------------------------------ */
/* Optional AI proofreading                                            */
/* ------------------------------------------------------------------ */

async function geminiGenerate(prompt, apiKey, models, config = {}) {
  const urlBase = 'https://generativelanguage.googleapis.com/v1beta/models/';
  let lastError;
  for (const model of models) {
    try {
      const res = await fetch(`${urlBase}${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: config,
        }),
      });
      if (res.ok) return await res.json();
      lastError = new Error(`Gemini ${model}: HTTP ${res.status}`);
      if (res.status !== 404) {
        const detail = await res.text().catch(() => '');
        if (detail) {
          try {
            const j = JSON.parse(detail);
            if (j?.error?.message) lastError.message = j.error.message;
          } catch { /* keep generic error */ }
        }
        break;
      }
    } catch (err) {
      lastError = err;
      break;
    }
  }
  throw lastError || new Error('تعذر الاتصال بـ Gemini');
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

export async function aiCorrectText(text, apiKey) {
  const prompt = `أنت مدقّق لغوي محترف في اللغة العربية بلهجة مصرية.
صحّح كل الأخطاء الإملائية والنحوية في النص التالي مع الالتزام الصارم بالقواعد:
- احتفظ باللهجة المصرية الأصلية ومعنى النص وتقسيم الأسطر بالكامل.
- لا تترجم النص ولا تغيّر أسلوبه، ولا تحذف أو تضيف جملًا.
- ابدأ الهمزات correctly مثل: أنا، أنت، إحنا، إلى، إن شاء الله.
- اكتب نهاية الكلمات المؤنثة بالتاء المربوطة: مدرسة، شركة، مشكلة.
- أعد النص خاليًا تمامًا من أي خطأ إملائي.
أرجع JSON فقط بالصيغة:
{"corrected":"النص المصحح كاملًا","changes":[{"from":"الكلمة الخاطئة","to":"الصحيحة"}]}

النص:
${text}`;

  const data = await geminiGenerate(prompt, apiKey, TEXT_MODELS, { temperature: 0, responseMimeType: 'application/json' });
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const raw = parts.map((p) => p.text || '').join('');
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed.corrected !== 'string' || !parsed.corrected.trim()) {
    throw new Error('لم أتمكن من قراءة نتيجة التدقيق');
  }
  return {
    corrected: parsed.corrected.trim(),
    changes: Array.isArray(parsed.changes) ? parsed.changes.filter((c) => c && c.from && c.to) : [],
  };
}

/* ------------------------------------------------------------------ */
/* Speech engines                                                      */
/* ------------------------------------------------------------------ */

function splitText(text, max = 700) {
  const paragraphs = String(text).split(/\n{2,}/);
  const chunks = [];
  let current = '';
  const pushCurrent = () => { if (current.trim()) { chunks.push(current.trim()); current = ''; } };

  for (const para of paragraphs) {
    if (para.length <= max) {
      if ((current + '\n\n' + para).trim().length > max) pushCurrent();
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }
    pushCurrent();
    const sentences = para.match(/[^.!؟?]+[.!؟?]?\s*/gu) || [para];
    for (const sentence of sentences) {
      if ((current + sentence).length > max) pushCurrent();
      current += sentence;
    }
  }
  pushCurrent();
  return chunks.length ? chunks : [String(text).trim()];
}

function base64ToBytes(base64) {
  const binary = atob(String(base64 || '').replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

function pcmToWavBlob(pcm, sampleRate = 24000) {
  const buffer = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buffer);
  const write = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.length, true);
  new Uint8Array(buffer).set(pcm, 44);
  return new Blob([buffer], { type: 'audio/wav' });
}

function bytesToBlob(bytes, mimeType) {
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

async function synthesizeWithGemini({ text, preset, accent, tone, speed, apiKey, onProgress }) {
  const pcmChunks = [];
  let sampleRate = 24000;
  const chunks = splitText(text);

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(`جاري توليد الصوت (${i + 1}/${chunks.length})...`);
    const prompt = `Produce a natural, human-sounding Arabic voiceover. Read ONLY the text between the quotes, aloud, without translating it and without adding any commentary.
Dialect: ${accent.guide}
Speaker persona: ${preset.name} (${preset.gender === 'female' ? 'female' : 'male'} voice)
Delivery style: ${tone.prompt}
Speaking pace: ${speed < 0.9 ? 'slightly slow and clear' : speed > 1.1 ? 'slightly brisk' : 'natural conversational pace'}.
Pronounce every Egyptian Arabic word naturally with correct idioms and consonants.

"${chunks[i]}"`;

    const data = await geminiGenerate(prompt, apiKey, TTS_MODELS, {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: preset.voice } } },
    });
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find((p) => p?.inlineData?.data);
    if (!audioPart) throw new Error('لم يتم إرجاع بيانات صوتية من Gemini');
    const mime = audioPart.inlineData.mimeType || 'audio/pcm;rate=24000';
    const rateMatch = String(mime).match(/rate=(\d+)/i);
    if (rateMatch) sampleRate = Number(rateMatch[1]);
    pcmChunks.push(base64ToBytes(audioPart.inlineData.data));
  }

  return pcmToWavBlob(concatBytes(pcmChunks), sampleRate);
}

async function synthesizeWithServer(text, onProgress) {
  onProgress?.('جاري توليد الصوت عبر محرك النطق العربي...');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => null);
    if (!data?.success || !data?.base64Audio) throw new Error('استجابة صوتية غير صالحة');
    const mimeType = data.mimeType || 'audio/mpeg';
    const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
    return { blob: bytesToBlob(base64ToBytes(data.base64Audio), mimeType), ext, provider: data.provider || 'محرك النطق العربي' };
  } finally {
    clearTimeout(timer);
  }
}

let activeUtterance = null;

export function stopSpeech() {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  activeUtterance = null;
}

function speakWithBrowser(text, preset, speed) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) { reject(new Error('متصفحك لا يدعم النطق الآلي')); return; }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-EG';
    utterance.rate = Math.min(1.6, Math.max(0.5, speed));
    utterance.pitch = preset.gender === 'female' ? 1.08 : 0.92;
    const voices = window.speechSynthesis.getVoices() || [];
    const voice = voices.find((v) => /ar[-_]EG/i.test(v.lang)) || voices.find((v) => /^ar/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => { activeUtterance = null; resolve(); };
    utterance.onerror = (e) => {
      activeUtterance = null;
      if (e.error === 'interrupted' || e.error === 'canceled') { resolve(); return; }
      reject(new Error(e.error || 'تعذر النطق'));
    };
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Generates audio. Returns { blob, ext, provider } — blob is null for the browser engine.
 */
export async function synthesize({ text, preset, accent, tone, speed, apiKey, useAI = true, onProgress }) {
  const failures = [];

  if (apiKey && useAI) {
    try {
      const blob = await synthesizeWithGemini({ text, preset, accent, tone, speed, apiKey, onProgress });
      return { blob, ext: 'wav', provider: 'Gemini TTS — صوت مصري احترافي' };
    } catch (err) {
      failures.push(`Gemini: ${err.message || err}`);
    }
  }

  try {
    const result = await synthesizeWithServer(text, onProgress);
    return result;
  } catch (err) {
    failures.push(`الخادم: ${err.message || err}`);
  }

  onProgress?.('جاري النطق عبر صوت المتصفح...');
  try {
    await speakWithBrowser(text, preset, speed);
    return { blob: null, ext: null, provider: 'صوت المتصفح (استماع فقط — أضف مفتاح Gemini لتحميل الملف)' };
  } catch (err) {
    const detail = failures.length ? ` | ${failures.join(' | ')}` : '';
    throw new Error(`تعذر توليد الصوت: ${err.message || err}${detail}`);
  }
}

/* ------------------------------------------------------------------ */
/* History + download helpers                                          */
/* ------------------------------------------------------------------ */

export function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch { return []; }
}

export function saveHistory(entry) {
  const list = [entry, ...loadHistory().filter((e) => e.text !== entry.text)].slice(0, 12);
  try { localStorage.setItem(HISTORY_STORAGE, JSON.stringify(list)); } catch { /* ignore */ }
  return list;
}

export function clearHistory() {
  try { localStorage.removeItem(HISTORY_STORAGE); } catch { /* ignore */ }
  return [];
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
