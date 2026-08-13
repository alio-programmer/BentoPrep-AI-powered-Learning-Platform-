import { useEffect, useRef, useState } from 'react';
import { Send, Square, Sparkles, BookOpen, RefreshCw, FileText, CreditCard } from 'lucide-react';
import api from '../api/client.js';
import { Button, Card, Loading, PageHeader, Badge, Spinner, Select, cn } from '../components/ui.jsx';
import { fmt } from '../lib/markdown.jsx';
import { useChatPersistence } from '../lib/useChatPersistence.js';
import { SavedChats } from '../components/SavedChats.jsx';

const MODE_COLORS = {
  hint: 'ok',
  socratic: 'info',
  explain: 'warn',
  review: 'danger',
  interviewer: 'accent',
};

function Message({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm',
          isUser ? 'bg-accent text-white' : 'border border-line bg-surface-2'
        )}
      >
        {isUser ? content : fmt(content)}
      </div>
    </div>
  );
}

export default function Tutor() {
  const [modes, setModes] = useState({});
  const [mode, setMode] = useState('hint');
  const [hasKey, setHasKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState([]);
  const [cards, setCards] = useState([]);
  const [contextType, setContextType] = useState('');
  const [contextId, setContextId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const chat = useChatPersistence('tutor');

  const topicKey =
    contextType && contextId ? `${mode}:${contextType}:${contextId}` : mode;

  const loadChat = async (key) => {
    const msgs = await chat.loadThread(key);
    if (msgs) setMessages(msgs);
  };

  useEffect(() => {
    (async () => {
      try {
        const [{ data: t }, p, c] = await Promise.all([
          api.get('/tutor'),
          api.get('/problems?limit=50'),
          api.get('/cards'),
        ]);
        setModes(t.modes || {});
        setHasKey(t.hasKey);
        setProblems(p.data.problems || []);
        setCards(c.data.cards || []);
      } finally {
        setLoading(false);
        const msgs = await chat.loadThread('hint');
        if (msgs) setMessages(msgs);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const switchMode = (m) => {
    setMode(m);
    setContextType('');
    setContextId('');
    setMessages([]);
    setError('');
    loadChat(m);
  };

  const changeContextType = (v) => {
    setContextType(v);
    setContextId('');
    setMessages([]);
    setError('');
    loadChat(mode);
  };

  const changeContextId = (v) => {
    setContextId(v);
    setMessages([]);
    setError('');
    loadChat(v ? `${mode}:${contextType}:${v}` : mode);
  };

  const selectSaved = async (key) => {
    const [m, ctype, cid] = key.split(':');
    setMode(m || mode);
    setContextType(ctype === 'problem' || ctype === 'card' ? ctype : '');
    setContextId(ctype === 'problem' || ctype === 'card' ? cid || '' : '');
    setMessages([]);
    setError('');
    loadChat(key);
  };

  const newChat = () => {
    setMessages([]);
    setError('');
  };

  const deleteChat = async (key) => {
    await chat.deleteThread(key);
    setMessages([]);
    setError('');
  };

  const send = async (text) => {
    const content = text || input;
    if (!content.trim() || busy) return;
    const next = [...messages, { role: 'user', content: content.trim() }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data } = await api.post(
        '/tutor/chat',
        {
          mode,
          message: content.trim(),
          history: messages.slice(-10),
          problemId: contextType === 'problem' && contextId ? contextId : null,
          cardId: contextType === 'card' && contextId ? contextId : null,
        },
        { signal: controller.signal }
      );
      const final = [...next, { role: 'assistant', content: data.reply }];
      setMessages(final);
      chat.saveThread({ topicKey, label: modes[mode]?.label || mode, messages: final });
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        setError(err.response?.data?.error || 'AI request failed.');
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  if (loading) return <Loading />;

  const modeList = Object.entries(modes);

  return (
    <div>
      <PageHeader
        title="AI Tutor"
        subtitle="Hint, Socratic, Explain, Code Review and Interviewer modes powered by your AI key."
      />

      {!hasKey && (
        <Card className="mb-5 flex items-start gap-3 border-warn/40 bg-warn-soft/40 p-4">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-warn" />
          <div>
            <p className="text-sm font-semibold">Add your AI key to unlock the tutor</p>
            <p className="mt-0.5 text-xs text-muted">
              Go to <a href="/settings" className="font-medium text-accent underline">Settings → AI Provider</a> to add your DeepSeek / OpenAI API key.
            </p>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {modeList.map(([key, meta]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
              mode === key ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-accent/40 hover:text-ink'
            )}
          >
            {meta.label}
          </button>
        ))}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <Select value={contextType} onChange={(e) => changeContextType(e.target.value)} className="w-40">
          <option value="">No context</option>
          <option value="problem">DSA problem</option>
          <option value="card">Memory card</option>
        </Select>
        {contextType === 'problem' && (
          <Select value={contextId} onChange={(e) => changeContextId(e.target.value)} className="min-w-[240px] flex-1">
            {problems.length === 0 ? (
              <option value="">No problems yet — add one in DSA Problems</option>
            ) : (
              <>
                <option value="">Select a problem…</option>
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </>
            )}
          </Select>
        )}
        {contextType === 'card' && (
          <Select value={contextId} onChange={(e) => changeContextId(e.target.value)} className="min-w-[240px] flex-1">
            {cards.length === 0 ? (
              <option value="">No cards yet — add a DSA problem first</option>
            ) : (
              <>
                <option value="">Select a card…</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.front_title}</option>
                ))}
              </>
            )}
          </Select>
        )}
        {contextType === 'problem' && contextId && <Badge color="info"><FileText className="size-3" /> Problem context</Badge>}
        {contextType === 'card' && contextId && <Badge color="info"><CreditCard className="size-3" /> Card context</Badge>}
      </Card>

      <Card className="flex h-[520px] flex-col overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Sparkles className="size-4 text-accent" />
          <p className="text-sm font-semibold">
            {modes[mode]?.label || 'AI Tutor'}
            {modes[mode]?.blurb && <Badge className="ml-2" color={MODE_COLORS[mode] || 'accent'}>{modes[mode].blurb}</Badge>}
          </p>
          <div className="ml-auto">
            <SavedChats
              sessions={chat.sessions}
              currentKey={topicKey}
              onSelect={selectSaved}
              onNew={newChat}
              onDelete={deleteChat}
              disabled={busy}
            />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Sparkles className="size-8 text-accent/60" />
              <div>
                <p className="text-sm font-semibold">{modes[mode]?.label}</p>
                <p className="mt-1 max-w-sm text-xs text-muted">{modes[mode]?.blurb}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {(modes[mode]?.prompts || []).map((p) => (
                  <Button key={p} size="sm" variant="secondary" onClick={() => send(p)} disabled={busy || !hasKey}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)
          )}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Spinner className="size-3.5" /> Thinking…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-xs text-danger">
              <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={hasKey ? `Ask the tutor (${modes[mode]?.label || mode})…` : 'Add an AI key in Settings to chat'}
              disabled={!hasKey || busy}
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-50"
            />
            <Button
              onClick={() => (busy ? stop() : send())}
              disabled={!hasKey || (!busy && !input.trim())}
              variant={busy ? 'danger' : 'primary'}
              className="h-[52px]"
            >
              {busy ? <Square className="size-3.5" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
