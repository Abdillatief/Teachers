import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Clipboard, FileText, Sparkles, AlertCircle, X, RefreshCw, Check } from 'lucide-react';
import { SAMPLE_ESSAYS, SampleEssayData } from '../data/sampleEssays';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string, sampleData?: SampleEssayData) => void;
  isLoading: boolean;
  onClear: () => void;
  currentImage: string | null;
  essayTopic: string;
  setEssayTopic: (t: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  isLoading,
  onClear,
  currentImage,
  essayTopic,
  setEssayTopic,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'camera'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isLoading]);

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedSampleId(null);
        onImageSelected(result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('تعذر فتح الكاميرا، يرجى التأكد من منح الإذن للمتصفح.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      stopCamera();
      setSelectedSampleId(null);
      onImageSelected(dataUrl, 'image/jpeg');
      setActiveTab('upload');
    }
  };

  const selectSample = (sample: SampleEssayData) => {
    setSelectedSampleId(sample.id);
    setEssayTopic(sample.topic);
    onImageSelected(sample.svgImage, 'image/svg+xml', sample);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Bar: Tabs & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('upload');
              stopCamera();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-black shadow-md font-extrabold'
                : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. ارفع صورة أو الصق (Ctrl+V)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-amber-500 text-black shadow-md font-extrabold'
                : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>أو التقط بالكاميرا مباشرة</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('samples');
              stopCamera();
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>نماذج تجريبية (اختبار تكرار همزة الوصل)</span>
          </button>
        </div>

        {/* Current Image Indicator */}
        {currentImage && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>حذف الصورة الحالية</span>
          </button>
        )}
      </div>

      {/* Optional Topic text */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-neutral-400 whitespace-nowrap font-medium">موضوع المقال/الرسالة (اختياري):</label>
        <input
          type="text"
          value={essayTopic}
          onChange={(e) => setEssayTopic(e.target.value)}
          placeholder="مثال: رسالة شكر لمدير المدرسة، أهمية القراءة، حماية البيئة..."
          className="flex-1 bg-black border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
        />
      </div>

      {/* Main Mode View */}
      {activeTab === 'upload' && !currentImage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
              : 'border-neutral-800 hover:border-neutral-700 bg-black/60 hover:bg-neutral-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-neutral-700/60 text-amber-400 shadow-inner">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-['Cairo']">
                اسحب وأفلت صورة المقال أو الرسالة هنا، أو انقر للاختيار من جهازك
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                يدعم الصور المكتوبة بخط اليد أو المطبوعة (JPG, PNG, WEBP) • أو الصق مباشرة بـ <kbd className="px-1.5 py-0.5 bg-neutral-800 text-amber-300 rounded font-mono text-[11px]">Ctrl+V</kbd>
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-400 pt-1">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                تفريغ حرفي 100%
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                معايير المحتوى واللغة
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                فحص تيمبلت الرسالة
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Samples Tab */}
      {activeTab === 'samples' && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-400">
            اختر أحد النماذج المكتوبة للتجربة الفورية والتحقق من حساب الدرجات وتيمبلت الرسائل وفق معايير النظام بدقة:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SAMPLE_ESSAYS.map((sample) => (
              <div
                key={sample.id}
                onClick={() => selectSample(sample)}
                className={`p-3.5 rounded-xl border text-right cursor-pointer transition-all ${
                  selectedSampleId === sample.id
                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                    : 'border-neutral-800 bg-black hover:border-neutral-700 hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {sample.category}
                  </span>
                  {selectedSampleId === sample.id && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{sample.title}</h4>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                  {sample.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-900 font-mono">
                  <span>المحتوى: {sample.sampleResult.contentScore}/10</span>
                  <span className="text-emerald-400">اللغة: {sample.sampleResult.languageScore}/10</span>
                  <span>{sample.sampleResult.actualWordCount} كلمة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Tab */}
      {activeTab === 'camera' && (
        <div className="space-y-3">
          {cameraError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black border border-neutral-800 max-h-[380px] flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                <button
                  onClick={capturePhoto}
                  className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-xl flex items-center gap-2 cursor-pointer transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط صورة المقال الآن</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs border border-neutral-700 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Preview & Scanning Status when image is loaded */}
      {currentImage && (
        <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black p-3 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-36 h-28 shrink-0 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900">
            <img src={currentImage} alt="المقال المعروض" className="w-full h-full object-cover" />
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-amber-300 font-mono mt-1">جارٍ الفحص</span>
              </div>
            )}
          </div>

          <div className="flex-1 text-right space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">تم تجهيز صورة المقال للتفريغ</h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                جاهزة للتحليل
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              سيتم تفريغ كل كلمة بنسبة 100% دون أي حذف، ورصد الأخطاء الإملائية والنحوية ووضع خط تحتها، وحساب الدرجات.
            </p>
          </div>

          {/* Re-upload or replace button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg border border-neutral-800 transition cursor-pointer"
            >
              استبدال الصورة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
