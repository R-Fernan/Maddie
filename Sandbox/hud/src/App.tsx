import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Cpu, HardDrive, Activity, Send, Terminal, PanelLeftClose, PanelLeftOpen, Volume2, VolumeX } from 'lucide-react';
import { SYSTEM_CONFIG } from './config/speechConfig';

const API_BASE_URL = `http://${window.location.hostname || 'localhost'}:5000`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TelemetryData {
  cpuUsage: number;
  ramUsage: number;
  ramUsedGB: string;
  ramTotalGB: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineStatus, setEngineStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    cpuUsage: 0,
    ramUsage: 0,
    ramUsedGB: '0',
    ramTotalGB: '0',
  });
  const [heartbeat, setHeartbeat] = useState('-------');
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(SYSTEM_CONFIG.tts.enabled);

  const [availableSystemVoices, setAvailableSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load browser speech synthesis voices in background
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableSystemVoices(voices);
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Socket.IO and Engine Status Lifecycle
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    axios.get(`${API_BASE_URL}/api/status`)
      .then(res => setEngineStatus(res.data.status))
      .catch(() => setEngineStatus('OFFLINE'));

    socket.on('telemetry', (data: TelemetryData) => {
      setTelemetry(data);
    });
    socket.on('heartbeat', (value: string) => {
      setHeartbeat(value);
    });

    return () => {
      socket.off('telemetry');
      socket.off('heartbeat');
      socket.disconnect();
    };
  }, []);

  const prepareSpeechText = (text: string) => {
    return text
      .replace(/M\.A\.D\.D\.I\.E\.?/gi, 'Maddie')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#]/g, '')
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D]/gu, '')
      .trim();
  };

  const speak = (text: string) => {
    if (!isSpeechEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = prepareSpeechText(text);

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = availableSystemVoices.length > 0 
      ? availableSystemVoices 
      : window.speechSynthesis.getVoices();

    const matchedVoice = voices.find((v) => v.name === SYSTEM_CONFIG.tts.defaultVoiceKey) ||
      voices.find((v) => v.name.toLowerCase().includes('google') && v.lang.replace('_', '-').includes('en-US')) ||
      voices.find((v) => v.lang.replace('_', '-').startsWith('en-US')) ||
      voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.rate = SYSTEM_CONFIG.tts.rate;
    utterance.pitch = SYSTEM_CONFIG.tts.pitch;
    utterance.volume = SYSTEM_CONFIG.tts.volume;

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;

    const userMsg: Message = { role: 'user', content: inputPrompt };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsGenerating(true);

    let assistantResponse = '';

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: SYSTEM_CONFIG.api.defaultModel,
          messages: updatedMessages,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`Chat request failed with status ${response.status}`);
      if (!response.body) throw new Error('No readable stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pendingLine = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = `${pendingLine}${chunk}`.split('\n');
        pendingLine = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const token = parsed.message?.content || '';
              assistantResponse += token;

              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assistantResponse };
                return next;
              });
            } catch {
              // Ignore partial stream chunks
            }
          }
        }
      }

      if (pendingLine.trim()) {
        const parsed = JSON.parse(pendingLine);
        assistantResponse += parsed.message?.content || '';
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantResponse };
          return next;
        });
      }

      if (assistantResponse) speak(assistantResponse);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown chat error';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `[ERROR]: ${detail}` },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-obsidian text-silver overflow-hidden p-2 md:p-4 gap-2 md:gap-4 font-sans">
      
      {/* SIDEBAR PANEL */}
      <div className={`transition-all duration-300 ease-in-out bg-graphite border border-frost rounded-lg p-4 flex flex-col justify-between ${
        isSidebarOpen ? 'w-full md:w-80 h-auto md:h-full' : 'w-full md:w-16 h-16 md:h-full items-center'
      }`}>
        
        {/* Sidebar Header & Toggle */}
        <div>
          <div className={`flex items-center pb-3 border-b border-frost mb-4 ${
            isSidebarOpen ? 'justify-between' : 'justify-center'
          }`}>
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-white" />
                <span className="font-bold text-white tracking-wider">M.A.D.D.I.E.</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSpeechEnabled(enabled => {
                      if (enabled && 'speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      return !enabled;
                    });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={isSpeechEnabled ? 'Disable speech' : 'Enable speech'}
                  aria-label={isSpeechEnabled ? 'Disable speech' : 'Enable speech'}
                >
                  {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button onClick={() => setIsSidebarOpen(true)} title="Expand Panel" className="text-white hover:text-silver">
                <Terminal className="w-6 h-6" />
              </button>
            )}

            {isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors"
                title="Collapse Panel"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Expanded Telemetry Information */}
          {isSidebarOpen && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1 font-mono">Engine Status</span>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono font-semibold ${
                  engineStatus === 'ONLINE' ? 'bg-slate/50 border-emerald-500/30 text-emerald-400' : 'bg-slate/50 border-rose-500/30 text-rose-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${engineStatus === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                  OLLAMA {engineStatus}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="space-y-2.5 font-mono">
                <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest">
                  <span className="text-gray-400">Host System Diagnostics</span>
                  <span className="text-emerald-400/80 tracking-wider" aria-label="System heartbeat">{heartbeat}</span>
                </div>

                <div className="bg-slate/40 border border-frost p-2.5 rounded">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-300"><Cpu className="w-3.5 h-3.5" /> CPU</span>
                    <span>{telemetry.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-obsidian h-1 rounded overflow-hidden">
                    <div className="bg-white h-full transition-all duration-500" style={{ width: `${telemetry.cpuUsage}%` }}></div>
                  </div>
                </div>

                <div className="bg-slate/40 border border-frost p-2.5 rounded">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-300"><HardDrive className="w-3.5 h-3.5" /> RAM</span>
                    <span>{telemetry.ramUsage}%</span>
                  </div>
                  <div className="w-full bg-obsidian h-1 rounded overflow-hidden">
                    <div className="bg-white h-full transition-all duration-500" style={{ width: `${telemetry.ramUsage}%` }}></div>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block text-right">{telemetry.ramUsedGB} / {telemetry.ramTotalGB} GB</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Collapsed Mode Quick Re-open Icon */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="hidden md:flex text-gray-400 hover:text-white mt-auto pb-2"
            title="Expand Panel"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        )}

        {/* Footer Info */}
        {isSidebarOpen && (
          <div className="hidden md:block text-[10px] font-mono border-t border-frost pt-3 text-gray-500 space-y-0.5">
            <div>MODEL: {SYSTEM_CONFIG.api.defaultModel}</div>
            <div>BASE : Gemma 2 (2B)</div>
          </div>
        )}
      </div>

      {/* MAIN NEURAL WORKSPACE */}
      <div className="flex-1 bg-graphite border border-frost rounded-lg p-3 md:p-4 flex flex-col justify-between h-full overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-frost pb-2 mb-3 flex justify-between items-center">
          <h2 className="text-xs font-semibold text-white tracking-wider flex items-center gap-2 font-mono">
            <Activity className="w-4 h-4 text-white" /> NEURAL WORKSPACE
          </h2>
          <span className="text-[10px] text-gray-500 font-mono">MSGS: {messages.length}</span>
        </div>

        {/* Chat History Container */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-600 font-mono">
              [ SYSTEM READY ]
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-gray-500 mb-0.5 uppercase font-mono">{msg.role}</span>
                <div className={`p-3 rounded-lg max-w-[90%] md:max-w-[80%] text-sm leading-relaxed border ${
                  msg.role === 'user'
                    ? 'bg-slate border-frost text-white'
                    : 'bg-obsidian border-frost text-silver font-mono'
                }`}>
                  {msg.content || <span className="animate-pulse">...</span>}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Command Line Input Bar */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder={isGenerating ? "Thinking..." : "Magtanong lang..."}
            className="flex-1 bg-obsidian border border-frost rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white disabled:opacity-50 font-sans"
          />

          <button
            type="submit"
            disabled={isGenerating || !inputPrompt.trim()}
            className="bg-slate hover:bg-frost border border-frost text-white px-4 py-2 rounded-md flex items-center gap-1.5 text-xs font-mono transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> SEND
          </button>
        </form>
      </div>
    </div>
  );
}