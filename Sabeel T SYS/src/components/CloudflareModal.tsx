import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Terminal,
  Server,
  Layers,
  Cpu,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  checkBackendStatus,
} from '../services/geminiService';

interface CloudflareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudflareModal: React.FC<CloudflareModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'settings'>('deploy');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<{
    loading: boolean;
    available: boolean;
    hasApiKey: boolean;
    platform?: string;
  }>({
    loading: true,
    available: false,
    hasApiKey: false,
  });

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getStoredApiKey());
      verifyBackend();
    }
  }, [isOpen]);

  const verifyBackend = async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true }));
    const status = await checkBackendStatus();
    setBackendStatus({
      loading: false,
      available: status.available,
      hasApiKey: status.hasApiKey,
      platform: status.platform,
    });
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    verifyBackend();
  };

  const handleClearApiKey = () => {
    setStoredApiKey('');
    setApiKeyInput('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    verifyBackend();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-['Cairo']">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-neutral-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-400 border border-amber-500/30">
              <Cloud className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                جاهزية النشر على Cloudflare وإعدادات الربط
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Pages Ready ✓
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                النظام مهيأ بالكامل للنشر السريع والمستقر على Cloudflare Pages & Functions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 text-sm cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab('deploy')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            خطوات النشر على Cloudflare Pages
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Key className="w-4 h-4" />
            إعداد مفتاح Gemini API
          </button>
        </div>

        {/* Tab 1: Cloudflare Deployment Guide */}
        {activeTab === 'deploy' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <h4 className="font-bold text-amber-400 text-xs mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ملفات إعداد Cloudflare المضمنة بالمشروع:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-black border border-neutral-800 rounded-lg flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-[11px]">public/_redirects</span>
                  <span className="text-neutral-400 text-[11px]">(توجيه SPA التلقائي)</span>
                </div>
                <div className="p-2 bg-black border border-neutral-800 rounded-lg flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-[11px]">public/_headers</span>
                  <span className="text-neutral-400 text-[11px]">(ترويسات الأمان والكاش)</span>
                </div>
                <div className="p-2 bg-black border border-neutral-800 rounded-lg flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-[11px]">functions/api/*</span>
                  <span className="text-neutral-400 text-[11px]">(Cloudflare Pages Functions)</span>
                </div>
                <div className="p-2 bg-black border border-neutral-800 rounded-lg flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-[11px]">wrangler.toml</span>
                  <span className="text-neutral-400 text-[11px]">(تهيئة إعدادات Wrangler)</span>
                </div>
              </div>
            </div>

            {/* Method A: Git Integration */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-bold">
                    1
                  </span>
                  طريقة لوحة تحكم Cloudflare Pages (Git Integration)
                </h4>
              </div>
              <p className="text-xs text-neutral-400">
                اربط مستودع GitHub / GitLab بـ Cloudflare Pages ثم ضع الإعدادات التالية بدقة:
              </p>
              <div className="space-y-2 text-xs font-mono bg-black p-3 rounded-lg border border-neutral-800">
                <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Framework preset:</span>
                  <span className="text-emerald-400 font-bold">Vite</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Build command:</span>
                  <span className="text-amber-300 font-bold">npm run build</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Build output directory:</span>
                  <span className="text-amber-300 font-bold">dist</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-400">Environment variable:</span>
                  <span className="text-blue-300 font-bold">GEMINI_API_KEY</span>
                </div>
              </div>
            </div>

            {/* Method B: Direct CLI via Wrangler */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                الرفع المباشر عبر سطر الأوامر (Wrangler CLI)
              </h4>
              <div className="relative group bg-black p-3 rounded-lg border border-neutral-800 font-mono text-xs text-neutral-200">
                <code>npm run build && npx wrangler pages deploy dist</code>
                <button
                  onClick={() =>
                    copyToClipboard('npm run build && npx wrangler pages deploy dist', 'wrangler')
                  }
                  className="absolute left-2.5 top-2.5 p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  title="نسخ الأمر"
                >
                  {copiedText === 'wrangler' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: API Key Configuration */}
        {activeTab === 'settings' && (
          <div className="space-y-4 text-sm">
            {/* Status Card */}
            <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">حالة الخادم / Cloudflare Functions:</div>
                  <div className="text-[11px] text-neutral-400">
                    {backendStatus.loading ? (
                      'جارٍ التحقق...'
                    ) : backendStatus.available ? (
                      <span className="text-emerald-400 font-semibold">
                        متصل ({backendStatus.platform || 'Active'}) {backendStatus.hasApiKey ? '• المفتاح مهيأ في الخادم' : '• بانتظار المفتاح'}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold">
                        وضع العميل المباشر (Direct Client-Side Mode)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={verifyBackend}
                disabled={backendStatus.loading}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer flex items-center gap-1"
                title="إعادة الفحص"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${backendStatus.loading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-200">
                مفتاح Google Gemini API الخاص بك:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none font-mono"
                />
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                يتم حفظ المفتاح بأمان داخل متصفحك (LocalStorage) للاستخدام المباشر، أو يمكنك ضبطه كمتغير بيئة{' '}
                <code className="text-amber-400 bg-neutral-900 px-1 py-0.5 rounded">GEMINI_API_KEY</code>{' '}
                في إعدادات Cloudflare Pages.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                تم حفظ وتحديث مفتاح API بنجاح!
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-lg text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
              >
                حفظ المفتاح
              </button>
              {apiKeyInput && (
                <button
                  onClick={handleClearApiKey}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs transition cursor-pointer"
                >
                  مسح المفتاح
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
          <span className="text-[11px] text-neutral-500">
            أكاديمية سبيل • نظام التفريغ البصري والتقييم الآلي
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
