import React from 'react';
import { VoiceAccent, VoicePersona, AccentCategory } from '../types';
import { ACCENTS, PERSONAS } from '../data/accents';
import { Check, Sparkles, User, Volume2, Info, MapPin } from 'lucide-react';

interface AccentSelectorProps {
  selectedAccent: VoiceAccent;
  onSelectAccent: (accent: VoiceAccent) => void;
  selectedPersona: VoicePersona;
  onSelectPersona: (persona: VoicePersona) => void;
  activeLanguage: 'ar' | 'en';
}

export const AccentSelector: React.FC<AccentSelectorProps> = ({
  selectedAccent,
  onSelectAccent,
  selectedPersona,
  onSelectPersona,
  activeLanguage,
}) => {
  const isAr = activeLanguage === 'ar';
  const [activeCategory, setActiveCategory] = React.useState<AccentCategory>('egyptian');

  const filteredAccents = ACCENTS.filter((a) => a.category === activeCategory);
  const currentPersonas = PERSONAS.filter(
    (p) => p.accentId === selectedAccent.id || p.isUniversal
  );

  // When switching category, pick first accent if current doesn't match
  const handleCategoryChange = (category: AccentCategory) => {
    setActiveCategory(category);
    if (selectedAccent.category !== category) {
      const first = ACCENTS.find((a) => a.category === category);
      if (first) {
        onSelectAccent(first);
        const persona = PERSONAS.find((p) => p.accentId === first.id) || PERSONAS[0];
        onSelectPersona(persona);
      }
    }
  };

  const handleAccentClick = (accent: VoiceAccent) => {
    onSelectAccent(accent);
    const firstPersona = PERSONAS.find((p) => p.accentId === accent.id) || PERSONAS[0];
    onSelectPersona(firstPersona);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-sm">
      {/* Category Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
            <span>{isAr ? 'اختر اللهجة ونبرة الصوت' : 'Select Accent & Voice Persona'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? '٥ لهجات مصرية فرعية دقيقة و٥ لهجات عربية إقليمية بمخارج حروف واقعية'
              : '5 Authentic Egyptian Sub-dialects & 5 Regional Arabic Dialects'}
          </p>
        </div>

        {/* Category Pill Toggle */}
        <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            id="tab-egyptian-accents"
            onClick={() => handleCategoryChange('egyptian')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeCategory === 'egyptian'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🇪🇬</span>
            <span>{isAr ? '٥ لهجات مصرية' : '5 Egyptian Accents'}</span>
          </button>
          <button
            id="tab-arabic-accents"
            onClick={() => handleCategoryChange('arabic')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeCategory === 'arabic'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌍</span>
            <span>{isAr ? '٥ لهجات عربية' : '5 Arabic Accents'}</span>
          </button>
        </div>
      </div>

      {/* Accents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mt-5">
        {filteredAccents.map((accent) => {
          const isSelected = selectedAccent.id === accent.id;
          return (
            <button
              key={accent.id}
              id={`accent-card-${accent.id}`}
              onClick={() => handleAccentClick(accent)}
              className={`text-start p-4 rounded-2xl border transition-all relative flex flex-col justify-between group overflow-hidden ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'bg-slate-950/50 hover:bg-slate-800/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Active Glow Accent Line */}
              {isSelected && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300" />
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xl">{accent.flag}</span>
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/70 text-slate-400">
                      {accent.avatarInitials}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors">
                  {isAr ? accent.nameAr : accent.nameEn}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                  <span className="truncate">{isAr ? accent.regionAr : accent.regionEn}</span>
                </p>

                <p className="text-xs text-slate-300/80 mt-2.5 line-clamp-2 leading-relaxed">
                  {isAr ? accent.descriptionAr : accent.descriptionEn}
                </p>
              </div>

              {/* Cultural Keywords Pills */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap gap-1">
                {accent.culturalKeywords.slice(0, 2).map((word, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-amber-300/90 font-medium"
                  >
                    "{word}"
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Accent Detail & Persona Selection */}
      <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Dialect Phonetic Notes */}
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                {isAr ? 'البصمة الصوتية والمخارج' : 'Phonetic Profile'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-300 font-medium">
                {isAr ? selectedAccent.nameAr : selectedAccent.nameEn}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedAccent.phoneticCharacteristics}
            </p>
          </div>

          {/* Voice Personas for Accent */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-xs text-slate-400 font-medium shrink-0">
              {isAr ? 'المعلق الصوتي:' : 'Voice Actor:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {currentPersonas.map((persona) => {
                const isSelectedP = selectedPersona.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    id={`persona-chip-${persona.id}`}
                    onClick={() => onSelectPersona(persona)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      isSelectedP
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm font-semibold ring-1 ring-amber-500/40'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-750 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelectedP ? 'bg-amber-400' : 'bg-slate-500'
                      }`}
                    />
                    <span>{isAr ? persona.nameAr : persona.nameEn}</span>
                    {persona.badgeAr && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                        {isAr ? persona.badgeAr : persona.badgeEn}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      ({isAr ? persona.titleAr : persona.titleEn})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Persona Highlight Info */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${selectedPersona.avatarColor || 'bg-amber-400'}`} />
            <span className="font-bold text-white">
              {isAr ? selectedPersona.nameAr : selectedPersona.nameEn}
            </span>
            {selectedPersona.exactAge && (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold text-[10px] border border-amber-500/20">
                {isAr ? `العمر: ${selectedPersona.exactAge} سنة` : `Age: ${selectedPersona.exactAge}yo`}
              </span>
            )}
            {selectedPersona.toneLabelAr && (
              <span className="text-amber-400/90 text-[11px] font-medium">
                • {isAr ? selectedPersona.toneLabelAr : selectedPersona.toneLabelEn}
              </span>
            )}
          </div>
          <p className="text-slate-300 text-[11px] max-w-xl">
            {isAr ? selectedPersona.specialtyAr : selectedPersona.specialtyEn}
          </p>
        </div>
      </div>
    </div>
  );
};
