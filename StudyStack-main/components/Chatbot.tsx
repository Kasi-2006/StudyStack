import React, { useState } from 'react';
import { X } from 'lucide-react';
import ResearchAssistant from './ResearchAssistant';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);

  return (
    <>
      {/* Floating Alex Assistant Widget */}
      {!isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-auto select-none">
          {/* White Speech Bubble */}
          {showBubble && (
            <div
              onClick={() => setIsOpen(true)}
              className="relative mb-2 sm:mb-3 cursor-pointer group animate-alex-float"
            >
              <div className="bg-white/95 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl shadow-indigo-900/10 border border-purple-100 max-w-[150px] xs:max-w-[180px] sm:max-w-[230px] transition-all duration-300 group-hover:shadow-2xl group-hover:scale-105 group-hover:border-purple-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBubble(false);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-slate-100 hover:bg-purple-100 text-slate-400 hover:text-purple-600 rounded-full flex items-center justify-center transition-colors shadow-sm text-[10px] sm:text-xs"
                  title="Dismiss message"
                  aria-label="Dismiss speech bubble"
                >
                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>

                <p className="text-[11px] sm:text-sm font-bold text-slate-800 flex items-center gap-1 leading-tight">
                  <span>Hi! I'm Alex</span>
                  <span className="inline-block animate-alex-wave text-xs sm:text-base">👋</span>
                </p>
                <p className="text-[9px] sm:text-xs text-indigo-600 font-semibold leading-snug mt-0.5 sm:mt-1">
                  How can I help you today?
                </p>
              </div>

              {/* Speech Bubble Pointer Arrow */}
              <div className="absolute -bottom-2 right-6 sm:right-10 w-0 h-0 border-l-[6px] sm:border-l-[7px] border-l-transparent border-r-[6px] sm:border-r-[7px] border-r-transparent border-t-[7px] sm:border-t-[8px] border-t-white drop-shadow-sm"></div>
            </div>
          )}

          {/* Alex Full Character Floating Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative group focus:outline-none transition-all duration-300 animate-alex-float"
            title="Chat with Alex"
            aria-label="Open AI Assistant Alex"
          >
            {/* Soft Shadow Glow Aura behind full Alex figure */}
            <div className="absolute inset-0 bg-purple-500/25 blur-xl rounded-full scale-90 group-hover:bg-purple-500/45 group-hover:blur-2xl transition-all duration-500"></div>

            {/* Full Alex Character Image */}
            <div className="relative w-16 xs:w-20 sm:w-36 md:w-40 h-auto transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
              <img
                src="/alex.png"
                alt="Alex AI Assistant"
                className="w-full h-auto object-contain filter drop-shadow-2xl transition-transform duration-500 group-hover:brightness-105"
              />
            </div>
          </button>
        </div>
      )}

      {/* Fixed Right-Side Copilot Assistant Panel */}
      <div
        className={`fixed top-0 right-0 h-screen h-full w-full sm:w-[380px] md:w-[410px] lg:w-[430px] z-[90] bg-white border-l border-slate-200/90 shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
      >
        <ResearchAssistant onBack={() => setIsOpen(false)} />
      </div>
    </>
  );
};

export default Chatbot;

