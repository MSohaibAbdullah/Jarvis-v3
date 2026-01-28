
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, GroundingSource } from '../types';

interface ChatAreaProps {
  history: ChatMessage[];
  onSendMessage: (content: string, type?: 'text' | 'image') => void;
  isGenerating: boolean;
  streamingMessage?: string;
  onOpenVoice: () => void;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 group/code overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
          {language || 'Technical Output'}
        </span>
        <button onClick={handleCopy} className="p-1 text-slate-400 hover:text-white transition-colors">
          {copied ? (
            <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[11px] md:text-xs leading-relaxed text-slate-100 custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ChatArea: React.FC<ChatAreaProps> = ({ history, onSendMessage, isGenerating, streamingMessage, onOpenVoice }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isGenerating, streamingMessage]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `jarvis_gen_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input);
    setInput('');
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      const isTableSeparator = (l: string) => /^\|(\s*:?-+:?\s*\|)+$/.test(l.trim());

      if (trimmedLine.startsWith('|') && lines[i + 1] && isTableSeparator(lines[i + 1])) {
        let tableRows: string[][] = [];
        tableRows.push(trimmedLine.split('|').map(s => s.trim()).filter(s => s !== ''));
        i += 2; 
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const cells = lines[i].trim().split('|').map(s => s.trim()).filter((s, idx) => {
             const parts = lines[i].trim().split('|');
             return idx > 0 && idx < parts.length - 1;
          });
          if (cells.length > 0) tableRows.push(cells);
          i++;
        }
        
        elements.push(
          <div key={`table-${i}`} className="my-6 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-[11px] md:text-xs text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    {tableRows[0]?.map((cell, idx) => (
                      <th key={idx} className="py-3 px-4 font-bold text-black uppercase tracking-wider text-[9px] whitespace-nowrap">{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tableRows.slice(1).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      {row.map((cell, cidx) => (
                        <td key={cidx} className="py-3 px-4 text-slate-600 font-medium leading-relaxed">{parseInlines(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
        continue;
      }

      if (trimmedLine.startsWith('```')) {
        const language = trimmedLine.slice(3).trim();
        let code = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          code += lines[i] + '\n';
          i++;
        }
        elements.push(<CodeBlock key={i} code={code.trim()} language={language} />);
        i++;
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-lg md:text-2xl font-black mb-4 mt-8 text-black tracking-tight leading-none border-b border-slate-100 pb-2 uppercase">{parseInlines(line.substring(2))}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-md md:text-xl font-bold mb-4 mt-6 text-black tracking-tight leading-tight">{parseInlines(line.substring(3))}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-sm md:text-lg font-bold mb-3 mt-4 text-black tracking-tight">{parseInlines(line.substring(4))}</h3>);
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        elements.push(<li key={i} className="ml-5 mb-2 list-disc text-slate-700 leading-relaxed font-medium text-[13px] md:text-sm">{parseInlines(trimmedLine.substring(2))}</li>);
      } else if (trimmedLine === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(<p key={i} className="mb-4 last:mb-0 leading-relaxed text-[13px] md:text-sm text-slate-700 font-medium">{parseInlines(line)}</p>);
      }
      i++;
    }

    return elements;
  };

  const parseInlines = (lineText: string) => {
    const parts = lineText.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      let content = part;
      let style = "";
      if (part.startsWith('**') && part.endsWith('**')) {
        content = part.slice(2, -2);
        style = "font-bold text-black";
      } else if (part.startsWith('*') && part.endsWith('*')) {
        content = part.slice(1, -1);
        style = "italic text-slate-500";
      } else if (part.startsWith('`') && part.endsWith('`')) {
        content = part.slice(1, -1);
        return <code key={i} className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded font-mono text-[9px] md:text-[10px] border border-slate-200">{content}</code>;
      }
      return <span key={i} className={style}>{content}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-8 lg:space-y-12 custom-scrollbar scroll-smooth">
        {history.length === 0 && !streamingMessage && !isGenerating && (
          <div className="h-full flex items-center justify-center text-center px-8 opacity-20 pointer-events-none select-none">
            <div className="space-y-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-2xl mx-auto flex items-center justify-center">
                <div className="w-4 h-4 md:w-5 md:h-5 bg-white"></div>
              </div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em]">System Idle</p>
            </div>
          </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className="max-w-4xl mx-auto flex flex-col animate-in fade-in duration-500">
            <div className="flex items-center space-x-2 mb-3">
              <span className={`text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] ${msg.role === 'user' ? 'text-slate-300' : 'text-black'}`}>
                {msg.role === 'user' ? 'Input' : 'Jarvis'}
              </span>
              <div className={`h-[1px] flex-1 ${msg.role === 'user' ? 'bg-slate-50' : 'bg-slate-100'}`}></div>
            </div>
            
            <div className={`transition-all duration-300 ${msg.role === 'user' ? 'opacity-70' : ''}`}>
              {msg.imageUrl && (
                <div className="relative mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm group/img">
                  <img src={msg.imageUrl} alt="Generated Asset" className="w-full h-auto" />
                  <button onClick={() => handleDownload(msg.imageUrl!)} className="absolute top-2 md:top-3 right-2 md:right-3 p-1.5 md:p-2 bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 text-slate-600 hover:text-black hover:bg-white transition-all transform hover:scale-105 active:scale-95" title="Download Asset">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
                  </button>
                </div>
              )}
              {renderMarkdown(msg.content)}

              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Verified Grounding Protocol</span>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingSources.map((source, idx) => (
                      <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-900 hover:text-white transition-all">
                        {source.title || 'Grounding Node'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'assistant' && (
              <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-slate-50">
                <button onClick={() => handleCopy(msg.content)} className="flex items-center space-x-1 px-1.5 py-1 text-slate-400 hover:text-black hover:bg-slate-50 rounded transition-all" title="Copy">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  <span className="text-[8px] font-bold uppercase tracking-widest">Copy</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {streamingMessage && (
          <div className="max-w-4xl mx-auto flex flex-col animate-in fade-in duration-200">
             <div className="flex items-center space-x-2 mb-3">
               <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-black">Jarvis</span>
               <div className="h-[1px] flex-1 bg-slate-100"></div>
             </div>
             <div className="text-[13px] md:text-sm text-slate-700 leading-relaxed font-medium">
                {renderMarkdown(streamingMessage)}
             </div>
          </div>
        )}

        {isGenerating && !streamingMessage && (
          <div className="max-w-4xl mx-auto flex items-center space-x-2 py-4">
            <div className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-black rounded-full animate-bounce"></div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">Deep-Scanning Workspace...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-3 md:px-6 py-4 border-t border-slate-50 bg-white/80 backdrop-blur-xl sticky bottom-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center space-x-2 md:space-x-3">
          <div className="flex-1 relative">
            <input 
              className="w-full bg-slate-50 border border-transparent rounded-xl px-4 py-2.5 text-[13px] md:text-sm focus:ring-1 focus:ring-slate-100 focus:bg-white focus:border-slate-100 transition-all outline-none shadow-sm placeholder:text-slate-300 font-medium"
              placeholder="Query Jarvis..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button type="button" onClick={onOpenVoice} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-black hover:bg-slate-100 transition-all active:scale-95 border border-transparent hover:border-slate-200 shadow-sm" title="Voice Protocol">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          <button type="submit" className="p-2.5 bg-black text-white rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 shadow-md active:scale-95" disabled={isGenerating}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
