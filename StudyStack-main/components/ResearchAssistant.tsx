import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { queryLocalKnowledgeBase } from '../services/localKnowledgeBase';
import {
  Send,
  Sparkles,
  Globe,
  ExternalLink,
  Loader2,
  User,
  Trash2,
  Database,
  FileText,
  Download,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  X,
  BookOpen,
  Search,
  HelpCircle,
  FileCheck,
  Image as ImageIcon
} from 'lucide-react';

interface ResearchAssistantProps {
  onBack: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  sources?: { title: string; uri: string }[];
  files?: { id: string; name: string; url: string; unit?: string; category: string }[];
}

const ResearchAssistant: React.FC<ResearchAssistantProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Alex 👋\nHow can I help you today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Alex is thinking...');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to detect whether user's input requests AI image / diagram / flowchart generation
  const isImageGenerationRequest = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    const patterns = [
      /\b(generate|create|draw|make|show|render|produce|build)\b.*\b(image|diagram|flowchart|visualization|illustration|picture|photo|figure|visual|chart|graphic|infographic)\b/,
      /\b(image|diagram|flowchart|visualization|illustration|picture|graphic|infographic|visual)\b.*\b(of|for|explaining|showing|about|depicting)\b/,
      /\bvisual(ize|ization)\b/,
      /\bdraw\s+a\b/,
      /\bdraw\s+an\b/,
      /\bvisual\s+explanation\b/,
      /\bvisual\s+diagram\b/,
      /\beducational\s+image\b/
    ];
    return patterns.some(pattern => pattern.test(lower));
  };

  // Suggested actions list
  const suggestedActions = [
    { label: "Find study materials", query: "Find study materials for my subjects", icon: BookOpen, color: "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100" },
    { label: "Search previous papers", query: "Search previous year question papers", icon: Search, color: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100" },
    { label: "Explain a topic", query: "Explain a key academic concept to me", icon: HelpCircle, color: "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100" },
    { label: "Help with assignments", query: "Help me find assignment resources", icon: FileCheck, color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100" },
  ];

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const executeLibrarySearch = async (subject: string, category: string, unit?: string, rawQuery?: string) => {
    try {
      const files = await api.searchLibrary(subject, category, unit, rawQuery);
      return files?.map((f: any) => ({
        id: f.id,
        name: f.file_name,
        url: f.file_url,
        unit: f.unit_no,
        category: f.category,
        subject_name: f.subject_name,
        matchLevel: f.matchLevel || 1
      })) || [];
    } catch (err) {
      console.error("Library Search Error:", err);
      return [];
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    // Handle Image Generation Requests via backend OpenAI API endpoint
    if (isImageGenerationRequest(query)) {
      setLoadingStatus('Alex is creating your image...');
      try {
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: query })
        });

        const data = await response.json();

        if (response.ok && data.image_url) {
          const imageMsg: Message = {
            role: 'assistant',
            type: 'image',
            content: `Here is the requested visualization for "${query}":`,
            imageUrl: data.image_url
          };
          setMessages(prev => [...prev, imageMsg]);
          speak("Here is your requested visualization.");
        } else {
          const errorMsg: Message = {
            role: 'assistant',
            type: 'text',
            content: "I couldn't generate the image right now. Please try again."
          };
          setMessages(prev => [...prev, errorMsg]);
          speak("I couldn't generate the image right now. Please try again.");
        }
      } catch (err) {
        console.error("Image generation API request failed:", err);
        const errorMsg: Message = {
          role: 'assistant',
          type: 'text',
          content: "I couldn't generate the image right now. Please try again."
        };
        setMessages(prev => [...prev, errorMsg]);
        speak("I couldn't generate the image right now. Please try again.");
      } finally {
        setIsLoading(false);
        setLoadingStatus('Alex is thinking...');
      }
      return;
    }

    setLoadingStatus('Alex is thinking...');

    const apiKey = (
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_API_KEY ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.API_KEY) ||
      ''
    ).trim();

    if (!apiKey || apiKey.includes('YOUR_GEMINI_API_KEY')) {
      // Fallback to Local Knowledge Base if API key is not configured
      const localResult = await queryLocalKnowledgeBase(query);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: localResult.content,
        files: localResult.files
      }]);
      speak(localResult.content);
      setIsLoading(false);
      return;
    }

    try {
      // Filter out initial assistant greeting so contents array strictly starts with a 'user' message
      const historyOnly = messages.filter(m => m.role === 'user' || m.role === 'assistant');
      const firstUserIndex = historyOnly.findIndex(m => m.role === 'user');
      const conversationHistory = firstUserIndex !== -1 ? historyOnly.slice(firstUserIndex) : [];

      const formattedContents = conversationHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Append current user message
      formattedContents.push({
        role: 'user',
        parts: [{ text: query }]
      });

      const systemInstruction = {
        parts: [{ text: "You are Alex, a friendly and helpful AI Study Assistant for StudyStack. If the user asks for notes, assignments, lab manuals, or question papers, call the search_library tool. Answer questions clearly and concisely." }]
      };

      const toolsPayload = [
        {
          functionDeclarations: [
            {
              name: "search_library",
              description: "Search internal academic database for PDF study materials, notes, assignments, or question papers.",
              parameters: {
                type: "OBJECT",
                properties: {
                  subject: { type: "STRING", description: "Subject or module name e.g. Python, Cloud Computing" },
                  category: { type: "STRING", description: "Category: Assignments, Notes, Lab Resources, or Previous Year Question Papers" },
                  unit: { type: "STRING", description: "Unit number e.g. Unit 1" }
                },
                required: ["subject", "category"]
              }
            }
          ]
        }
      ];

      // Active Gemini models supported by Google AI API
      const modelsToTry = [
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
        'gemini-2.5-pro'
      ];

      let resData: any = null;
      let lastErrText = '';

      for (const modelName of modelsToTry) {
        // Attempt 1: With function tools and systemInstruction
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction,
              contents: formattedContents,
              tools: toolsPayload
            })
          });

          const json = await res.json();
          if (res.ok && json.candidates && json.candidates.length > 0) {
            resData = json;
            break;
          } else if (json.error) {
            lastErrText = json.error.message || `API Error (${res.status})`;
          }
        } catch (e: any) {
          lastErrText = e.message;
        }

        // Attempt 2: Direct text prompt fallback without tools
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction,
              contents: formattedContents
            })
          });

          const json = await res.json();
          if (res.ok && json.candidates && json.candidates.length > 0) {
            resData = json;
            break;
          }
        } catch (e: any) {
          console.warn(`Fallback fetch failed for model ${modelName}`);
        }
      }

      if (!resData || !resData.candidates || resData.candidates.length === 0) {
        console.warn("Gemini API request failed:", lastErrText, "- falling back to Local Knowledge Base");
        const localResult = await queryLocalKnowledgeBase(query);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: localResult.content,
          files: localResult.files
        }]);
        speak(localResult.content);
        setIsLoading(false);
        return;
      }

      const candidate = resData.candidates[0];
      const parts = candidate.content?.parts || [];
      let newAssistantMessages: any[] = [];

      for (const part of parts) {
        if (part.text) {
          newAssistantMessages.push({
            role: 'assistant',
            content: part.text
          });
          speak(part.text);
        }

        if (part.functionCall) {
          const { name, args } = part.functionCall;
          if (name === 'search_library') {
            const foundFiles = await executeLibrarySearch(args.subject, args.category, args.unit, query);

            if (foundFiles.length > 0) {
              const isExact = foundFiles[0].matchLevel === 1;
              const subjText = foundFiles[0].subject_name || args.subject || 'requested';
              const unitText = args.unit ? ` for ${args.unit}` : '';

              let responseText = '';
              if (isExact) {
                responseText = `I found **${foundFiles.length} ${subjText}** resource(s) (${args.category || 'Study Material'}${unitText}):`;
              } else {
                responseText = `I couldn't find an exact ${unitText ? unitText : ''} ${args.category || 'resource'}, but I found these related **${subjText}** resources:`;
              }

              newAssistantMessages.push({
                role: 'assistant',
                content: responseText,
                files: foundFiles
              });
              speak(responseText);
            } else {
              const failText = `I searched the library for **${args.subject || 'study materials'}**, but I couldn't find matching uploaded files.`;
              newAssistantMessages.push({
                role: 'assistant',
                content: failText
              });
              speak(failText);
            }
          }
        }
      }

      if (newAssistantMessages.length === 0) {
        const localResult = await queryLocalKnowledgeBase(query);
        newAssistantMessages.push({
          role: 'assistant',
          content: localResult.content,
          files: localResult.files
        });
        speak(localResult.content);
      }

      setMessages(prev => [...prev, ...newAssistantMessages]);

    } catch (error: any) {
      console.warn("Gemini API error, using Local Knowledge Base fallback:", error);
      const localResult = await queryLocalKnowledgeBase(query);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: localResult.content,
        files: localResult.files
      }]);
      speak(localResult.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden">
      {/* Side Panel Header */}
      <div className="px-5 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 rounded-xl bg-purple-50 p-0.5 shadow-xs shrink-0 flex items-center justify-center border border-purple-100">
            <img
              src="/alex.png"
              alt="Alex Avatar"
              className="w-full h-full object-contain"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base leading-tight flex items-center gap-1.5">
              Alex
              <Sparkles className="w-4 h-4 text-purple-600" />
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Study Assistant</p>
          </div>
        </div>

        {/* Header Actions & Close Button */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl transition-colors ${isMuted ? 'text-red-500 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100'
              }`}
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              setMessages([{ role: 'assistant', content: "Hi! I'm Alex 👋\nHow can I help you today?" }]);
            }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors ml-1"
            title="Close Assistant Panel"
            aria-label="Close Assistant Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'assistant' ? (
              <div className="w-8 h-8 rounded-xl bg-purple-50 p-0.5 shrink-0 shadow-xs border border-purple-100 flex items-center justify-center">
                <img src="/alex.png" alt="Alex" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm text-xs font-bold">
                <User className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              {msg.content && (
                <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium shadow-xs border ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-xs'
                    : 'bg-white text-slate-800 border-slate-200/80 rounded-tl-xs'
                  }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              )}

              {/* Display Generated Image */}
              {msg.imageUrl && (
                <div className="mt-2.5 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-900/5 group relative max-w-full">
                  <img
                    src={msg.imageUrl}
                    alt={msg.content || "Generated visualization"}
                    className="w-full h-auto max-h-[400px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                  />
                  <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Alex AI Visual
                    </span>
                    <a
                      href={msg.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      View Full Image <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Display Initial Suggested Actions when only initial welcome message exists */}
              {idx === 0 && messages.length === 1 && (
                <div className="pt-3 space-y-2 animate-in fade-in duration-300">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Suggested Questions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedActions.map((action, aIdx) => {
                      const IconComponent = action.icon;
                      return (
                        <button
                          key={aIdx}
                          onClick={() => handleSendMessage(action.query)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold transition-all shadow-2xs hover:shadow-xs text-left ${action.color}`}
                        >
                          <IconComponent className="w-4 h-4 shrink-0" />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Display Database Files */}
              {msg.files && msg.files.length > 0 && (
                <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-2xl space-y-2 text-left">
                  <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Library Assets Found
                  </p>
                  <div className="space-y-1.5">
                    {msg.files.map((file, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{file.name}</p>
                            {file.unit && <p className="text-[9px] text-slate-500 font-bold uppercase">{file.unit}</p>}
                          </div>
                        </div>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Display Web Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl space-y-2 text-left">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Research References
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-100 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        <span className="truncate max-w-[180px]">{source.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shrink-0 animate-pulse">
              <img src="/alex.png" alt="Alex" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-xs border border-slate-200 flex items-center gap-2.5 text-xs text-slate-500 font-bold shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>{loadingStatus}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Message Input Footer */}


      {/* Fixed Message Input Footer */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Alex anything..."
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 placeholder:text-slate-400 transition-all"
            />

            {/* Voice Input Button */}
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
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
                }`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all disabled:opacity-40 disabled:bg-slate-300 shadow-md shadow-purple-200 shrink-0"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 font-semibold mt-2">
          Powered by Alex • Press Enter to send
        </p>
      </div>
    </div>
  );
};

export default ResearchAssistant;

