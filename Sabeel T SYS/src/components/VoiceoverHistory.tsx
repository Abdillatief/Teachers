import React from 'react';
import { GeneratedVoiceover } from '../types';
import { Play, Download, Share2, Trash2, Clock, Music } from 'lucide-react';

interface VoiceoverHistoryProps {
  history: GeneratedVoiceover[];
  currentId?: string;
  onSelect: (item: GeneratedVoiceover) => void;
  onDelete: (id: string) => void;
  onOpenExport: (item: GeneratedVoiceover) => void;
  onOpenShare: (item: GeneratedVoiceover) => void;
  activeLanguage: 'ar' | 'en';
}

export const VoiceoverHistory: React.FC<VoiceoverHistoryProps> = ({
  history,
  currentId,
  onSelect,
  onDelete,
  onOpenExport,
  onOpenShare,
  activeLanguage,
}) => {
  const isAr = activeLanguage === 'ar';

  if (history.length === 0) return null;

  return (
    <div
      id="voiceover-history-section"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            {isAr ? 'سجل التسجيلات السابقة والمقارنة' : 'Recent Studio Takes'}
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {history.length} {isAr ? 'تسجيلات' : 'takes'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {history.map((item) => {
          const isSelected = item.id === currentId;
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-500/80 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/50 hover:bg-slate-800/40 border-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{item.accent.flag}</span>
                    <span className="text-xs font-bold text-white truncate">
                      {isAr ? item.accent.nameAr : item.accent.nameEn}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                    {item.exportSettings.sampleRate / 1000}kHz
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 italic" dir="rtl">
                  "{item.text}"
                </p>

                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2">
                  <span>{isAr ? item.persona.nameAr : item.persona.nameEn}</span>
                  <span>•</span>
                  <span>{item.emotion}</span>
                  <span>•</span>
                  <span>{item.durationSeconds.toFixed(1)}s</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                <button
                  onClick={() => onSelect(item)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-xs font-bold transition-all"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isAr ? 'استماع' : 'Play'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenExport(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                    title={isAr ? 'تحميل' : 'Download'}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenShare(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                    title={isAr ? 'مشاركة' : 'Share'}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
