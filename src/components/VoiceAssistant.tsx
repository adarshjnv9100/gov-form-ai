import React, { useEffect, useRef, useState } from 'react';

// Declare custom element for TypeScript compatibility
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'agent-id'?: string;
        },
        HTMLElement
      >;
    }
  }
}

const AGENT_ID = 'agent_8401kz1c32h8f0frj6bfprx3dg5e';
const SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

export const VoiceAssistant: React.FC = () => {
  const widgetRef = useRef<HTMLElement | null>(null);
  const [bothWidgetsLoaded, setBothWidgetsLoaded] = useState(false);

  useEffect(() => {
    // 1. Ensure the ElevenLabs widget script is loaded only once
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }

    // 2. Detect if Chatbase widget is also loaded in DOM
    const detectWidgets = () => {
      const chatbaseElement =
        document.getElementById('chatbase-bubble-button') ||
        document.getElementById('chatbase-bubble-window') ||
        document.querySelector('iframe[src*="chatbase.co"]') ||
        document.querySelector('iframe[id*="chatbase"]');

      if (chatbaseElement) {
        setBothWidgetsLoaded(true);
      }
    };

    detectWidgets();
    const interval = setInterval(detectWidgets, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenConversation = () => {
    const el = widgetRef.current || (document.querySelector('elevenlabs-convai') as HTMLElement);
    if (!el) return;

    // Trigger open on ElevenLabs widget shadow root button or element
    if (el.shadowRoot) {
      const actionBtn =
        el.shadowRoot.querySelector('button') ||
        el.shadowRoot.querySelector('[role="button"]') ||
        el.shadowRoot.querySelector('.widget-button');
      if (actionBtn) {
        (actionBtn as HTMLElement).click();
        return;
      }
    }
    el.click();
  };

  return (
    <>
      {/* Layout & vertical stack positioning CSS rules for corner bubbles */}
      <style>{`
        /* 1. Chatbase Widget (Top of vertical stack) */
        #chatbase-bubble-button,
        .chatbase-bubble-button {
          position: fixed !important;
          bottom: 215px !important;
          right: 16px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          z-index: 9997 !important;
        }

        /* Chatbase open chat window */
        #chatbase-bubble-window,
        iframe[src*="chatbase.co"],
        iframe[id*="chatbase"] {
          z-index: 10000 !important;
        }

        @media (min-width: 640px) {
          #chatbase-bubble-button,
          .chatbase-bubble-button {
            bottom: 225px !important;
            right: 24px !important;
          }
        }

        /* 2. ElevenLabs Custom Element (Middle of vertical stack) */
        elevenlabs-convai {
          position: fixed !important;
          bottom: 76px !important;
          right: 16px !important;
          z-index: 9998 !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          display: block !important;
        }

        @media (min-width: 640px) {
          elevenlabs-convai {
            bottom: 84px !important;
            right: 24px !important;
          }
        }
      `}</style>

      {/* Official ElevenLabs Custom Element */}
      <elevenlabs-convai
        ref={widgetRef as any}
        agent-id={AGENT_ID}
      />

      {/* 3. Custom Floating Action Button for ElevenLabs Voice Assistant (Bottom of vertical stack) */}
      <button
        type="button"
        onClick={handleOpenConversation}
        aria-label="Talk to AI Assistant"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-sm sm:text-base border border-white/20 cursor-pointer"
      >
        <span className="text-lg">🎤</span>
        <span>AI से बात करें</span>
      </button>
    </>
  );
};
