import React from 'react';
import { Plus, Trash2, History, Volume2, Sparkles, FolderOpen } from 'lucide-react';
import { VoiceProject } from '../types';
import { EGYPTIAN_VOICES } from '../data/voices';

interface ProjectSidebarProps {
  projects: VoiceProject[];
  currentProjectId: string | null;
  onSelectProject: (project: VoiceProject) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string, e: React.MouseEvent) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenVoiceCloneModal: () => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  isOpenMobile,
  onCloseMobile,
  onOpenVoiceCloneModal,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        id="projects-sidebar"
        className={`fixed md:static inset-y-0 right-0 z-40 w-72 bg-white border-l border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg shadow-xs">
              <span className="text-xl">🎙️</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base text-slate-900 tracking-tight">Sabeel Studio</h1>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-700">AI SaaS</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">التعليق الصوتي المصري الذكي</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Action: New voiceover */}
        <div className="p-3 space-y-2">
          <button
            id="new-project-btn"
            onClick={() => {
              onNewProject();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-xs shadow-sky-200"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع صوتي جديد</span>
          </button>

          <button
            id="sidebar-clone-voice-btn"
            onClick={() => {
              onOpenVoiceCloneModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-sky-200 text-sky-700 bg-sky-50/40 hover:bg-sky-100/60 font-medium text-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>استنساخ صوتك (Voice Clone)</span>
          </button>
        </div>

        {/* Section title */}
        <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
          <History className="w-3.5 h-3.5" />
          <span>المحادثات والمشاريع السابقة</span>
          <span className="mr-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500">
            {projects.length}
          </span>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {projects.length === 0 ? (
            <div className="text-center py-8 px-3 text-slate-400">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-medium">لا توجد مشاريع سابقة حتى الآن</p>
              <p className="text-[11px] text-slate-400 mt-1">ابدأ بكتابة نصك واضغط إنشاء الصوت</p>
            </div>
          ) : (
            projects.map((proj) => {
              const isSelected = proj.id === currentProjectId;
              const voice = EGYPTIAN_VOICES.find((v) => v.id === proj.voiceId);

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    onCloseMobile();
                  }}
                  className={`group relative rounded-xl p-2.5 cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-sky-50/80 text-sky-900 border border-sky-200/80 shadow-2xs'
                      : 'hover:bg-slate-100/70 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    {voice?.avatar || '🎙️'}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-xs font-bold truncate">{proj.title || 'مشروع بدون عنوان'}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{proj.text}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{voice?.name || 'صوت مصري'}</span>
                      {proj.duration ? <span>• {proj.duration} ثانية</span> : null}
                    </div>
                  </div>

                  <button
                    onClick={(e) => onDeleteProject(proj.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 p-1 rounded-md text-slate-400 transition-opacity"
                    title="حذف المشروع"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              نظام سحابي متصل (Firebase)
            </span>
            <span className="font-semibold text-sky-600">v2.4 SaaS</span>
          </div>
        </div>
      </aside>
    </>
  );
};
