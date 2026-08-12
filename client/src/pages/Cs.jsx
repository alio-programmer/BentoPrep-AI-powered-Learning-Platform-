import { useEffect, useRef, useState } from 'react';
import { Database, Network, Cpu, Send, Square, Sparkles, RefreshCw, GraduationCap, PencilRuler, BookOpen } from 'lucide-react';
import api from '../api/client.js';
import { Button, Card, Loading, PageHeader, Badge, Spinner, cn } from '../components/ui.jsx';
import { Message } from '../components/Markdown.jsx';

const SUBJECTS = {
  dbms: { label: 'Database Management Systems', short: 'DBMS', icon: Database, blurb: 'SQL, normalization, indexing, transactions' },
  cn: { label: 'Computer Networks', short: 'Computer Networks', icon: Network, blurb: 'Protocols, HTTP, DNS, load balancing, CDNs' },
  os: { label: 'Operating Systems', short: 'Operating Systems', icon: Cpu, blurb: 'Processes, scheduling, memory, concurrency' },
};

const QUICK_PROMPTS = {
  dbms: {
    learn: [
      'Explain this concept simply with an example.',
      'How is this used in real databases?',
      'Give me a SQL example of this.',
      'Quiz me on this concept.',
    ],
    practice: [
      'Walk me through this step by step.',
      'Give me a worked example.',
      'What are the common pitfalls here?',
      'Quiz me on this topic.',
    ],
  },
  cn: {
    learn: [
      'Explain this concept simply with an example.',
      'How does data actually flow here?',
      'What are the trade-offs?',
      'Quiz me on this concept.',
    ],
    practice: [
      'Walk me through this step by step.',
      'Draw an ASCII diagram of the flow.',
      'What can go wrong and how to fix it?',
      'Quiz me on this topic.',
    ],
  },
  os: {
    learn: [
      'Explain this concept simply with an example.',
      'How is this used inside a real OS?',
      'Give me a code sketch of this.',
      'Quiz me on this concept.',
    ],
    practice: [
      'Walk me through this step by step.',
      'Give me the code solution.',
      'How do I avoid the classic bugs here?',
      'Quiz me on this topic.',
    ],
  },
};

export default function Cs() {
  const [mode, setMode] = useState('learn');
  const [subject, setSubject] = useState('dbms');
  const [topics, setTopics] = useState({ dbms: [], cn: [], os: [] });
  const [curriculum, setCurriculum] = useState({ dbms: [], cn: [], os: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState(null);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: t }, { data: c }, s] = await Promise.all([
          api.get('/cs/topics'),
          api.get('/cs/curriculum'),
          api.get('/settings/ai'),
        ]);
        setTopics(t);
        setCurriculum(c);
        setSelected(c.dbms[0]?.concepts[0] || t.dbms[0]?.name || null);
        setHasKey(s.data.hasKey);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const selectSubject = (s) => {
    setSubject(s);
    setMessages([]);
    setError('');
    const first = curriculum[s]?.[0]?.concepts?.[0] || topics[s]?.[0]?.name || null;
    setSelected(first);
  };

  const chooseTopic = (name) => {
    setSelected(name);
    setMessages([]);
    setError('');
    if (mode === 'practice' && name === 'Your Own Topic') {
      setInput('Help me explore this topic: ');
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setMessages([]);
    setError('');
    const first =
      m === 'learn'
        ? curriculum[subject]?.[0]?.concepts?.[0]
        : topics[subject]?.[0]?.name;
    setSelected(first || null);
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
      const { data } = await api.post('/cs/chat', {
        subject,
        topic: selected || '',
        message: content.trim(),
        history: messages.slice(-10),
      }, { signal: controller.signal });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
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

  const subjectMeta = SUBJECTS[subject];
  const topicList = topics[subject] || [];

  return (
    <div>
      <PageHeader
        title="CS Fundamentals"
        subtitle="Master DBMS, Computer Networks and Operating Systems with an AI tutor that uses your own API key."
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {Object.entries(SUBJECTS).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <button
              key={key}
              onClick={() => selectSubject(key)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                subject === key ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/40'
              )}
            >
              <Icon className={cn('size-5 shrink-0', subject === key ? 'text-accent' : 'text-muted')} />
              <div>
                <p className="text-sm font-semibold">{meta.short}</p>
                <p className="text-xs text-muted">{meta.blurb}</p>
              </div>
            </button>
          );
        })}
      </div>

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

      <div className="mb-4 flex w-fit rounded-xl border border-line bg-surface p-1">
        <button
          onClick={() => switchMode('learn')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            mode === 'learn' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          <GraduationCap className="size-4" />
          Learn Concepts
        </button>
        <button
          onClick={() => switchMode('practice')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            mode === 'practice' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          <PencilRuler className="size-4" />
          Practice
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-[560px] overflow-y-auto p-3">
          {mode === 'learn' ? (
            <div className="space-y-4">
              {(curriculum[subject] || []).map((group) => (
                <div key={group.level}>
                  <Badge className="mb-1.5" color={group.color}>{group.level}</Badge>
                  <div className="space-y-0.5">
                    {group.concepts.map((c) => (
                      <button
                        key={c}
                        onClick={() => chooseTopic(c)}
                        className={cn(
                          'w-full rounded-lg px-3 py-1.5 text-left text-xs transition-all',
                          selected === c ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink'
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-wider text-muted uppercase">Topics</p>
              <div className="space-y-1">
                {topicList.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => chooseTopic(t.name)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left transition-all',
                      selected === t.name ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink'
                    )}
                  >
                    <span className="block text-xs font-semibold">{t.name}</span>
                    <span className="block text-[10px] text-muted/80">{t.blurb}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex h-[560px] flex-col overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Sparkles className="size-4 text-accent" />
            <p className="text-sm font-semibold">
              {selected || 'Select a topic'}
              {selected && <Badge className="ml-2" color="accent">{subjectMeta.short}</Badge>}
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <Sparkles className="size-8 text-accent/60" />
                <div>
                  <p className="text-sm font-semibold">{mode === 'learn' ? 'Learn with the AI tutor' : 'Start practicing'}</p>
                  <p className="mt-1 max-w-sm text-xs text-muted">
                    {mode === 'learn'
                      ? 'Pick a concept, then ask the AI tutor to teach it, show examples, or quiz you.'
                      : 'Pick a topic, then ask the AI tutor to walk you through it or quiz you.'}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {(QUICK_PROMPTS[subject]?.[mode] || []).map((p) => (
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
                placeholder={hasKey ? `Ask about ${selected || subjectMeta.short}…` : 'Add an AI key in Settings to chat'}
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
    </div>
  );
}
