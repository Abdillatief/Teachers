import { GradingResult, CorrectionError } from '../types';
import {
  countArabicWords,
  groupAndDeduplicateErrors,
  calculateLanguageScoreWithRules,
  buildStudentTextWithUnderlines,
} from '../utils/arabicEvaluator';

const STORAGE_KEY = 'sabeel_gemini_api_key';

export function getStoredApiKey(): string {
  try {
    const metaEnv = (import.meta as any).env || {};
    return (
      localStorage.getItem(STORAGE_KEY) ||
      (metaEnv.VITE_GEMINI_API_KEY as string) ||
      ''
    );
  } catch {
    const metaEnv = (import.meta as any).env || {};
    return (metaEnv.VITE_GEMINI_API_KEY as string) || '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving API key to localStorage', e);
  }
}

export function calculateLanguageScore(
  errorCount: number,
  letterCheck?: {
    isLetter: boolean;
    hasSenderReceiverBox: boolean;
    hasIntroduction: boolean;
    hasConclusion: boolean;
  }
): {
  baseScore: number;
  deduction: number;
  finalScore: number;
  reason: string;
  missingElements: string[];
} {
  let baseScore = 10;
  let errorBracketReason = '';

  if (errorCount <= 5) {
    baseScore = 10;
    errorBracketReason = `حصل على 10 درجات أساسية لأن عدد الأخطاء المحتسبة (${errorCount}) بحد أقصى 5 أخطاء.`;
  } else if (errorCount <= 9) {
    baseScore = 8;
    errorBracketReason = `حصل على 8 درجات أساسية لوجود (${errorCount}) أخطاء محتسبة (بين 6 إلى 9 أخطاء).`;
  } else if (errorCount <= 19) {
    baseScore = 6;
    errorBracketReason = `حصل على 6 درجات أساسية لوجود (${errorCount}) أخطاء محتسبة (بين 10 إلى 19 خطأً).`;
  } else {
    baseScore = 4;
    errorBracketReason = `حصل على 4 درجات أساسية لوجود (${errorCount}) أخطاء محتسبة (20 خطأً أو أكثر).`;
  }

  const missingElements: string[] = [];
  let deduction = 0;

  if (letterCheck && letterCheck.isLetter) {
    if (!letterCheck.hasSenderReceiverBox) {
      missingElements.push('مربع وبيانات المرسل والمستلم');
    }
    if (!letterCheck.hasIntroduction) {
      missingElements.push('المقدمة (التحية الافتتاحية)');
    }
    if (!letterCheck.hasConclusion) {
      missingElements.push('الخاتمة (العبارة الختامية)');
    }

    if (missingElements.length > 0) {
      deduction = 1;
    }
  }

  const finalScore = Math.max(0, baseScore - deduction);

  let reason = errorBracketReason;
  if (deduction > 0) {
    reason += ` وخصمت درجة واحدة (-1) لعدم كتابة عناصر تيمبلت الرسالة: (${missingElements.join('، ')}). وبذلك تنزل الدرجة من ${baseScore} إلى ${finalScore}.`;
  } else if (letterCheck && letterCheck.isLetter) {
    reason += ` والتزم الطالب بكامل عناصر تيمبلت الرسالة (المقدمة، الخاتمة، مربع المرسل والمستلم) دون أي خصم.`;
  }

  return {
    baseScore,
    deduction,
    finalScore,
    reason,
    missingElements,
  };
}

export type AllowedContentScore = 4 | 6 | 8 | 10;

export function snapToContentGrade(score: number): AllowedContentScore {
  const allowed: AllowedContentScore[] = [4, 6, 8, 10];
  let closest = allowed[0];
  let minDiff = Math.abs(score - closest);
  for (const val of allowed) {
    const diff = Math.abs(score - val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = val;
    }
  }
  return closest;
}

