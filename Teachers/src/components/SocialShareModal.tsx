import React, { useState } from 'react';
import { GeneratedVoiceover } from '../types';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Twitter,
  Send,
  Linkedin,
  Facebook,
  Sparkles,
  Volume2,
  ExternalLink,
} from 'lucide-react';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceover: GeneratedVoiceover | null;
  activeLanguage: 'ar' | 'en';
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  voiceover,
  activeLanguage,
}) => {
  const isAr = activeLanguage === 'ar';
  const [copied, setCopied] = useState(false);

  if (!isOpen || !voiceover) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareText = isAr
    ? `🎙️ استمع إلى هذا التعليق الصوتي المميز بـ${voiceover.accent.nameAr} بصوت ${voiceover.persona.nameAr}:\n\n"${voiceover.text}"\n\nتَمّ التوليد بجودة 48kHz عبر استوديو التعليق الصوتي بالذكاء الاصطناعي:`
    : `🎙️ Listen to this realistic voiceover in ${voiceover.accent.nameEn} by ${voiceover.persona.nameEn}:\n\n"${voiceover.text}"\n\nGenerated with Arabic AI Voiceover Studio:`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText}\n${currentUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isAr ? 'تعليق صوتي بالذكاء الاصطناعي' : 'Arabic AI Voiceover',
          text: shareText,
          url: currentUrl,
        });
      } catch (err) {
        console.warn('Native share dismissed', err);
      }
    } else {
      handleCopy();
    }
  };

  // Social Links
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}&hashtags=ArabicAI,Voiceover,تعليق_صوتي`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;

  return (
    <div
      id="social-share-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        id="social-share-modal-panel"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden"
      >
        {/* Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isAr ? 'مشاركة التعليق الصوتي' : 'Share Voiceover'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'شارك الصوت عبر منصات التواصل الاجتماعي' : 'Share across social networks'}
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

        {/* Social Card Preview */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{voiceover.accent.flag}</span>
              <div>
                <span className="text-xs font-bold text-white block">
                  {isAr ? voiceover.accent.nameAr : voiceover.accent.nameEn}
                </span>
                <span className="text-[10px] text-amber-400">
                  {isAr ? voiceover.persona.nameAr : voiceover.persona.nameEn} • {voiceover.exportSettings.sampleRate / 1000}kHz
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {voiceover.emotion}
            </span>
          </div>

          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed italic" dir="rtl">
            "{voiceover.text}"
          </p>

          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'صوت عالي الواقعية بالذكاء الاصطناعي' : 'Hyper-realistic AI Voice'}</span>
          </div>
        </div>

        {/* Social Media Grid Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* WhatsApp */}
          <a
            id="share-whatsapp-btn"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all group"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>واتساب (WhatsApp)</span>
          </a>

          {/* Twitter / X */}
          <a
            id="share-twitter-btn"
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all group"
          >
            <Twitter className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>منصة (X)</span>
          </a>

          {/* Telegram */}
          <a
            id="share-telegram-btn"
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all group"
          >
            <Send className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>تيليجرام</span>
          </a>

          {/* LinkedIn */}
          <a
            id="share-linkedin-btn"
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all group"
          >
            <Linkedin className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>لينكد إن (LinkedIn)</span>
          </a>

          {/* Facebook */}
          <a
            id="share-facebook-btn"
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all group"
          >
            <Facebook className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>فيسبوك</span>
          </a>

          {/* Native Web Share */}
          <button
            id="share-native-btn"
            onClick={handleNativeShare}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'مشاركة عامة' : 'More Apps'}</span>
          </button>
        </div>

        {/* Copy Link & Snippet Button */}
        <div className="pt-2 border-t border-slate-800">
          <button
            id="btn-copy-share-snippet"
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">{isAr ? 'تم نسخ الرابط والنص!' : 'Copied to Clipboard!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>{isAr ? 'نسخ رابط وبطاقة الصوت للمشاركة' : 'Copy Audio Share Link'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
