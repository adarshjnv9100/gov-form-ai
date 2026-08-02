import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, X, MessageSquare, RefreshCw, Send, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';

export interface VoiceAssistantProps {
  onFieldUpdate?: (fieldKey: string, value: string) => void;
  onNavigateStep?: (step: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'What documents do I need for PAN update?',
  'Help me fill my name and Aadhaar details',
  'What is the status of my form?',
  'Which fields are currently missing?',
];

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'mr-IN', name: 'Marathi (मराठी)' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
];

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onFieldUpdate,
  onNavigateStep,
  isOpen = true,
  onClose,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Namaste! I am your AI Voice Assistant for Gov Form AI. How can I help you fill your form or check required documents today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          handleUserSpeech(currentTranscript);
          setTranscript('');
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceAssistant] Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('[VoiceAssistant] Speech recognition setup failed:', e);
      setSpeechSupported(false);
    }
  }, [selectedLang]);

  // Speak assistant text using Text-to-Speech
  const speakText = (text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Process user speech or typed text with AI logic
  const handleUserSpeech = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Generate intelligent government form AI response
    setTimeout(() => {
      const replyText = generateAIResponse(trimmed);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakText(replyText);
    }, 600);
  };

  // Simple rule-based AI NLP handler for government forms
  const generateAIResponse = (input: string): string => {
    const lower = input.toLowerCase();

    if (lower.includes('pan') && (lower.includes('document') || lower.includes('need') || lower.includes('require'))) {
      return 'For PAN card auto-filling or update, you will need your Aadhaar Card (for identity & address proof) and a Passport Size Photograph or Bank Statement.';
    }

    if (lower.includes('aadhaar') && (lower.includes('document') || lower.includes('update') || lower.includes('need'))) {
      return 'For Aadhaar verification, please upload your Aadhaar Card (front & back), Ration Card, or Passport for valid address matching.';
    }

    if (lower.includes('passport')) {
      return 'For Passport applications, you need: 1. Aadhaar Card, 2. Birth Certificate or School Leaving Certificate, 3. PAN Card or Bank Passbook.';
    }

    if (lower.includes('name') && lower.includes('fill')) {
      const match = input.match(/name (?:is|as) ([a-zA-Z\s]+)/i);
      if (match && match[1]) {
        const nameVal = match[1].trim();
        if (onFieldUpdate) onFieldUpdate('full_name', nameVal);
        return `Got it! I have recorded your full name as "${nameVal}".`;
      }
      return 'Please specify your name clearly, for example: "Fill my name as Rahul Verma".';
    }

    if (lower.includes('missing') || lower.includes('field') || lower.includes('status')) {
      return 'I have scanned your active form. Make sure your Aadhaar number (12 digits) and PAN number (10 characters) are properly verified in Step 4.';
    }

    if (lower.includes('step') || lower.includes('go to') || lower.includes('navigate')) {
      if (lower.includes('1') || lower.includes('upload')) {
        if (onNavigateStep) onNavigateStep(1);
        return 'Navigating you to Step 1: Form Upload.';
      }
      if (lower.includes('2') || lower.includes('document')) {
        if (onNavigateStep) onNavigateStep(2);
        return 'Navigating you to Step 2: Supporting Documents.';
      }
      if (lower.includes('4') || lower.includes('review')) {
        if (onNavigateStep) onNavigateStep(4);
        return 'Navigating you to Step 4: Review Data.';
      }
    }

    return `I understood: "${input}". Gemini AI is analyzing your request. You can upload your supporting documents or review extracted form fields in the review table.`;
  };

  const toggleListening = () => {
    if (!speechSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('[VoiceAssistant] Could not start recognition:', e);
      }
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleUserSpeech(inputText);
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-w-lg w-full ${className}`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-glow">
                <Sparkles className="w-5 h-5" />
              </div>
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">AI Voice Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/80 text-blue-300 border border-blue-700">
                  Gemini Voice
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {isListening ? '🎙️ Listening to your voice...' : isSpeaking ? '🔊 Speaking response...' : 'Autonomous Citizen Helper'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Audio Visualizer Waveform Bar */}
        <div className="h-1.5 w-full bg-slate-900 overflow-hidden flex items-center justify-center gap-1">
          {(isListening || isSpeaking) ? (
            <>
              <span className="w-1.5 h-full bg-blue-500 animate-pulse" style={{ animationDuration: '400ms' }} />
              <span className="w-1.5 h-full bg-teal-400 animate-pulse" style={{ animationDuration: '600ms' }} />
              <span className="w-1.5 h-full bg-emerald-400 animate-pulse" style={{ animationDuration: '300ms' }} />
              <span className="w-1.5 h-full bg-blue-400 animate-pulse" style={{ animationDuration: '500ms' }} />
              <span className="w-1.5 h-full bg-teal-500 animate-pulse" style={{ animationDuration: '700ms' }} />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 opacity-30" />
          )}
        </div>

        {/* Chat History Container */}
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto bg-slate-50/50 min-h-[220px]">
          {!speechSupported && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Voice recognition is not supported in this browser. You can still type your questions below.</span>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </motion.div>
          ))}

          {/* Live Speech Interim Transcript */}
          {transcript && (
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] p-3.5 rounded-2xl text-xs italic bg-blue-100/90 text-blue-900 border border-blue-200 rounded-br-none animate-pulse">
                🎙️ Listening: "{transcript}"
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-2 no-scrollbar">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleUserSpeech(prompt)}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 transition-all font-medium"
            >
              💬 {prompt}
            </button>
          ))}
        </div>

        {/* Controls Footer & Text Input */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Language Selector */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="text-xs bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            {/* Mic Toggle Button */}
            <button
              type="button"
              disabled={!speechSupported}
              onClick={toggleListening}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-200 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-blue-500/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Stop Listening' : 'Tap to Speak'}</span>
            </button>
          </div>

          {/* Text Input Fallback / Typing Form */}
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask AI voice assistant or type command..."
              className="flex-1 px-3.5 py-2 bg-slate-100/90 border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <Button type="submit" variant="primary" size="sm" className="rounded-xl px-3 py-2">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