export function calculateLengthEvaluation(wordCount: number, target: number = 150) {
  const diff = wordCount - target;
  if (Math.abs(diff) <= 20) {
    return {
      status: 'optimal' as const,
      feedback: `طول ممتاز (${wordCount} كلمة)، يلتزم تماماً بالحد المطلوب (~150 كلمة).`,
    };
  } else if (Math.abs(diff) <= 40) {
    return {
      status: 'acceptable' as const,
      feedback: `طول مقبول (${wordCount} كلمة)، قريب من الحد المطلوب (~150 كلمة).`,
    };
  } else if (diff < -40) {
    return {
      status: 'too_short' as const,
      feedback: `النص قصير نسبياً (${wordCount} كلمة)، المطلوب في حدود 150 كلمة (نقص ${Math.abs(diff)} كلمة).`,
    };
  } else {
    return {
      status: 'too_long' as const,
      feedback: `النص أطول من المطلوب (${wordCount} كلمة)، المطلوب في حدود 150 كلمة (زيادة ${diff} كلمة).`,
    };
  }
}

export async function checkBackendStatus(): Promise<{
  available: boolean;
  hasApiKey: boolean;
  platform?: string;
}> {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      return {
        available: true,
        hasApiKey: Boolean(data.hasApiKey),
        platform: data.platform || 'node-server',
      };
    }
    return { available: false, hasApiKey: false };
  } catch {
    return { available: false, hasApiKey: false };
  }
}

