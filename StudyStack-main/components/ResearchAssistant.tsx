
import React, { useState, useRef, useEffect } from 'react';
import OpenAI from "openai";
import { api } from '../services/api';
import { ChevronLeft, Send, Sparkles, Globe, ExternalLink, Loader2, Bot, User, Trash2, Database, FileText, Download, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

interface ResearchAssistantProps {
  onBack: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; uri: string }[];
  files?: { id: string; name: string; url: string; unit?: string; category: string }[];
}

const ResearchAssistant: React.FC<ResearchAssistantProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Hello! I am Alex, your Academic Assistant. I can search the web for research or check our library for notes, assignments, and lab resources. How can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  const cleanTextForSpeech = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1')
               .replace(/\*(.*?)\*/g, '$1')
               .replace(/\[(.*?)\]\(.*?\)/g, '$1')
               .replace(/`/g, '');
  };

  const speak = (text: string) => {
    if (isMutedRef.current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Speak initial message on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      speak(messages[0].content);
    }, 1000);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const searchLibraryTool = {
    type: "function",
    function: {
      name: "search_library",
      description: "Search the internal academic database for specific files (PDFs). Use this when the user explicitly asks for notes, assignments, or lab manuals for a specific subject.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "The name of the subject or module (e.g., 'Python', 'Cloud Computing')."
          },
          category: {
            type: "string",
            enum: ['Assignments', 'Notes', 'Lab Resources', 'Previous Year Question Papers'],
            description: "The category to search."
          },
          unit: {
            type: "string",
            description: "The unit number if specified (e.g., 'Unit 1', 'Unit 2', 'Unit 3')."
          }
        },
        required: ["subject", "category"]
      }
    }
  };

  const executeLibrarySearch = async (subject: string, category: string, unit?: string) => {
    try {
      const files = await api.searchLibrary(subject, category, unit);
      return files?.map((f: any) => ({
        id: f.id,
        name: f.file_name,
        url: f.file_url,
        unit: f.unit_no,
        category: f.category
      })) || [];
    } catch (err) {
      console.error("Library Search Error:", err);
      return [];
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_API_KEY')) {
       setMessages(prev => [...prev, { role: 'user', content: input.trim() }]);
       const missingKeyMsg = "I'm sorry, my Academic Intelligence service is not configured (Missing OpenAI API Key). Please check your environment variables.";
       setMessages(prev => [...prev, { 
         role: 'assistant', 
         content: missingKeyMsg 
       }]);
       speak(missingKeyMsg);
       setInput('');
       return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true 
      });

      // format message history for openAI
      const chatHistory = messages
         .filter(m => m.role === 'user' || m.role === 'assistant')
         .map(m => ({
            role: m.role,
            content: m.content
         }));
      chatHistory.push({ role: 'user', content: userMessage });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are Alex, an Academic Assistant for StudyStack. If the user asks for internal files (notes, units, assignments), use the search_library tool. If you find files, mention them. Always be helpful and scholarly." },
            ...chatHistory as any
        ],
        tools: [searchLibraryTool] as any,
      });

      const messageObj = response.choices[0].message;
      let newAssistantMessages: any[] = [];

      // If the model gave a conversational response alongside or instead of a tool call
      if (messageObj.content) {
        newAssistantMessages.push({
          role: 'assistant',
          content: messageObj.content
        });
        speak(messageObj.content);
      }

      // Handle Function Calling
      if (messageObj.tool_calls && messageObj.tool_calls.length > 0) {
        const functionCall = (messageObj.tool_calls[0] as any).function;
        if (functionCall.name === 'search_library') {
          const args = JSON.parse(functionCall.arguments);
          const foundFiles = await executeLibrarySearch(args.subject, args.category, args.unit);
          
          if (foundFiles.length > 0) {
            const unitText = args.unit ? ` for ${args.unit}` : '';
            const successText = `I found ${foundFiles.length} academic resource(s) in the library for **${args.subject}** (${args.category}${unitText}):`;
            newAssistantMessages.push({ 
              role: 'assistant', 
              content: successText,
              files: foundFiles
            });
            speak(successText);
          } else {
             const failText = `I searched the library for **${args.subject}** ${args.category}, but I couldn't find any uploaded files matching your criteria.`;
             newAssistantMessages.push({ 
               role: 'assistant', 
               content: failText
             });
             speak(failText);
          }
        }
      } else if (!messageObj.content) {
        // Edge case: no content and no tool calls
        const fallbackText = "I couldn't process that request.";
        newAssistantMessages.push({
          role: 'assistant',
          content: fallbackText
        });
        speak(fallbackText);
      }

      if (newAssistantMessages.length > 0) {
         setMessages(prev => [...prev, ...newAssistantMessages]);
      }

    } catch (error: any) {
      console.error("AI Error:", error);
      const errText = error.message || "Failed to reach Alex service.";
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `System Message: ${errText}` 
      }]);
      speak(`I'm sorry, I encountered an error: ${errText}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all shadow-sm border border-slate-100">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-indigo-500" />
              Alex your Assistant
            </h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Grounded Academic Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-2xl transition-all shadow-sm border ${
              isMuted ? 'bg-red-50 text-red-500 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50'
            }`}
            title={isMuted ? "Unmute Alex" : "Mute Alex"}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => {
              window.speechSynthesis.cancel();
              setMessages([messages[0]]);
            }}
            className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
            title="Clear Conversation"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col transition-all">
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-lg ${
                msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600 border border-slate-200'
              }`}>
                {msg.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
              </div>
              
              <div className={`max-w-[80%] space-y-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.content && (
                  <div className={`inline-block px-8 py-5 rounded-[2rem] text-base leading-relaxed font-medium shadow-sm border ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                      : 'bg-slate-50 text-slate-800 border-slate-100 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                )}

                {/* Display Database Files */}
                {msg.files && msg.files.length > 0 && (
                  <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2rem] space-y-3 animate-in fade-in duration-700 text-left">
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Database className="w-3.5 h-3.5" /> Library Assets Found
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.files.map((file, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-50 shadow-sm hover:border-indigo-200 transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{file.name}</p>
                              {file.unit && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{file.unit}</p>}
                            </div>
                          </div>
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Web Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="bg-emerald-50/40 border border-emerald-100 p-6 rounded-[2rem] space-y-3 animate-in fade-in duration-700 text-left">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 mb-1">
                      <Globe className="w-3.5 h-3.5" /> Research References
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, sIdx) => (
                        <a 
                          key={sIdx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                        >
                          {source.title}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-[1.25rem] bg-slate-100 border border-slate-200 text-indigo-600 flex items-center justify-center animate-pulse">
                <Bot className="w-6 h-6" />
              </div>
              <div className="bg-slate-50 px-8 py-5 rounded-[2rem] rounded-tl-none border border-slate-100 flex items-center gap-4">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Alex is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <form onSubmit={handleSend} className="relative w-full flex gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Alex about course materials, e.g., 'Notes for Cloud Computing Unit 1'..."
                className="w-full pl-8 pr-16 py-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 font-medium text-lg placeholder:text-slate-300"
              />
              <button 
                type="button"
                onClick={() => {
                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) {
                    alert("Voice recognition is not supported in your browser.");
                    return;
                  }
                  const recognition = new SpeechRecognition();
                  recognition.lang = 'en-US';
                  recognition.onstart = () => setIsListening(true);
                  recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(transcript);
                    setIsListening(false);
                  };
                  recognition.onerror = () => setIsListening(false);
                  recognition.onend = () => setIsListening(false);
                  recognition.start();
                }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title="Voice Input"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-400 shadow-xl shadow-indigo-100 group shrink-0"
            >
              <Send className="w-8 h-8 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </form>
          <div className="flex items-center justify-center gap-6 mt-4 opacity-40">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Library Search Enabled</span>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powered by Alex (OpenAI)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchAssistant;
