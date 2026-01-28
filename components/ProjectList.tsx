import React, { useState } from 'react';
import { Project, FileData } from '../types';

interface ProjectListProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  activeProjectId, 
  onSelectProject, 
  onCreateProject, 
  onUpdateProject, 
  onToggleCollapse,
  isCollapsed
}) => {
  const [showConfig, setShowConfig] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, projId: string) => {
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
    <nav className="w-16 h-full bg-slate-950 flex flex-col items-center py-6 space-y-4 z-30 shadow-2xl transition-all duration-300 border-r border-white/5">
      <div className="flex flex-col items-center mb-4 space-y-4">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center cursor-pointer hover:rotate-12 transition-transform duration-500 shadow-lg shadow-white/10">
          <div className="w-3.5 h-3.5 bg-black rounded-sm"></div>
        </div>
        
        <button 
          onClick={onToggleCollapse}
          className="hidden md:flex w-10 h-10 rounded-xl flex-col items-center justify-center space-y-1 hover:bg-slate-900 transition-colors group"
        >
          <div className="w-3 h-[1.5px] bg-white/30 group-hover:bg-white group-hover:scale-x-125 transition-all"></div>
          <div className="w-3 h-[1.5px] bg-white/30 group-hover:bg-white group-hover:scale-x-125 transition-all"></div>
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 w-full space-y-4 px-2 overflow-y-auto no-scrollbar animate-in fade-in duration-300">
          {projects.map(p => (
            <div key={p.id} className="relative group">
              <button
                onClick={() => onSelectProject(p.id)}
                className={`w-12 h-12 rounded-2xl transition-all duration-300 flex items-center justify-center font-black text-[9px] uppercase tracking-tighter ${activeProjectId === p.id ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-white'}`}
              >
                {p.name.substring(0, 2)}
              </button>
              {activeProjectId === p.id && (
                  <button 
                    onClick={() => setShowConfig(p.id)}
                    className="absolute -right-1 -bottom-1 w-5 h-5 bg-indigo-500 rounded-lg flex items-center justify-center text-white scale-75 border-2 border-slate-950 hover:scale-100 transition-transform shadow-lg"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </button>
              )}
            </div>
          ))}
          <button 
            onClick={() => onCreateProject('Workspace')}
            className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-800 text-slate-700 flex items-center justify-center hover:border-slate-500 hover:text-slate-500 transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/5 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-sm p-8 md:p-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8 md:mb-10">
              <div className="space-y-1">
                <h3 className="font-black text-xl md:text-2xl text-white tracking-tighter uppercase italic">Knowledge Ingress</h3>
                <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Project Data Layer</p>
              </div>
              <button onClick={() => setShowConfig(null)} className="text-slate-500 hover:text-white transition-colors p-2">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-6 md:space-y-8">
              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest block ml-2">Workspace Identification</label>
                <input 
                  className="w-full bg-slate-800 border-none p-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all tracking-widest"
                  value={projects.find(p => p.id === showConfig)?.name}
                  onChange={(e) => onUpdateProject(showConfig, { name: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:space-y-3">
                <label className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest block ml-2">Active Data Nodes</label>
                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {projects.find(p => p.id === showConfig)?.files.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-[8px] md:text-[9px] bg-slate-800/50 border border-white/5 p-3 rounded-xl text-slate-400 font-bold uppercase tracking-wider">
                      <span className="truncate flex-1">{f.name}</span>
                      <button onClick={() => {
                          const proj = projects.find(p => p.id === showConfig);
                          if (proj) onUpdateProject(showConfig, { files: proj.files.filter(x => x.id !== f.id) });
                      }} className="text-red-500 hover:text-red-400 ml-3 transition-colors">REMOVE</button>
                    </div>
                  ))}
                  {(!projects.find(p => p.id === showConfig)?.files.length) && (
                    <div className="text-center py-4 text-slate-700 text-[8px] font-black uppercase tracking-widest border border-dashed border-slate-800 rounded-xl">Zero Internal Nodes</div>
                  )}
                </div>
              </div>
              
              <label className="block border border-dashed border-indigo-500/30 rounded-3xl py-8 md:py-10 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group">
                <input type="file" className="hidden" onChange={(e) => handleFile(e, showConfig)} />
                <div className="space-y-1 md:space-y-2">
                   <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.3em] group-hover:scale-110 transition-transform block">Ingest New Data</span>
                   <span className="text-[7px] md:text-[8px] font-bold text-slate-600 uppercase tracking-widest block">PDF, TXT, CSV Supported</span>
                </div>
              </label>

              <button onClick={() => setShowConfig(null)} className="w-full py-4 bg-white text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all hover:bg-slate-200 active:scale-95 shadow-xl shadow-black/20">Sync Workspace</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default ProjectList;