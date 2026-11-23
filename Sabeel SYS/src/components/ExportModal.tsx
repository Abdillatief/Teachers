import React, { useState } from 'react';
import { ExportSettings, GeneratedVoiceover, AudioFormat, SampleRateOption, BitDepthOption } from '../types';
import { X, Download, FileAudio, Check, Sliders, Disc, FileText, Sparkles } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceover: GeneratedVoiceover | null;
  onDownload: (settings: ExportSettings, customFilename: string) => Promise<void>;
  activeLanguage: 'ar' | 'en';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  voiceover,
  onDownload,
  activeLanguage,
}) => {
  const isAr = activeLanguage === 'ar';

  const [format, setFormat] = useState<AudioFormat>('wav');
  const [sampleRate, setSampleRate] = useState<SampleRateOption>(48000);
  const [bitDepth, setBitDepth] = useState<BitDepthOption>(24);
  const [normalizeAudio, setNormalizeAudio] = useState(true);
  const [stereoSimulation, setStereoSimulation] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const defaultFilename = voiceover
    ? `voiceover_${voiceover.accent.id}_${voiceover.persona.nameEn.toLowerCase().replace(/\s+/g, '_')}_${sampleRate / 1000}khz`
    : 'arabic_voiceover_studio';

  const [filename, setFilename] = useState(defaultFilename);

  if (!isOpen || !voiceover) return null;

  const handleDownloadClick = async () => {
    setIsExporting(true);
    try {
      await onDownload(
        {
          format,
          sampleRate,
          bitDepth,
          normalizeAudio,
          stereoSimulation,
        },
        filename
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleDownloadSrt = () => {
    const srtContent = `1
00:00:00,000 --> 00:00:0${Math.min(9, Math.round(voiceover.durationSeconds))},000
${voiceover.enhancedText || voiceover.text}
`;
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        id="export-modal-panel"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Subtle Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'تصدير وتحميل الملف الصوتي' : 'Export High-Quality Audio'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'خيارات الجودة الاحترافية للبث والاستوديو' : 'Studio Broadcast Master Options'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            {isAr ? 'صيغة الملف (Audio Format):' : 'File Container Format:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'wav', label: 'WAV', desc: isAr ? 'استوديو خام' : 'Master Lossless' },
              { id: 'mp3', label: 'MP3', desc: isAr ? '٣٢٠ ك.بت' : '320 kbps' },
              { id: 'flac', label: 'FLAC', desc: isAr ? 'بدون فقد' : 'Audiophile' },
              { id: 'ogg', label: 'OGG', desc: isAr ? 'ويب فائق' : 'Vorbis Web' },
            ].map((f) => {
              const isSelected = format === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as AudioFormat)}
                  className={`p-3 rounded-xl border text-start transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-sm text-white">{f.label}</div>
                  <div className="text-[10px] text-slate-400">{f.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Sample Rate & Bit Depth */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Sample Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {isAr ? 'معدل العينات (Sample Rate):' : 'Sample Rate:'}
            </label>
            <select
              value={sampleRate}
              onChange={(e) => setSampleRate(Number(e.target.value) as SampleRateOption)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
            >
              <option value={48000}>48,000 Hz (سينما وبث احترافي)</option>
              <option value={44100}>44,100 Hz (معيار CD Audio)</option>
              <option value={24000}>24,000 Hz (تردد الذكاء الاصطناعي)</option>
            </select>
          </div>

          {/* Bit Depth */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {isAr ? 'عمق البت (Bit Depth):' : 'Bit Depth:'}
            </label>
            <select
              value={bitDepth}
              onChange={(e) => setBitDepth(Number(e.target.value) as BitDepthOption)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-amber-500"
            >
              <option value={24}>24-bit Studio Master (الموصى به)</option>
              <option value={16}>16-bit Standard</option>
              <option value={32}>32-bit Float Dynamic</option>
            </select>
          </div>
        </div>

        {/* 3. Audio Enhancement Toggles */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-slate-300">
              {isAr ? 'تطبيق المعايرة والاستوديو ليمتر (Peak Normalization -0.3dB)' : 'Peak Normalization (-0.3dB)'}
            </span>
            <input
              type="checkbox"
              checked={normalizeAudio}
              onChange={(e) => setNormalizeAudio(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-slate-300">
              {isAr ? 'محاكاة الاستيريو المجسم (Stereo Spatial Enhancement)' : 'Stereo Spatial Width'}
            </span>
            <input
              type="checkbox"
              checked={stereoSimulation}
              onChange={(e) => setStereoSimulation(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
            />
          </label>
        </div>

        {/* 4. Custom Filename */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            {isAr ? 'اسم الملف الصوتي المصدّر:' : 'Target Filename:'}
          </label>
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <FileAudio className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-transparent text-xs text-white outline-none font-mono"
            />
            <span className="text-xs text-slate-500 font-mono">.{format}</span>
          </div>
        </div>

        {/* Export & Subtitles Buttons */}
        <div className="space-y-2 pt-2">
          <button
            id="btn-confirm-download-audio"
            onClick={handleDownloadClick}
            disabled={isExporting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>{isAr ? 'جاري التصدير والمعالجة...' : 'Processing Audio...'}</span>
              </span>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isAr
                    ? `تحميل ملف الصوت (${format.toUpperCase()} • ${sampleRate / 1000}kHz)`
                    : `Download Audio (${format.toUpperCase()})`}
                </span>
              </>
            )}
          </button>

          <button
            id="btn-download-srt-subtitles"
            onClick={handleDownloadSrt}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'تحميل ملف الترجمة والنص (SRT Subtitles)' : 'Download SRT Subtitles'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
