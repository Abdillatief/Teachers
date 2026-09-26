import React, { useState, useEffect, useRef } from "react";
import { AspectRatio, VeoGenerationItem } from "../types";
import { VEO_PRESET_PROMPTS } from "../data/scenesData";
import {
  Video,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  AlertCircle,
  Clock,
  Sliders,
  CheckCircle2,
  Film,
  Monitor,
  Smartphone,
  Info,
  Wand2,
  Image as ImageIcon,
  X
} from "lucide-react";

interface VeoStudioProps {
  initialPrompt: string;
  initialAspectRatio: AspectRatio;
  initialSourceImage?: string;
}

const REASSURING_MESSAGES = [
  "Connecting to Veo 3 high-speed video engine (veo-3.1-fast-generate-preview)...",
  "Synthesizing photorealistic cinematic frames and character consistency...",
  "Simulating natural morning light bounce and warm living room textures...",
  "Rendering nuanced facial expressions: mother's care & boy's focus...",
  "Computing realistic camera motion & subtle depth-of-field transitions...",
  "Assembling coherent high-bitrate video stream with temporal stability...",
  "Finalizing video export — almost ready to play...",
];

export const VeoStudio: React.FC<VeoStudioProps> = ({
  initialPrompt,
  initialAspectRatio,
  initialSourceImage,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [useSourceImage, setUseSourceImage] = useState(Boolean(initialSourceImage));
  const [sourceImage, setSourceImage] = useState<string | undefined>(initialSourceImage);

  const [activeItem, setActiveItem] = useState<VeoGenerationItem | null>(null);
  const [history, setHistory] = useState<VeoGenerationItem[]>([]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Sync props if changed externally
  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    if (initialAspectRatio) setAspectRatio(initialAspectRatio);
    if (initialSourceImage) {
      setSourceImage(initialSourceImage);
      setUseSourceImage(true);
    }
  }, [initialPrompt, initialAspectRatio, initialSourceImage]);

  // Rotate reassuring messages every 6 seconds when active
  useEffect(() => {
    if (!activeItem || activeItem.status !== "processing") return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % REASSURING_MESSAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeItem]);

  // Timer for elapsed seconds
  useEffect(() => {
    if (!activeItem || (activeItem.status !== "processing" && activeItem.status !== "submitting")) return;
    const timer = setInterval(() => {
      setActiveItem((prev) => {
        if (!prev) return null;
        return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeItem?.status]);

  // Polling loop for active operation
  useEffect(() => {
    if (!activeItem || activeItem.status !== "processing" || !activeItem.operationName) return;

    let isMounted = true;
    let pollTimeout: any = null;

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: activeItem.operationName }),
        });

        if (!response.ok) {
          throw new Error(`Status check returned ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        if (data.done) {
          if (data.error) {
            const errorMsg = data.error.message || "Video generation failed upstream.";
            setActiveItem((prev) =>
              prev ? { ...prev, status: "failed", error: errorMsg } : null
            );
            setActiveError(errorMsg);
          } else {
            // Video is ready!
            const videoStreamUrl = `/api/video-stream?operationName=${encodeURIComponent(
              activeItem.operationName
            )}`;
            const completedItem: VeoGenerationItem = {
              ...activeItem,
              status: "completed",
              videoUrl: videoStreamUrl,
            };
            setActiveItem(completedItem);
            setHistory((prev) => [completedItem, ...prev.filter((x) => x.id !== completedItem.id)]);
          }
        } else {
          // Still processing, poll again in 4.5 seconds
          pollTimeout = setTimeout(checkStatus, 4500);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        // Retry polling anyway in 6 seconds unless aborted
        if (isMounted) {
          pollTimeout = setTimeout(checkStatus, 6000);
        }
      }
    };

    pollTimeout = setTimeout(checkStatus, 4000);

    return () => {
      isMounted = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [activeItem?.operationName, activeItem?.status]);

  const handleStartGeneration = async () => {
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    setActiveError(null);

    const newItemId = `veo-${Date.now()}`;
    const initialItem: VeoGenerationItem = {
      id: newItemId,
      operationName: "",
      prompt: prompt.trim(),
      aspectRatio: aspectRatio,
      status: "submitting",
      progressMessage: "Submitting request to Veo 3...",
      elapsedSeconds: 0,
      createdAt: Date.now(),
      sourceImage: useSourceImage ? sourceImage : undefined,
    };

    setActiveItem(initialItem);

    try {
      let imageBytes: string | undefined = undefined;
      if (useSourceImage && sourceImage) {
        try {
          // Fetch image and convert to base64
          const imgFetch = await fetch(sourceImage);
          const blob = await imgFetch.blob();
          imageBytes = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imgErr) {
          console.warn("Could not encode source image, falling back to pure text prompt:", imgErr);
        }
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio: aspectRatio,
          imageBytes: imageBytes,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to start Veo 3 generation.");
      }

      const processingItem: VeoGenerationItem = {
        ...initialItem,
        operationName: data.operationName,
        status: "processing",
        progressMessage: REASSURING_MESSAGES[0],
      };

      setActiveItem(processingItem);
    } catch (err: any) {
      console.error("Start generation error:", err);
      const errMsg = err.message || "Failed to connect to Veo 3 generation service.";
      setActiveError(errMsg);
      setActiveItem((prev) => (prev ? { ...prev, status: "failed", error: errMsg } : null));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (presetPrompt: string, presetAspect: AspectRatio) => {
    setPrompt(presetPrompt);
    setAspectRatio(presetAspect);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Studio Header Card */}
      <div className="bg-gradient-to-r from-stone-900 via-[#181614] to-stone-900 rounded-2xl border border-stone-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium">
                veo-3.1-fast-generate-preview
              </span>
              <span className="px-2.5 py-1 rounded-md bg-stone-800 text-stone-300 text-xs">
                Google DeepMind Veo 3
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 tracking-tight">
              Cinematic Veo 3 Video Generator
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 leading-relaxed">
              Generate photorealistic motion video from natural text prompts and scenes.
              Supports <strong>16:9 widescreen</strong> landscape and <strong>9:16 vertical</strong> mobile portrait framing.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto bg-stone-950/80 p-3 rounded-xl border border-stone-800">
            <Film className="w-5 h-5 text-amber-400" />
            <div className="text-xs">
              <span className="text-stone-400 block">Current Target</span>
              <span className="text-stone-100 font-semibold font-mono">
                {aspectRatio === "16:9" ? "16:9 Landscape" : "9:16 Portrait"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Generator Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-5 sm:p-6 space-y-5 shadow-lg">
            <h2 className="text-base font-semibold text-stone-100 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Video Generation Parameters</span>
              </span>
              <span className="text-xs font-mono text-stone-400">Veo 3 Fast</span>
            </h2>

            {/* Aspect Ratio Selector (Mandatory 16:9 or 9:16) */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-2">
                Aspect Ratio <span className="text-amber-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="ratio-16-9"
                  onClick={() => setAspectRatio("16:9")}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
                    aspectRatio === "16:9"
                      ? "bg-amber-600/20 border-amber-500 text-amber-200 shadow-md shadow-amber-950/30"
                      : "bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                  }`}
                >
                  <div className="w-8 h-5 rounded border border-current flex items-center justify-center">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-semibold">16:9 Landscape</span>
                    <span className="block text-[11px] opacity-75">Widescreen / Cinema</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="ratio-9-16"
                  onClick={() => setAspectRatio("9:16")}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
                    aspectRatio === "9:16"
                      ? "bg-amber-600/20 border-amber-500 text-amber-200 shadow-md shadow-amber-950/30"
                      : "bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                  }`}
                >
                  <div className="w-5 h-8 rounded border border-current flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs font-semibold">9:16 Portrait</span>
                    <span className="block text-[11px] opacity-75">Vertical / Mobile</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Optional Source Image Reference */}
            {sourceImage && (
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={sourceImage}
                    alt="Source reference"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-stone-700"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-stone-200 block">Cinematic Reference Image</span>
                    <span className="text-[11px] text-stone-400">
                      {useSourceImage ? "Active as starting visual keyframe" : "Image reference disabled"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseSourceImage(!useSourceImage)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    useSourceImage
                      ? "bg-amber-600/20 border-amber-500/40 text-amber-300"
                      : "bg-stone-800 border-stone-700 text-stone-400"
                  }`}
                >
                  {useSourceImage ? "Enabled" : "Disabled"}
                </button>
              </div>
            )}

            {/* Prompt Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="veo-prompt-input" className="text-xs font-medium text-stone-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cinematic Motion Prompt</span>
                </label>
                <span className="text-[11px] text-stone-500">{prompt.length} chars</span>
              </div>
              <textarea
                id="veo-prompt-input"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe camera movement, character actions, lighting transitions, and atmosphere..."
                className="w-full px-3.5 py-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all leading-relaxed resize-none"
              />
            </div>

            {/* Quick Preset Prompts */}
            <div>
              <span className="text-xs text-stone-400 block mb-2 font-medium">
                Arab Family Story Presets:
              </span>
              <div className="space-y-2">
                {VEO_PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset.prompt, preset.aspectRatio)}
                    className="w-full text-left p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-800/60 border border-stone-800/80 hover:border-stone-700 transition-all text-xs group flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <span className="text-amber-300/90 font-medium block truncate group-hover:text-amber-300">
                        {preset.title}
                      </span>
                      <span className="text-stone-400 text-[11px] truncate block">
                        {preset.prompt}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 shrink-0 font-mono">
                      {preset.aspectRatio}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {activeError && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold block text-red-300">Generation Notice:</span>
                  <span>{activeError}</span>
                  <p className="text-[11px] text-red-400 mt-1">
                    Please ensure your Gemini API key is configured with video generation permissions in AI Studio settings.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              id="btn-generate-veo-video"
              disabled={isSubmitting || (activeItem?.status === "processing")}
              onClick={handleStartGeneration}
              className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm shadow-xl flex items-center justify-center space-x-2.5 transition-all transform active:scale-[0.99] ${
                isSubmitting || (activeItem?.status === "processing")
                  ? "bg-amber-900/40 text-amber-300/50 cursor-not-allowed border border-amber-800/30"
                  : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-amber-950/50 hover:shadow-amber-900/60"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>
                {activeItem?.status === "processing"
                  ? "Synthesizing Video with Veo 3..."
                  : isSubmitting
                  ? "Contacting Veo 3 Model..."
                  : "Generate Cinematic Video with Veo 3"}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Output & Live Generation Status */}
        <div className="lg:col-span-6 space-y-6">
          {/* Active Generation / Completed Card */}
          <div className="bg-stone-900/90 rounded-2xl border border-stone-800 p-5 sm:p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-stone-100 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Veo 3 Playback &amp; Output</span>
              </span>
              {activeItem && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-950 text-stone-300 border border-stone-800">
                  {activeItem.aspectRatio}
                </span>
              )}
            </h2>

            {/* Video Stage Container */}
            <div
              className={`relative rounded-xl overflow-hidden bg-stone-950 border border-stone-800 flex items-center justify-center ${
                aspectRatio === "9:16" ? "max-h-[580px] aspect-[9/16] mx-auto" : "aspect-video w-full"
              }`}
            >
              {/* State 1: Active Video Processing */}
              {activeItem && (activeItem.status === "processing" || activeItem.status === "submitting") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-950/95 z-20 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>

                  <div className="max-w-md space-y-2">
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Elapsed: {activeItem.elapsedSeconds}s</span>
                    </span>

                    <h3 className="text-sm sm:text-base font-medium text-stone-100">
                      Generating with veo-3.1-fast-generate-preview
                    </h3>

                    <p className="text-xs text-amber-300/90 italic font-sans leading-relaxed animate-fadeIn">
                      "{REASSURING_MESSAGES[messageIndex]}"
                    </p>

                    <p className="text-[11px] text-stone-400 pt-1">
                      Video generation typically takes 1–3 minutes. Your video will automatically start playing once rendered.
                    </p>
                  </div>
                </div>
              )}

              {/* State 2: Completed Video Player */}
              {activeItem && activeItem.status === "completed" && activeItem.videoUrl ? (
                <div className="w-full h-full relative group">
                  <video
                    id="veo-video-player"
                    src={activeItem.videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 pointer-events-none">
                    <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[11px] text-amber-300 font-mono">
                      Veo 3 Fast
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[11px] text-stone-300">
                      {activeItem.aspectRatio}
                    </span>
                  </div>
                </div>
              ) : (
                /* State 3: Standby / Idle */
                (!activeItem || activeItem.status === "failed") && (
                  <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500">
                      <Film className="w-7 h-7 text-stone-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-stone-300">Veo 3 Ready for Synthesis</h3>
                      <p className="text-xs text-stone-500 max-w-sm mt-1">
                        Select an aspect ratio (16:9 or 9:16), customize your prompt, and click generate to synthesize your cinematic scene.
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Video Controls & Download */}
            {activeItem && activeItem.status === "completed" && activeItem.videoUrl && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800/80">
                <div className="text-xs text-stone-400">
                  <span className="text-stone-300 font-medium">Generation finished</span> in{" "}
                  {activeItem.elapsedSeconds}s
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    id="btn-download-video"
                    href={activeItem.videoUrl}
                    download={`arab_family_veo_${activeItem.aspectRatio}.mp4`}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-xs flex items-center space-x-2 shadow-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Model Specification Card */}
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800/70 p-4 space-y-2.5 text-xs text-stone-400">
            <div className="flex items-center space-x-2 text-stone-200 font-semibold">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Veo 3 Model Specifications</span>
            </div>
            <p className="leading-relaxed">
              Google DeepMind's <code className="text-amber-300 font-mono">veo-3.1-fast-generate-preview</code> delivers
              advanced cinematic video synthesis. It natively respects the specified <strong>16:9</strong> (landscape)
              or <strong>9:16</strong> (vertical portrait) aspect ratios, synthesizing natural fluid lighting, camera movements,
              and authentic human expressions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
