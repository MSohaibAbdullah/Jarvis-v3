
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Project, Thread, ChatMessage, ReasoningMode, GroundingSource } from './types';
import ProjectList from './components/ProjectList';
import ThreadList from './components/ThreadList';
import ChatArea from './components/ChatArea';
import VoiceMessageOverlay from './components/VoiceMessageOverlay';
import { gemini } from './services/gemini';
import { auth, db, googleProvider } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [reasoningMode, setReasoningMode] = useState<ReasoningMode>('Standard');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isSidebarsCollapsed, setIsSidebarsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const syncedProjects = data.projects || [];
        setProjects(syncedProjects);
        
        // Initial state setup
        if (syncedProjects.length > 0 && !activeProjectId) {
          setActiveProjectId(syncedProjects[0].id);
          if (syncedProjects[0].threads.length > 0) {
            setActiveThreadId(syncedProjects[0].threads[0].id);
          }
        }
      } else {
        // Init new user data node
        const initialThread: Thread = { id: 'main', title: 'Intelligence Core Initialized', history: [], updatedAt: Date.now() };
        const defaultProject: Project = { id: 'default', name: 'Primary Workspace', description: '', files: [], threads: [initialThread], createdAt: Date.now() };
        setDoc(docRef, { projects: [defaultProject] });
      }
    });

    return unsubscribe;
  }, [user]);

  // Push updates to Firebase
  const syncToCloud = async (updatedProjects: Project[]) => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      await setDoc(doc(db, 'users', user.uid), { projects: updatedProjects }, { merge: true });
      setSyncStatus('synced');
    } catch (e) {
      console.error("Cloud Sync Error:", e);
      setSyncStatus('error');
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const activeThread = activeProject?.threads.find(t => t.id === activeThreadId) || activeProject?.threads[0];

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Google Auth Fault:", e);
    }
  };

  const handleLogout = () => signOut(auth);

  const onUpdateProject = (id: string, updates: Partial<Project>) => {
    const updated = projects.map(p => p.id === id ? { ...p, ...updates } : p);
    setProjects(updated);
    syncToCloud(updated);
  };

  const addMessageToHistory = useCallback((msg: ChatMessage) => {
    const updated = projects.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          threads: p.threads.map(t => t.id === activeThreadId ? { ...t, history: [...t.history, msg], updatedAt: Date.now() } : t)
        };
      }
      return p;
    });
    setProjects(updated);
    syncToCloud(updated);
  }, [activeProjectId, activeThreadId, projects]);

  const handleSendMessage = async (content: string) => {
    const userMsg: ChatMessage = { id: Math.random().toString(), role: 'user', content, timestamp: Date.now() };
    // We add to local state but the current render's 'activeThread' still points to the old history
    addMessageToHistory(userMsg);
    setIsGenerating(true);
    setStreamingMessage('');

    try {
      if (content.toLowerCase().startsWith('/gen ')) {
        const prompt = content.substring(5).trim();
        const imageUrl = await gemini.generateImage(prompt);
        addMessageToHistory({ id: Math.random().toString(), role: 'assistant', content: `Asset Generated: **${prompt}**`, imageUrl, type: 'image', timestamp: Date.now() });
      } else {
        let fullText = '';
        const sourcesMap = new Map<string, GroundingSource>();
        
        // Use activeProject and activeThread from current closure (pre-update history)
        const stream = gemini.generateTextStream(activeProject, activeThread, content, reasoningMode);
        
        for await (const chunk of stream) {
          fullText += chunk.text || '';
          setStreamingMessage(fullText);
          
          if (chunk.groundingMetadata?.groundingChunks) {
            chunk.groundingMetadata.groundingChunks.forEach((c: any) => {
              if (c.web && c.web.uri) {
                sourcesMap.set(c.web.uri, { title: c.web.title, uri: c.web.uri });
              }
            });
          }
        }

        const sources = Array.from(sourcesMap.values());

        addMessageToHistory({ 
          id: Math.random().toString(), 
          role: 'assistant', 
          content: fullText, 
          groundingSources: sources.length > 0 ? sources : undefined,
          timestamp: Date.now() 
        });
      }

      if (activeThread && activeThread.history.length < 3) {
        const title = await gemini.generateTitle([...activeThread.history, userMsg]);
        updateThreadTitle(activeThreadId, title);
      }
    } catch (e: any) {
      console.error("Neural Connection Fault:", e);
      addMessageToHistory({ 
        id: 'err', 
        role: 'assistant', 
        content: 'System Analysis Interrupted: Neural core is momentarily unresponsive. Verify the environment variable "API_KEY" is correctly configured in your Netlify dashboard.', 
        timestamp: Date.now() 
      });
    } finally { 
      setIsGenerating(false);
      setStreamingMessage('');
    }
  };

  const updateThreadTitle = (threadId: string, title: string) => {
    const updated = projects.map(p => ({
      ...p,
      threads: p.threads.map(t => t.id === threadId ? { ...t, title } : t)
    }));
    setProjects(updated);
    syncToCloud(updated);
  };

  const handleVoiceMessage = async (audioBase64: string, mimeType: string) => {
    setIsGenerating(true);
    setIsVoiceMode(false);
    try {
      const result = await gemini.processVoiceMessage(audioBase64, mimeType, activeProject, activeThread);
      addMessageToHistory({ id: Math.random().toString(), role: 'user', content: result.transcription, timestamp: Date.now(), type: 'voice' });
      addMessageToHistory({ id: Math.random().toString(), role: 'assistant', content: result.reply, timestamp: Date.now() });
    } catch (e) {
      addMessageToHistory({ id: 'err', role: 'assistant', content: 'Audio decoding fault. Verify API_KEY protocol.', timestamp: Date.now() });
    } finally { setIsGenerating(false); }
  };

  const createNewThread = (projectId: string) => {
    const newThread: Thread = { id: Math.random().toString(36).substr(2, 9), title: 'Analytical Discussion', history: [], updatedAt: Date.now() };
    const updated = projects.map(p => p.id === projectId ? { ...p, threads: [newThread, ...p.threads] } : p);
    setProjects(updated);
    setActiveThreadId(newThread.id);
    syncToCloud(updated);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 bg-white rounded-xl animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full bg-[#0a0a0b] flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-white rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-white/5">
              <div className="w-7 h-7 bg-black rounded-lg"></div>
            </div>
            <div className="space-y-2">
              <h1 className="text-white text-5xl font-black italic tracking-tighter uppercase">Jarvis</h1>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em]">Global Intelligence Network</p>
            </div>
          </div>

          <div className="bg-[#141417] border border-white/5 rounded-[3rem] p-8 md:p-10 space-y-8 shadow-3xl">
            <div className="space-y-4">
              <button onClick={handleGoogleAuth} className="w-full h-14 bg-white text-black rounded-2xl flex items-center justify-center space-x-3 hover:bg-slate-200 transition-all font-black uppercase text-[11px] tracking-widest">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                <span>Authorize via Google</span>
              </button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-600 tracking-[0.4em]"><span className="bg-[#141417] px-4">ENCRYPTED ENTRY</span></div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Accessing the JARVIS network requires a verified neural signature via Firebase Cloud protocols.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-slate-900 font-sans antialiased">
      <div className={`hidden lg:flex h-full transition-all duration-300 ${isSidebarsCollapsed ? 'w-16' : 'w-80'}`}>
        <ProjectList 
          projects={projects} activeProjectId={activeProjectId} 
          onSelectProject={(id) => { setActiveProjectId(id); const proj = projects.find(p => p.id === id); if (proj && proj.threads.length > 0) setActiveThreadId(proj.threads[0].id); }}
          onCreateProject={(name) => {
            const id = Math.random().toString(36).substr(2, 9);
            const initialThread: Thread = { id: 'main', title: 'Start', history: [], updatedAt: Date.now() };
            const updated = [...projects, { id, name, description: '', files: [], threads: [initialThread], createdAt: Date.now() }];
            setProjects(updated);
            setActiveProjectId(id); setActiveThreadId(initialThread.id);
            syncToCloud(updated);
          }}
          onUpdateProject={onUpdateProject}
          onToggleCollapse={() => setIsSidebarsCollapsed(!isSidebarsCollapsed)} isCollapsed={isSidebarsCollapsed}
        />
        <ThreadList 
          threads={activeProject?.threads || []} activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId} onCreateThread={() => createNewThread(activeProjectId)}
          projectName={activeProject?.name || 'Workspace'} isCollapsed={isSidebarsCollapsed}
        />
      </div>

      <main className="flex-1 flex flex-col relative h-full bg-white">
        <header className="h-14 lg:h-16 px-4 lg:px-8 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center space-x-2">
               <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
               <h2 className="text-[9px] font-black tracking-[0.2em] uppercase truncate max-w-[150px]">{activeThread?.title || 'System Active'}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setReasoningMode(reasoningMode === 'Standard' ? 'High Reasoning' : 'Standard')}
              className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${reasoningMode === 'High Reasoning' ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
            >
              {reasoningMode === 'High Reasoning' ? 'DEEP SCAN' : 'STD CORE'}
            </button>
            <div className="flex items-center space-x-3 group relative">
               <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-full border border-slate-100 cursor-pointer" alt="Node User" />
               <button onClick={handleLogout} className="opacity-0 group-hover:opacity-100 absolute -bottom-10 right-0 bg-white border border-slate-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-slate-50 z-20 whitespace-nowrap">Terminate Session</button>
            </div>
          </div>
        </header>

        <ChatArea 
          history={activeThread?.history || []} 
          onSendMessage={handleSendMessage} 
          isGenerating={isGenerating} 
          streamingMessage={streamingMessage}
          onOpenVoice={() => setIsVoiceMode(true)}
        />

        {isVoiceMode && <VoiceMessageOverlay onClose={() => setIsVoiceMode(false)} onSendVoice={handleVoiceMessage} />}
      </main>
    </div>
  );
};

export default App;
