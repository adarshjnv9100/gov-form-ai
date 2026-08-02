import React, { useEffect, useRef } from 'react';

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

  useEffect(() => {
    // Ensure the ElevenLabs widget script is loaded only once
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }
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
      {/* Target & position ElevenLabs widget */}
      <style>{`
        elevenlabs-convai {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 9998;
        }
        @media (min-width: 640px) {
          elevenlabs-convai {
            bottom: 24px;
            right: 24px;
          }
        }
      `}</style>

      {/* Official ElevenLabs Custom Element */}
      <elevenlabs-convai
        ref={widgetRef as any}
        agent-id={AGENT_ID}
      />

      {/* Custom Floating Action Button */}
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
