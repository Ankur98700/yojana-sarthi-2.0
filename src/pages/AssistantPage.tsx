import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  MessageSquareText,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiRequest } from '../lib/api.ts';
import type { ChatMessageRecord, ChatSourceRef } from '../types/index.ts';

const SUGGESTED_QUESTIONS = [
  'Which government schemes are available for college students?',
  'What schemes are available for farmers in Uttar Pradesh?',
  'What documents are required for a housing scheme?',
  'How do I apply for a scholarship?',
  'Which schemes support women entrepreneurs?',
  'Why was I marked potentially eligible?',
];

export function AssistantPage() {
  const {
    dbUser,
    activeProfile,
    navigate,
    prefillAssistantQuestion,
    consumePrefillQuestion,
    notify,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [useUserProfile, setUseUserProfile] = useState<boolean>(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Load persisted chat history for authenticated users
  useEffect(() => {
    if (!dbUser) return;
    let active = true;
    setLoadingHistory(true);
    apiRequest<{ messages: ChatMessageRecord[] }>('/api/assistant/history')
      .then((res) => {
        if (active && res.messages.length > 0) {
          setMessages(res.messages);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [dbUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? input).trim();
    if (!query || sending) return;

    const userMsg: ChatMessageRecord = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      sources: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setSending(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiRequest<{
        reply: string;
        sources: ChatSourceRef[];
        mode: 'gemini' | 'database_fallback';
        notice?: string;
        createdAt: string;
      }>('/api/assistant/chat', {
        method: 'POST',
        body: {
          message: query,
          history: historyPayload,
          useUserProfile,
          guestProfile: useUserProfile && !dbUser ? activeProfile : undefined,
        },
      });

      const assistantMsg: ChatMessageRecord = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        sources: res.sources ?? [],
        mode: res.mode,
        notice: res.notice,
        createdAt: res.createdAt,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unable to reach Yojana Mitra right now.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an error while answering your question: ${errMsg}. Please try again or use the Explore Schemes page.`,
          sources: [],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (prefillAssistantQuestion) {
      const q = prefillAssistantQuestion;
      consumePrefillQuestion();
      setInput(q);
    }
  }, [prefillAssistantQuestion, consumePrefillQuestion]);

  const clearHistory = async () => {
    if (dbUser) {
      try {
        await apiRequest('/api/assistant/history', { method: 'DELETE' });
        notify('Chat history cleared.', 'info');
      } catch {
        notify('Could not clear server chat history.', 'error');
        return;
      }
    }
    setMessages([]);
  };

  const hasProfileToShare = Boolean(
    (dbUser?.profile && Object.keys(dbUser.profile).length > 1) ||
      Object.keys(activeProfile).length > 0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-medium text-[#138A55] mb-1">Grounded Scheme Assistant</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B65] tracking-tight">
            Yojana Mitra
          </h1>
          <p className="text-sm text-[#475467] mt-1">
            Your Government Scheme Guide. Answers are retrieved from verified scheme records with official source links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#172B4D] bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={useUserProfile}
              disabled={!hasProfileToShare}
              onChange={(e) => setUseUserProfile(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#123B65]"
            />
            <span>
              {hasProfileToShare
                ? 'Use my saved profile context'
                : 'Complete eligibility profile to personalize'}
            </span>
          </label>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => void clearHistory()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#667085] hover:text-rose-700 bg-white border border-slate-200 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-[540px] max-h-[72vh]">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {loadingHistory ? (
            <p className="text-sm text-[#667085]">Loading your conversation history...</p>
          ) : messages.length === 0 ? (
            <div className="py-6 space-y-6">
              <div className="max-w-xl">
                <div className="w-10 h-10 rounded-lg bg-[#123B65]/10 text-[#123B65] flex items-center justify-center mb-3">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <h2 className="font-display text-lg font-semibold text-[#172B4D]">
                  Ask Yojana Mitra about Indian Government Welfare Schemes
                </h2>
                <p className="text-sm text-[#475467] mt-1 leading-relaxed">
                  Every response retrieves verified scheme records from the Yojana Sarthi database and provides official government URLs. We never submit applications on your behalf.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#667085] mb-3">Suggested Questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      className="text-left p-3.5 text-sm text-[#172B4D] bg-[#F5F7FA] hover:bg-slate-200/70 border border-slate-200 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-[11px] font-medium text-[#667085] mb-1 px-1">
                  {msg.role === 'user' ? 'You' : 'Yojana Mitra'}
                </span>

                <div
                  className={`max-w-2xl rounded-xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#123B65] text-white'
                      : 'bg-[#F5F7FA] border border-slate-200 text-[#172B4D]'
                  }`}
                >
                  {msg.notice && (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                      <span>{msg.notice}</span>
                    </div>
                  )}
                  {msg.content}
                </div>

                {/* Source References under Assistant Reply */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 max-w-2xl w-full space-y-1.5">
                    <p className="text-[11px] font-semibold text-[#667085] px-1">
                      Verified Database Sources Referenced:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.slice(0, 4).map((src) => (
                        <div
                          key={src.schemeId}
                          className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => navigate(`/schemes/${src.slug}`)}
                            className="font-medium text-[#123B65] hover:underline text-left"
                          >
                            {src.schemeName}
                          </button>
                          <a
                            href={src.officialSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Official source for ${src.schemeName}`}
                            className="text-[#138A55] hover:text-[#0F7347]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-medium text-[#667085] mb-1 px-1">
                Yojana Mitra
              </span>
              <div className="bg-[#F5F7FA] border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#667085]">
                Checking verified scheme records and preparing your answer...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="border-t border-slate-200 p-4 bg-white rounded-b-xl"
        >
          <div className="flex items-center gap-2.5">
            <label htmlFor="mitra-input" className="sr-only">
              Ask Yojana Mitra a question
            </label>
            <input
              id="mitra-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about scholarships, farmer schemes, housing documents, or eligibility rules..."
              className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-[#123B65]"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2C4D] rounded-lg disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#667085]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#138A55] shrink-0" />
            <span>
              Do not share Aadhaar numbers, PAN, OTPs, or bank account numbers in chat.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
