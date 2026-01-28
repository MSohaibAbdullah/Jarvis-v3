
import React, { useState } from 'react';
import { Project, FileData, Thread } from '../types';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  activeThreadId: string;
  onSelectProject: (id: string) => void;
  onSelectThread: (id: string) => void;
  onCreateProject: (name: string) => void;
  onCreateThread: (projectId: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  projects, 
  activeProjectId, 
  activeThreadId,
  onSelectProject, 
  onSelectThread,
  onCreateProject, 
  onCreateThread,
  onUpdateProject 
}) => {
  const [showSetup, setShowSetup] = useState<string | null>(null);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>, projId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile: FileData = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type || 'application/octet-stream',
        content: content
      };
      const proj = projects.find(p => p.id === projId);
      if (proj) onUpdateProject(projId, { files: [...proj.files, newFile] });
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="w-72 h-full bg-white border-r border-slate-100 flex flex-col z-20 overflow-hidden">
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45"></div>
            </div>
            <h1 className="text-lg font-bold tracking-tighter">Jarvis</h1>
          </div>
          <button onClick={() => onCreateProject('New Project')} className="text-slate-400 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <nav className="space-y-6">
          {projects.map(p => (
            <div key={p.id} className="space-y-2">
              <div 
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeProjectId === p.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                onClick={() => onSelectProject(p.id)}
              >
                <span className={`text-xs font-bold uppercase tracking-widest ${activeProjectId === p.id ? 'text-black' : 'text-slate-400'}`}>
                  {p.name}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSetup(p.id); }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>

              {activeProjectId === p.id && (
                <div className="pl-4 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  {p.threads.map(t => (
                    <button
                      key={t.id}
                      onClick={() => onSelectThread(t.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all truncate ${activeThreadId === t.id ? 'text-black font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {t.title}
                    </button>
                  ))}
                  <button 
                    onClick={() => onCreateThread(p.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-blue-500 font-medium hover:bg-blue-50 transition-all flex items-center space-x-1"
                  >
                    <span>+ New Discussion</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {showSetup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Project Architecture</h2>
              <button onClick={() => setShowSetup(null)} className="text-slate-400 hover:text-black">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Project Name</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-black"
                  value={projects.find(p => p.id === showSetup)?.name}
                  onChange={(e) => onUpdateProject(showSetup, { name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Technical Documents</label>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto custom-scrollbar">
                  {projects.find(p => p.id === showSetup)?.files.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-xs">
                      <span className="truncate flex-1 font-medium">{f.name}</span>
                      <button 
                        onClick={() => {
                          const proj = projects.find(p => p.id === showSetup);
                          if (proj) onUpdateProject(showSetup, { files: proj.files.filter(file => file.id !== f.id) });
                        }}
                        className="ml-2 text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <label className="block w-full text-center border-2 border-dashed border-slate-100 rounded-xl py-6 cursor-pointer hover:bg-slate-50 transition-all group">
                  <input type="file" className="hidden" onChange={(e) => handleFileAdd(e, showSetup)} />
                  <span className="text-xs text-slate-400 font-medium group-hover:text-blue-500 transition-colors">+ Attach Project Data</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
