import { VoicePersona, ToneOption } from '../types';

export const EGYPTIAN_VOICES: VoicePersona[] = [
  {
    id: 'voice-1-sheikh',
    name: 'الشيخ الهادئ',
    gender: 'male',
    category: 'محتوى ديني وتربوي',
    description: 'صوت رجولي عميق، رزين ودافئ للمحتوى الديني والتربوي والقراءات الهادئة.',
    avatar: '🕌',
    sampleText: 'بسم الله نبدأ رحلتنا التعليمية في تعلّم وتدبّر آيات الذكر الحكيم بقلبٍ حاضر.',
    accent: 'اللهجة المصرية الوقورة والفصحى المعرّبة',
    voiceStyle: {
      basePitch: 0.85,
      baseRate: 0.9,
      voiceType: 'deep-warm'
    }
  },
  {
    id: 'voice-2-teacher',
    name: 'المعلّم المصري',
    gender: 'male',
    category: 'شروحات وتعليم',
    description: 'صوت واضح، متزن، يبعث على التركيز والفهم السلس للشروحات الأكاديمية والمدرسية.',
    avatar: '👨‍🏫',
    sampleText: 'أهلاً بكم يا شباب، درس النهاردة بسيط ومهم جداً، هنفهم سوا الخطوات خطوة بخطوة.',
    accent: 'المصرية التعليمية البيضاء',
    voiceStyle: {
      basePitch: 1.0,
      baseRate: 1.0,
      voiceType: 'balanced-clear'
    }
  },
  {
    id: 'voice-3-broadcaster',
    name: 'المذيع الإعلاني',
    gender: 'male',
    category: 'إعلانات وحملات ترويجية',
    description: 'صوت قوي، حماسي ومؤثر يجذب الانتباه من أول ثانية للإعلانات والعروض الكبرى.',
    avatar: '🎙️',
    sampleText: 'فرصتك الذهبية دلوقتي! اشترك واستمتع بأقوى العروض الحصرية قبل نفاذ الوقت.',
    accent: 'المصرية الإعلانية الحماسية',
    voiceStyle: {
      basePitch: 1.05,
      baseRate: 1.15,
      voiceType: 'energetic-punchy'
    }
  },
  {
    id: 'voice-4-youth',
    name: 'الشاب العصري',
    gender: 'male',
    category: 'سوشيال ميديا وريلز',
    description: 'صوت شبابي عصري، حيوي وقريب من القلب لمنصات التواصل والريلز وتيك توك.',
    avatar: '🧢',
    sampleText: 'عايز تنجز مهامك بسرعة ومن غير تعقيد؟ اسمع معايا الحيلة الذكية دي النهاردة!',
    accent: 'المصرية الدارجة الذكية والحديثة',
    voiceStyle: {
      basePitch: 1.1,
      baseRate: 1.1,
      voiceType: 'youth-dynamic'
    }
  },
  {
    id: 'voice-5-mother',
    name: 'الأم المصرية',
    gender: 'female',
    category: 'محتوى أطفال وتربية',
    description: 'صوت نسائي دافئ، حنون ومحبب لنفوس الصغار لقصص الأطفال والإرشادات الأسرية.',
    avatar: '🌸',
    sampleText: 'يا حبيبي الحلوين، النهاردة عندنا حدوتة جميلة ومليانة مغامرات لطيفة، يلا نسمع سوا!',
    accent: 'المصرية الأسرية الحنونة',
    voiceStyle: {
      basePitch: 1.18,
      baseRate: 0.95,
      voiceType: 'gentle-caring'
    }
  },
  {
    id: 'voice-6-corporate',
    name: 'المعلقة الرسمية',
    gender: 'female',
    category: 'كورسات ووثائقيات وشركات',
    description: 'صوت نسائي رسمي، واثق وأنيق لتقديم الكورسات التدريبية، والبروفايلات المؤسسية.',
    avatar: '💼',
    sampleText: 'نرحب بكم في هذا البرنامج التدريبي المصمم لتطوير مهاراتكم القيادية بكفاءة وتميز.',
    accent: 'المصرية الاحترافية الفصحى المعاصرة',
    voiceStyle: {
      basePitch: 1.02,
      baseRate: 1.0,
      voiceType: 'formal-executive'
    }
  }
];

export const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'deep',
    label: 'عميق',
    icon: '🎙️',
    description: 'طبقة صوتية فخمة ورزينة',
    pitchModifier: -0.2,
    rateModifier: -0.05,
    emotionModifier: 0.7
  },
  {
    id: 'crisp',
    label: 'حاد',
    icon: '⚡',
    description: 'مخارج ألفاظ سريعة وحاسمة',
    pitchModifier: 0.15,
    rateModifier: 0.12,
    emotionModifier: 0.8
  },
  {
    id: 'warm',
    label: 'دافئ',
    icon: '☕',
    description: 'نبرة مريحة وهادئة للقلب',
    pitchModifier: -0.05,
    rateModifier: -0.1,
    emotionModifier: 0.9
  },
  {
    id: 'thin',
    label: 'رفيع',
    icon: '🍃',
    description: 'طبقة خفيفة وناعمة',
    pitchModifier: 0.25,
    rateModifier: 0.05,
    emotionModifier: 0.6
  },
  {
    id: 'formal',
    label: 'رسمي',
    icon: '📜',
    description: 'أسلوب وقور ومؤسسي',
    pitchModifier: 0.0,
    rateModifier: 0.0,
    emotionModifier: 0.5
  },
  {
    id: 'enthusiastic',
    label: 'حماسي',
    icon: '🔥',
    description: 'طاقة عالية ومحفزة للشراء والتفاعل',
    pitchModifier: 0.1,
    rateModifier: 0.18,
    emotionModifier: 1.0
  }
];