// Direct client-side Gemini fallback for pure static Cloudflare Pages or custom user keys
async function callGeminiDirectClient(
  apiKey: string,
  cleanBase64: string,
  mimeType: string,
  essayTopic?: string
): Promise<GradingResult> {
  const systemPrompt = `أنت نظام بصري فائق الدقة ومتخصص في تفريغ وتصحيح وتقييم المقالات والنصوص والرسائل العربية المكتوبة بخط اليد أو المطبوعة من الصور.

مهمتك الأساسية والحرجة:
تفريغ **كل كلمة** موجودة في الصورة حرفياً ودون حذف أي كلمة مهما كانت صغيرة أو في الهوامش أو الأطراف، مع المحافظة الدقيقة على التنسيق المكاني والترتيب الأصلي لأسطر وفقرات الورقة.

التعليمات الصارمة الإلزامية:
1. **المحافظة التامة على تنسيق وترتيب الورقة سطر بسطر (ممنوع منعاً باتاً دمج النص في قطعة واحدة):**
   - أعد كتابة النص بنفس ترتيب وأسطر الورقة الأصلية سطر بسطر تماماً كما هو مكتوب في الصورة.
   - افصل بين الأسطر بنزول سطر جديد (\\n) بدقة متناهية.
   - افصل بين الفقرات المستقلة بسطر فارغ (\\n\\n).
   - إذا وجد عنوان، أو بسملة، أو مربع وبيانات مرسل ومستلم، أو تحية افتتاحية، اجعل كلاً منها في سطر منفصل مستقل في موضعه تماماً كما بالورقة.
   - إذا وجدت أبيات شعرية أو شواهد، ضع كل بيت أو شطر في سطر مستقل.
   - إذا وجدت خاتمة، أو عبارة ختامية، أو توقيع، أو اسم الطالب/الصف، ضعها في أسطرها المستقلة في النهاية كما هي بالورقة.
   - يُمنع منعاً باتاً دمج الأسطر أو جعل النص كتلة واحدة متصلة.
2. **عدم الحذف نهائياً (تفريغ 100%):** اقرأ الصورة سطر بسطر وكلمة بكلمة من البداية حتى النهاية. ممنوع إسقاط أي حرف أو كلمة أو جملة.
3. **وضع خط تحت الأخطاء:** في النص المصحح النهائي، ضع خطاً حول كل كلمة بها خطأ إملائي أو نحوي أو صرفي تم تصحيحه باستخدام وسم HTML: <u>الكلمة_المصححة</u>، مع الحفاظ الكامل على فواصل الأسطر والفقرات.
   - مثال: إذا كتب الطالب "هاذا" وصححتها إلى "هذا"، يظهر في النص المصحح: <u>هذا</u>
   - مثال: إذا كتب "ان العلم نورن" وصححتها إلى "إن العلم نورٌ"، يظهر: <u>إن</u> العلم <u>نورٌ</u>
4. **المراجعة المزدوجة والمطابقة:** قارن النص المفرغ بالصورة الأصلية كلمة بكلمة لضمان اكتمال النص 100% ومطابقة أسطره.
5. **معايير التقييم والدرجات الدقيقة:**
   - **المحتوى (من 10):** تقييم الأفكار والترابط.
     * شرط صارم وإلزامي: يجب أن تكون درجة المحتوى حصراً إحدى هذه القيم الأربع فقط: (4 أو 6 أو 8 أو 10). ممنوع إعطاء أي كسور أو درجات أخرى.
     * 10 درجات: أفكار ممتازة وترابط رائع ومتسلسل وشامل.
     * 8 درجات: أفكار جيدة جداً وترابط سليم بين الفقرات.
     * 6 درجات: أفكار مقبولة ولكن ينقصها التوسع أو الربط القوي.
     * 4 درجات: أفكار ضعيفة أو مفككة أو خروج عن صلب الموضوع.
   - **اللغة (من 10):**
     * 10 درجات: بحد أقصى 5 أخطاء (≤ 5 أخطاء).
     * 8 درجات: من 5 إلى 9 أخطاء.
     * 6 درجات: من 10 إلى 19 خطأً.
     * 4 درجات: 20 خطأً أو أكثر.
   - **قالب وتيمبلت الرسالة (شرط إلزامي للرسائل):**
     * إذا كان النص رسالة، يجب التحقق من عناصر التيمبلت الثلاثة (المقدمة، الخاتمة، مربع المرسل والمستلم).
     * إذا لم يكتب الطالب أي عنصر منها، ينزل درجة واحدة (-1) من درجة اللغة (10 تنزل لـ 9، و8 تنزل لـ 7، و6 تنزل لـ 5، و4 تنزل لـ 3).
   - رصد الأخطاء بدقة كاملة: استخرج كل خطأ مع الكلمة الأصلية، الكلمة المصححة، النوع، والتعليل النحوي/الإملائي.
   - حساب عدد الكلمات الفعلي بدقة (شرط الطول في حدود 150 كلمة).

قم بإرجاع النتيجة بصيغة JSON حصراً.`;

  const userPrompt = `يرجى فحص هذه الصورة بعناية وتفريغ نص المقال/الرسالة العربي بنسبة 100% مع المحافظة الصارمة على تنسيق وترتيب أسطر وفقرات الورقة سطر بسطر دون دمجها في قطعة واحدة، مع وضع خط <u>الكلمة</u> تحت الكلمات المعدلة، وتطبيق معايير الدرجات وتيمبلت الرسالة.
${essayTopic ? `موضوع النص المحتمل: ${essayTopic}` : ''}

أرجع النتيجة بصيغة كائن JSON بالبنية التالية فقط (تأكد من وجود فواصل الأسطر \\n بين سطور وفقرات النص):
{
  "rawTranscribedText": "النص الحرفي من الصورة سطر بسطر بنفس ترتيب وتنسيق الورقة مفصولاً بـ \\n",
  "correctedHtmlText": "النص المصحح سطر بسطر بنفس فواصل وتنسيق الورقة مع <u>الكلمات المعدلة</u> و \\n",
  "correctedPlainText": "النص المصحح بنفس فواصل الأسطر والفقرات دون وسوم html",
  "actualWordCount": 150,
  "contentScore": 8.5,
  "contentFeedback": "تقييم الأفكار والترابط",
  "errors": [
    {
      "originalWord": "الكلمة بالصورة",
      "correctedWord": "الكلمة المصححة",
      "type": "spelling",
      "typeName": "إملائي",
      "explanation": "سبب التصحيح",
      "sentenceContext": "الجملة"
    }
  ],
  "letterTemplate": {
    "isLetter": false,
    "hasSenderReceiverBox": true,
    "hasIntroduction": true,
    "hasConclusion": true,
    "missingElements": [],
    "templateNotes": "ملاحظات حول قالب الرسالة"
  },
  "doubleCheckVerified": true,
  "transcriptionNotes": "ملاحظات جودة الخط وتنسيق الأسطر"
}`;

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: userPrompt },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  let data: any = null;
  let lastErrText = '';

  for (const modelName of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        data = await response.json();
        break;
      } else {
        lastErrText = await response.text();
        console.warn(`Direct client Gemini call with ${modelName} failed:`, lastErrText);
      }
    } catch (e: any) {
      lastErrText = e.message || String(e);
      console.warn(`Direct client Gemini call with ${modelName} error:`, lastErrText);
    }
  }

  if (!data) {
    throw new Error(`خطأ في استدعاء Gemini API: ${lastErrText}`);
  }
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  let parsed: any = {};
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const clean = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(clean);
  }

  const errorsList: CorrectionError[] = (parsed.errors || []).map((err: any, idx: number) => ({
    id: `err-${idx + 1}`,
    originalWord: err.originalWord || '',
    correctedWord: err.correctedWord || '',
    ruleCategory: err.ruleCategory || err.typeName || 'إملاء اللغة العربية الفصحى',
    type: err.type || 'spelling',
    typeName: err.typeName || 'إملائي',
    explanation: err.explanation || '',
    sentenceContext: err.sentenceContext || '',
  }));

  // Group errors and count all mistakes directly without discounting repeated rules:
  const { totalRawErrors, calculatedMistakes, ruleGroups } = groupAndDeduplicateErrors(errorsList);

  const letterInfo = parsed.letterTemplate || {};
  const isLetter = Boolean(
    letterInfo.isLetter ||
    (essayTopic && (essayTopic.includes('رسالة') || essayTopic.includes('خطاب')))
  );

  const letterCheck = {
    isLetter,
    hasSenderReceiverBox: Boolean(letterInfo.hasSenderReceiverBox ?? true),
    hasIntroduction: Boolean(letterInfo.hasIntroduction ?? true),
    hasConclusion: Boolean(letterInfo.hasConclusion ?? true),
  };

  const langEvaluation = calculateLanguageScoreWithRules(
    calculatedMistakes,
    totalRawErrors,
    ruleGroups,
    letterCheck
  );

  const rawTranscribed = parsed.rawTranscribedText || '';
  const plainText = parsed.correctedPlainText || '';
  const finalWordCount = countArabicWords(rawTranscribed || plainText);
  const lengthEval = calculateLengthEvaluation(finalWordCount, 150);

  const safeContentScore = snapToContentGrade(Number(parsed.contentScore) || 8);
  const totalScore = Number((safeContentScore + langEvaluation.finalScore).toFixed(1));

  let ratingLabel = 'جيد';
  if (totalScore >= 18) ratingLabel = 'ممتاز 🌟';
  else if (totalScore >= 15) ratingLabel = 'جيد جداً ⭐';
  else if (totalScore >= 12) ratingLabel = 'جيد 👍';
  else if (totalScore >= 10) ratingLabel = 'مقبول';
  else ratingLabel = 'يحتاج إلى تحسين ومتابعة ⚠️';

  const studentTextWithUnderlinedErrors = buildStudentTextWithUnderlines(rawTranscribed, errorsList);

  return {
    rawTranscribedText: rawTranscribed,
    studentTextWithUnderlinedErrors,
    correctedHtmlText: parsed.correctedHtmlText || '',
    correctedPlainText: plainText,
    actualWordCount: finalWordCount,
    targetWordCount: 150,
    lengthStatus: lengthEval.status,
    lengthFeedback: lengthEval.feedback,
    contentScore: safeContentScore,
    contentFeedback: parsed.contentFeedback || 'تم تقييم الأفكار والترابط بناءً على بنية النص.',
    totalRawErrors,
    calculatedMistakes,
    errorCount: calculatedMistakes,
    ruleGroups,
    baseLanguageScore: langEvaluation.baseScore,
    templateDeduction: langEvaluation.deduction,
    languageScore: langEvaluation.finalScore,
    languageScoreReason: langEvaluation.reason,
    letterTemplate: {
      isLetter: letterCheck.isLetter,
      hasSenderReceiverBox: letterCheck.hasSenderReceiverBox,
      hasIntroduction: letterCheck.hasIntroduction,
      hasConclusion: letterCheck.hasConclusion,
      missingElements: langEvaluation.missingElements,
      isTemplateComplete: langEvaluation.missingElements.length === 0,
      deductionApplied: langEvaluation.deduction > 0,
      deductionAmount: langEvaluation.deduction,
      templateNotes: letterInfo.templateNotes || (isLetter ? (langEvaluation.deduction > 0 ? 'يوجد نقص في عناصر قالب الرسالة المطلوب.' : 'قالب الرسالة مكتمل ومستوفٍ لكافة الشروط.') : 'النص مقال تعبير عام ولا يخضع لتيمبلت الرسالة.'),
    },
    totalScore,
    ratingLabel,
    errors: errorsList,
    doubleCheckVerified: Boolean(parsed.doubleCheckVerified ?? true),
    transcriptionNotes: parsed.transcriptionNotes || 'تمت مطابقة النص بالصورة بالكامل وحساب الأخطاء وفق قواعد الفصحى.',
    analyzedAt: new Date().toISOString(),
  };
}

