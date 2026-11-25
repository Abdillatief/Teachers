import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Sliders, Eye, Grid } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  title?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, title }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setHighContrast(false);
    setShowGrid(false);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full shadow-xl">
      {/* Viewer Header / Toolbar */}
      <div className="bg-black/90 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="font-bold text-neutral-200 font-['Cairo']">
            {title || 'صورة المقال الأصلية (الوثيقة البصرية)'}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
            التكبير: {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHighContrast(!highContrast)}
            title="تبديل وضع التباين العالي (لتوضيح الخط اليدوي الخفيف)"
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              highContrast
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="شبكة السطور لمطابقة الأسطر كلمة بكلمة"
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showGrid
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomOut}
            title="تصغير"
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomIn}
            title="تكبير"
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRotate}
            title="تدوير الصورة 90 درجة"
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReset}
            title="إعادة ضبط العرض"
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Display Surface */}
      <div className="relative flex-1 bg-black overflow-auto min-h-[420px] max-h-[640px] flex items-center justify-center p-4 select-none">
        {/* Visual Line Overlay if enabled */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
              backgroundSize: '100% 32px',
            }}
          />
        )}

        <div
          className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            filter: highContrast ? 'contrast(1.6) brightness(1.1) grayscale(0.2)' : 'none',
          }}
        >
          <img
            src={imageUrl}
            alt="وثيقة المقال العربي"
            className="max-w-full max-h-[580px] object-contain rounded-lg shadow-2xl border border-neutral-800/80"
          />
        </div>

        {/* Verification badge watermark */}
        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md border border-neutral-800 px-2.5 py-1 rounded-md text-[10px] text-neutral-400 font-mono pointer-events-none z-20">
          دقة الفحص البصري: 100%
        </div>
      </div>
    </div>
  );
};
