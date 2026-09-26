import React from "react";
import { Sparkles, Video, Film, Eye, CheckCircle2, AlertCircle } from "lucide-react";

interface NavbarProps {
  activeTab: "photo" | "generator" | "gallery";
  setActiveTab: (tab: "photo" | "generator" | "gallery") => void;
  apiStatus: { ok: boolean; hasKey: boolean } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  apiStatus,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#161514]/90 backdrop-blur-md border-b border-stone-800 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-950/40">
              <Film className="w-5 h-5 text-amber-50" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold tracking-tight text-base sm:text-lg text-stone-100">
                  Arab Family Cinematic Scene
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Veo 3
                </span>
              </div>
              <p className="text-[12px] text-stone-400 hidden sm:block">
                Realistic Advertising Photography &amp; Video Studio
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="nav-tab-photo"
              onClick={() => setActiveTab("photo")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "photo"
                  ? "bg-amber-600/20 text-amber-300 border border-amber-500/40"
                  : "text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 border border-transparent"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Cinematic Photo</span>
            </button>

            <button
              id="nav-tab-generator"
              onClick={() => setActiveTab("generator")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "generator"
                  ? "bg-amber-600/20 text-amber-300 border border-amber-500/40"
                  : "text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 border border-transparent"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Veo 3 Video</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            </button>
          </nav>

          {/* Model Badge & Status */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-xs text-stone-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-[11px] text-amber-200">veo-3.1-fast-generate-preview</span>
            </div>
            {apiStatus?.hasKey ? (
              <div className="flex items-center space-x-1 text-[11px] text-emerald-400" title="API Key Connected">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-[11px] text-amber-400/80" title="Checking API key in Settings">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Ready</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
