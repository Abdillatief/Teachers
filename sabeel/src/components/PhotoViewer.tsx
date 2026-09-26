import React, { useState } from "react";
import { PhotoScene } from "../types";
import { SCENES_DATA } from "../data/scenesData";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Video,
  Info,
  Sun,
  Camera,
  Layers,
  HeartHandshake,
  Download,
  Share2,
  Check
} from "lucide-react";

interface PhotoViewerProps {
  onSelectForVideo: (prompt: string, aspectRatio: "16:9" | "9:16", imageUrl?: string) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ onSelectForVideo }) => {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentScene = SCENES_DATA[selectedSceneIndex];

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentScene.suggestedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Concept Intro */}
      <div className="bg-gradient-to-r from-stone-900 via-[#1a1715] to-stone-900 rounded-2xl border border-stone-800/80 p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Realistic Advertising Photography</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-stone-100 font-semibold mb-2">
            An Arab Family at Home: Digital Immersion &amp; Maternal Care
          </h1>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            A photorealistic cinematic portrayal of an 8-year-old Arab boy absorbed in his smartphone,
            with his mother standing thoughtfully behind him in a warm, modern modest Arabic home.
            Captured with natural daylight and commercial cinematography.
          </p>
        </div>

        {/* Framing Switcher Pills */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-stone-800/60">
          <span className="text-xs text-stone-400 self-center mr-2">Cinematic Framing:</span>
          {SCENES_DATA.map((scene, idx) => (
            <button
              key={scene.id}
              id={`scene-btn-${scene.id}`}
              onClick={() => setSelectedSceneIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center space-x-2 ${
                selectedSceneIndex === idx
                  ? "bg-amber-600 text-amber-50 shadow-md shadow-amber-950/50"
                  : "bg-stone-800/80 text-stone-300 hover:bg-stone-700/80 hover:text-white"
              }`}
            >
              <span>{scene.aspectRatio === "16:9" ? "16:9 Widescreen" : "9:16 Portrait"}</span>
              <span className="text-[11px] opacity-75">({scene.aspectRatio})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Photo Display Card */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative group bg-stone-950 rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
            {/* Aspect ratio container */}
            <div
              className={`w-full flex items-center justify-center bg-stone-950 ${
                currentScene.aspectRatio === "16:9" ? "aspect-video" : "max-h-[700px] aspect-[9/16] mx-auto"
              }`}
            >
              <img
                src={currentScene.imageUrl}
                alt={currentScene.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-[1.01]"
              />
            </div>

            {/* Overlay Badges */}
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-md bg-stone-900/80 backdrop-blur-md text-amber-300 border border-amber-500/30 text-xs font-mono font-medium">
                {currentScene.aspectRatio}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-stone-900/80 backdrop-blur-md text-stone-200 border border-stone-700/60 text-xs font-medium">
                {currentScene.subtitle}
              </span>
            </div>

            {/* Quick Actions Overlay */}
            <div className="absolute top-4 right-4 flex items-center space-x-2 opacity-90 group-hover:opacity-100 transition-opacity">
              <button
                id="btn-photo-fullscreen"
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-lg bg-stone-900/80 hover:bg-stone-800 backdrop-blur-md text-stone-200 border border-stone-700/60 transition-colors"
                title="View Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <a
                href={currentScene.imageUrl}
                download={`arab_family_${currentScene.aspectRatio}.jpg`}
                className="p-2 rounded-lg bg-stone-900/80 hover:bg-stone-800 backdrop-blur-md text-stone-200 border border-stone-700/60 transition-colors"
                title="Download Photo"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>

            {/* Bottom Caption Bar */}
            <div className="p-4 bg-gradient-to-t from-stone-950 via-stone-900/90 to-stone-900/40 border-t border-stone-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium text-stone-100">{currentScene.title}</h2>
                  <p className="text-xs text-stone-400 line-clamp-1 mt-0.5">
                    {currentScene.description}
                  </p>
                </div>
                <button
                  id="btn-animate-veo"
                  onClick={() =>
                    onSelectForVideo(
                      currentScene.suggestedPrompt,
                      currentScene.aspectRatio,
                      currentScene.imageUrl
                    )
                  }
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-semibold text-xs sm:text-sm shadow-lg shadow-amber-900/30 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <Video className="w-4 h-4" />
                  <span>Bring To Life with Veo 3</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Photographic Breakdown & Story Details */}
        <div className="lg:col-span-4 space-y-6">
          {/* Advertising Details Card */}
          <div className="bg-stone-900/80 rounded-2xl border border-stone-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Cinematic Scene Attributes</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/60">
                <Sun className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-stone-200 block mb-0.5">Lighting Setup</span>
                  <span className="text-stone-400 leading-relaxed">
                    {currentScene.cinematicDetails.lighting}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/60">
                <Camera className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-stone-200 block mb-0.5">Optics &amp; Depth</span>
                  <span className="text-stone-400 leading-relaxed">
                    {currentScene.cinematicDetails.cameraAngle}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/60">
                <Layers className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-stone-200 block mb-0.5">Color Palette</span>
                  <span className="text-stone-400 leading-relaxed">
                    {currentScene.cinematicDetails.palette}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/60">
                <HeartHandshake className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-stone-200 block mb-0.5">Emotional Storyline</span>
                  <span className="text-stone-400 leading-relaxed">
                    {currentScene.cinematicDetails.storyContext}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Motion Prompt Card */}
          <div className="bg-gradient-to-b from-stone-900 to-stone-950 rounded-2xl border border-stone-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Veo 3 Motion Script</span>
              </span>
              <button
                id="btn-copy-prompt"
                onClick={handleCopyPrompt}
                className="text-stone-400 hover:text-stone-200 text-xs flex items-center space-x-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <p className="text-xs text-stone-300 italic bg-stone-950/80 p-3.5 rounded-xl border border-stone-800/80 leading-relaxed font-sans">
              "{currentScene.suggestedPrompt}"
            </p>

            <button
              id="btn-load-into-veo"
              onClick={() =>
                onSelectForVideo(
                  currentScene.suggestedPrompt,
                  currentScene.aspectRatio,
                  currentScene.imageUrl
                )
              }
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-medium border border-stone-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Video className="w-4 h-4 text-amber-400" />
              <span>Load Into Veo 3 Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <button
            id="btn-close-fullscreen"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-5 right-5 p-3 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
          <div className="max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-stone-800 flex items-center justify-center">
            <img
              src={currentScene.imageUrl}
              alt={currentScene.title}
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
          <p className="text-stone-300 text-sm mt-4 text-center max-w-xl">
            {currentScene.title} — {currentScene.description}
          </p>
        </div>
      )}
    </div>
  );
};
