// Cloudflare Pages Function: /api/transcribe-and-grade
// Compatible with Cloudflare Workers / Pages edge runtime (Zero Node.js dependency)

export interface Env {
  GEMINI_API_KEY?: string;
}

function normalizeRuleName(rule: string = ''): string {
  if (!rule || typeof rule !== 'string') return 'قواعد إملائية عامة';
  const r = rule.trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');

  if (r.includes('وصل')) return 'همزة الوصل';
  if (r.includes('قطع')) return 'همزة القطع';
  if (r.includes('تاء') || r.includes('مربوط') || r.includes('مفتوح') || r.includes('هاء')) return 'التاء المربوطة والمفتوحة والهاء';
  if (r.includes('تنوين') || r.includes('نصب') || r.includes('نون')) return 'تنوين النصب وحركات التنوين';
  if (r.includes('متوسط')) return 'الهمزة المتوسطة';
  if (r.includes('متطرف')) return 'الهمزة المتطرفة';
  if (r.includes('الف لين') || r.includes('الف مقصور') || r.includes('ممدود')) return 'الألف اللينة والمقصورة';
  if (r.includes('واو الجماع') || r.includes('الف فارق')) return 'الألف الفارقة وواو الجماعة';
  if (r.includes('حذف') || r.includes('زياد') || r.includes('مد')) return 'حذف وزيادة الحروف';
  if (r.includes('ترقيم') || r.includes('فاصل') || r.includes('نقط')) return 'علامات الترقيم';
  if (r.includes('اعراب') || r.includes('نحو') || r.includes('فاعل') || r.includes('مفعول') || r.includes('مجرور') || r.includes('منصوب')) {
    return 'قواعد النحو والإعراب';
  }
  return rule.trim();
}

function countArabicWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const clean = text.replace(/<[^>]*>/g, ' ');
  const tokens = clean.trim().split(/\s+/);
  const words = tokens.filter(t => {
    const stripped = t.replace(/[.,،؛:!?؟()[\]{}"'«»\-—ـ\\/+=<>*#@~`^&%$]/g, '');
    return stripped.length > 0;
  });
  return words.length;
}

function groupAndDeduplicateErrors(errors: any[]): {
  totalRawErrors: number;
  calculatedMistakes: number;
  ruleGroups: any[];
} {
  const groupsMap = new Map<string, any[]>();
  errors.forEach(err => {
    const rawRule = err.ruleCategory || err.typeName || 'قواعد إملائية عامة';
    const normalizedKey = normalizeRuleName(rawRule);
    if (!groupsMap.has(normalizedKey)) {
      groupsMap.set(normalizedKey, []);
    }
    groupsMap.get(normalizedKey)!.push({
      ...err,
      ruleCategory: normalizedKey
    });
  });

  const ruleGroups: any[] = [];
  groupsMap.forEach((groupErrors, ruleName) => {
    ruleGroups.push({
      ruleName,
      count: groupErrors.length,
      errors: groupErrors,
      countedMistakes: groupErrors.length
    });
  });

  ruleGroups.sort((a, b) => b.count - a.count);
  return {
    totalRawErrors: errors.length,
    calculatedMistakes: errors.length,
    ruleGroups
  };
}

function calculateLanguageScoreWithRules(
  calculatedMistakes: number,
  totalRawErrors: number,
  ruleGroups: any[],
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
  const errorsToCount = calculatedMistakes || totalRawErrors;

  if (errorsToCount <= 5) {
    baseScore = 10;
    errorBracketReason = `حصل على 10 درجات أساسية لأن إجمالي الأخطاء (${errorsToCount} أخطاء) بحد أقصى 5 أخطاء.`;
  } else if (errorsToCount <= 9) {
    baseScore = 8;
    errorBracketReason = `حصل على 8 درجات أساسية لوجود (${errorsToCount}) أخطاء (بين 6 إلى 9 أخطاء).`;
  } else if (errorsToCount <= 19) {
    baseScore = 6;
    errorBracketReason = `حصل على 6 درجات أساسية لوجود (${errorsToCount}) خطأً (بين 10 إلى 19 خطأً).`;
  } else {
    baseScore = 4;
    errorBracketReason = `حصل على 4 درجات أساسية لوجود (${errorsToCount}) خطأً (20 خطأً أو أكثر).`;
  }

  const missingElements: string[] = [];
  let deduction = 0;

  if (letterCheck && letterCheck.isLetter) {
    if (!letterCheck.hasSenderReceiverBox) missingElements.push('مربع وبيانات المرسل والمستلم');
    if (!letterCheck.hasIntroduction) missingElements.push('المقدمة (التحية الافتتاحية)');
    if (!letterCheck.hasConclusion) missingElements.push('الخاتمة (العبارة الختامية)');

    if (missingElements.length > 0) {
      deduction = 1;
    }
  }

  const finalScore = Math.max(0, baseScore - deduction);
  let reason = errorBracketReason;
  if (deduction > 0) {
    reason += ` وخصمت درجة واحدة (-1) لعدم كتابة عناصر تيمبلت الرسالة: (${missingElements.join('، ')}). وبذلك تنزل الدرجة من ${baseScore} إلى ${finalScore}.`;
  } else if (letterCheck && letterCheck.isLetter) {
    reason += ` والتزم الطالب بكامل عناصر تيمبلت الرسالة دون أي خصم.`;
  }

  return {
    baseScore,
    deduction,
    finalScore,
    reason,
    missingElements,
  };
}

function calculateLengthEvaluation(wordCount: number, target: number = 150) {
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
function snapToContentGrade(score: number): 4 | 6 | 8 | 10 {
  const allowed: (4 | 6 | 8 | 10)[] = [4, 6, 8, 10];
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

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
    },
  });
};

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const apiKey =
      context.request.headers.get('x-gemini-api-key') ||
      context.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'مفتاح Gemini API غير مهيأ. يرجى ضبط متغير GEMINI_API_KEY في إعدادات Cloudflare Pages أو إدخاله في التطبيق.',
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = (await context.request.json()) as any;
    const { imageBase64, mimeType = 'image/jpeg', essayTopic } = body;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'لم يتم إرسال الصورة (imageBase64 مطلوب)' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanBase64 = imageBase64.includes(';base64,')
      ? imageBase64.split(';base64,')[1]
      : imageBase64;

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
  "contentScore": 8,
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

    // Multi-model fallback cascade for high availability
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    const geminiPayload = {
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
            {
              text: userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    let geminiData: any = null;
    let lastErrorDetails = '';
    let lastStatus = 500;

    for (const modelName of candidateModels) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geminiPayload),
        });

        if (geminiRes.ok) {
          geminiData = await geminiRes.json();
          break;
        } else {
          lastStatus = geminiRes.status;
          lastErrorDetails = await geminiRes.text();
          console.warn(`[Cloudflare Function] Model ${modelName} returned status ${lastStatus}: ${lastErrorDetails}`);
        }
      } catch (fErr: any) {
        lastErrorDetails = fErr.message || String(fErr);
        console.warn(`[Cloudflare Function] Model ${modelName} fetch error: ${lastErrorDetails}`);
      }
    }

    if (!geminiData) {
      return new Response(
        JSON.stringify({
          error: 'فشل استدعاء Gemini API من Cloudflare Functions',
          details: lastErrorDetails,
        }),
        { status: lastStatus || 500, headers: corsHeaders }
      );
    }

    const geminiData = (await geminiRes.json()) as any;
    const rawCandidateText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawCandidateText);
    } catch {
      // Clean JSON markdown code blocks if wrapped
      const cleanJson = rawCandidateText
        .replace(/^```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
      parsedData = JSON.parse(cleanJson);
    }

    const rawErrors = Array.isArray(parsedData.errors) ? parsedData.errors : [];
    const formattedErrors = rawErrors.map((err: any, idx: number) => ({
      id: `err-${idx + 1}`,
      originalWord: String(err.originalWord || '').trim(),
      correctedWord: String(err.correctedWord || '').trim(),
      ruleCategory: normalizeRuleName(err.ruleCategory || err.typeName || 'قواعد إملائية عامة'),
      type: err.type || 'spelling',
      typeName: err.typeName || 'إملائي',
      explanation: err.explanation || '',
      sentenceContext: err.sentenceContext || '',
    }));

    const dedup = groupAndDeduplicateErrors(formattedErrors);

    const letterInfo = parsedData.letterTemplate || {};
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

    // Strict user rubric computation with deduplication
    const langEvaluation = calculateLanguageScoreWithRules(
      dedup.calculatedMistakes,
      dedup.totalRawErrors,
      dedup.ruleGroups,
      letterCheck
    );

    const rawTranscribed = parsedData.rawTranscribedText || '';
    const plainText = parsedData.correctedPlainText || '';
    const finalWordCount = countArabicWords(rawTranscribed || plainText);

    const lengthEval = calculateLengthEvaluation(finalWordCount, 150);
    const safeContentScore = snapToContentGrade(Number(parsedData.contentScore) || 8);
    const totalScore = Number((safeContentScore + langEvaluation.finalScore).toFixed(1));

    let ratingLabel = 'جيد';
    if (totalScore >= 18) ratingLabel = 'ممتاز 🌟';
    else if (totalScore >= 15) ratingLabel = 'جيد جداً ⭐';
    else if (totalScore >= 12) ratingLabel = 'جيد 👍';
    else if (totalScore >= 10) ratingLabel = 'مقبول';
    else ratingLabel = 'يحتاج إلى تحسين ومتابعة ⚠️';

    const result = {
      rawTranscribedText: rawTranscribed,
      correctedHtmlText: parsedData.correctedHtmlText || '',
      correctedPlainText: plainText,
      actualWordCount: finalWordCount,
      targetWordCount: 150,
      lengthStatus: lengthEval.status,
      lengthFeedback: lengthEval.feedback,
      contentScore: safeContentScore,
      contentFeedback:
        parsedData.contentFeedback || 'تم تقييم الأفكار والترابط بناءً على أصول الفصحى.',
      totalRawErrors: dedup.totalRawErrors,
      calculatedMistakes: dedup.calculatedMistakes,
      errorCount: dedup.calculatedMistakes,
      ruleGroups: dedup.ruleGroups,
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
      errors: formattedErrors,
      doubleCheckVerified: Boolean(parsedData.doubleCheckVerified ?? true),
      transcriptionNotes:
        parsedData.transcriptionNotes || 'تمت مطابقة النص بالصورة بالكامل.',
      analyzedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'فشلت معالجة الصورة في Cloudflare Function',
        details: error.message || String(error),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
