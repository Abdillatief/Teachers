import React, { useState, useRef } from 'react';
import { Mic, Square, Upload, Play, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { VoiceClone } from '../types';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloneCreated: (clone: VoiceClone) => void;
}

export const VoiceCloneModal: React.FC<VoiceCloneModalProps> = ({
  isOpen,
  onClose,
  onCloneCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage('تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن للمتصفح.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setErrorMessage('يرجى اختيار ملف صوتي صحيح (WAV, MP3, M4A)');
        return;
      }
      setErrorMessage(null);
      const url = URL.createObjectURL(file);
      setRecordedAudioUrl(url);
    }
  };

  const handleCreateClone = async () => {
    if (!voiceName.trim()) {
      setErrorMessage('يرجى كتابة اسم البصمة الصوتية');
      return;
    }
    if (!recordedAudioUrl) {
      setErrorMessage('يرجى تسجيل عينة صوتية أو رفع ملف صوتي أولاً');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName,
          audioData: recordedAudioUrl,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newClone: VoiceClone = {
          id: data.cloneId,
          userId: 'current-user',
          name: voiceName,
          description: description || 'صوت مستنسخ عالي الدقة عبر استوديو سبيل',
          sampleAudioUrl: recordedAudioUrl,
          similarityScore: data.similarityScore || 96,
          status: 'ready',
          createdAt: new Date().toISOString(),
        };
        onCloneCreated(newClone);
        onClose();
      } else {
        setErrorMessage(data.error || 'فشل استنساخ الصوت');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ في معالجة العينة الصوتية');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-sky-100 shadow-xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">استنساخ الصوت (Voice Clone)</h3>
              <p className="text-xs text-slate-500">تسجيل أو رفع عينة صوتية لإنشاء شخصية صوتية مصرية خاصة بك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100/70 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'record'
                ? 'bg-white text-sky-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            تسجيل صوتي مباشر (الميكروفون)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-sky-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            رفع ملف صوتي مسجل
          </button>
        </div>

        {/* Voice Details inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الشخصية الصوتية</label>
            <input
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="مثال: صوتي الشخصي - إعلانات السوشيال"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">وصف الاستخدام (اختياري)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: مناسب للريلز التعليمية وقراءة المقالات"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Recording or Upload Area */}
        {activeTab === 'record' ? (
          <div className="bg-slate-50 border border-dashed border-sky-200 rounded-2xl p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-white shadow-xs">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {isRecording ? `جاري التسجيل... 00:${recordingSeconds.toString().padStart(2, '0')}` : 'اضغط على الميكروفون وابدأ القراءة'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تحدث بجملة أو جملتين بنبرة واضحة ومخارج ألفاظ مصرية طبيعية
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-sky-200 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-sky-500">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors">
                <span>تصفح واختيار ملف صوتي</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-2">
                الصيغ المدعومة: MP3, WAV, M4A حتى حجم 25 ميجابايت
              </p>
            </div>
          </div>
        )}

        {/* Audio Preview if available */}
        {recordedAudioUrl && (
          <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-700">تم تسجيل العينة بنجاح</span>
            </div>
            <audio src={recordedAudioUrl} controls className="h-8 max-w-[200px]" />
          </div>
        )}

        {errorMessage && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleCreateClone}
            disabled={isProcessing || !recordedAudioUrl || !voiceName.trim()}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 active:scale-95 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-xs transition-all"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جاري معالجة واستنساخ البصمة الصوتية...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>حفظ وبدء استخدام الصوت المستنسخ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