export async function transcribeAndGradeImage(params: {
  imageBase64: string;
  mimeType: string;
  essayTopic?: string;
}): Promise<GradingResult> {
  const { imageBase64, mimeType, essayTopic } = params;
  const storedKey = getStoredApiKey();

  // Try Server / Cloudflare Pages Function endpoint first
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (storedKey) {
      headers['x-gemini-api-key'] = storedKey;
    }

    const response = await fetch('/api/transcribe-and-grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64,
        mimeType: mimeType || 'image/jpeg',
        essayTopic: essayTopic || undefined,
      }),
    });

    if (response.ok) {
      const data: GradingResult = await response.json();
      return data;
    }

    // If server returned error but we have a client key, fallback to direct client call
    if (storedKey) {
      console.warn('Backend endpoint failed, falling back to direct client-side Gemini call...');
      const cleanBase64 = imageBase64.includes(';base64,')
        ? imageBase64.split(';base64,')[1]
        : imageBase64;
      return await callGeminiDirectClient(storedKey, cleanBase64, mimeType, essayTopic);
    }

    const errorData = await response.json().catch(() => ({}));
    const message = errorData.details
      ? `${errorData.error || 'خطأ'}: ${errorData.details}`
      : (errorData.error || 'فشلت معالجة الصورة في الخادم/Cloudflare Function');
    throw new Error(message);
  } catch (err: any) {
    // If backend was unreachable (e.g. static host without /api) and client has stored key:
    if (storedKey) {
      console.warn('Backend unreachable, attempting client-side execution...');
      const cleanBase64 = imageBase64.includes(';base64,')
        ? imageBase64.split(';base64,')[1]
        : imageBase64;
      return await callGeminiDirectClient(storedKey, cleanBase64, mimeType, essayTopic);
    }

    throw err;
  }
}

// Exported alias for transcribeAndGradeImage
export const transcribeAndGradeEssay = transcribeAndGradeImage;
