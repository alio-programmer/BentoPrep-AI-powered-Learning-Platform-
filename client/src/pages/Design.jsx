import { useEffect, useRef, useState } from 'react';
import { Boxes, Layout, Send, Square, Sparkles, BookOpen, RefreshCw, GraduationCap, PencilRuler } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import api from '../api/client.js';
import { Button, Card, Loading, PageHeader, Badge, Spinner, cn } from '../components/ui.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Mermaid, { isMermaidLang } from '../components/Mermaid.jsx';
import { useChatPersistence } from '../lib/useChatPersistence.js';
import { SavedChats } from '../components/SavedChats.jsx';

const QUICK_PROMPTS = {
  lld: {
    learn: [
      'Explain this concept simply with an example.',
      'How is this used in real LLD problems?',
      'Give me a code sketch of this.',
      'Quiz me on this concept.',
    ],
    practice: [
      'Explain this problem and list the key entities.',
      'Give me a class diagram for this.',
      'Walk through a solution step by step.',
      'Quiz me on this design.',
    ],
  },
  hld: {
    learn: [
      'Explain this concept simply with an example.',
      'Which real systems use this pattern?',
      'Walk through the trade-offs.',
      'Quiz me on this concept.',
    ],
    practice: [
      'What are the requirements and scale estimates?',
      'Design the high-level architecture.',
      'Walk through data flow and bottlenecks.',
      'Quiz me on this system design.',
    ],
  },
};

function inline(text, key) {
  // Render **bold**, *italic*, `code`, and _underline-ish_ inline styles.
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      parts.push(
        <code key={k++} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">{tok.slice(1, -1)}</code>
      );
    } else {
      parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span key={key}>{parts}</span>;
}

function CodeBlock({ code, language }) {
  const { dark } = useTheme();
  const lang = ['javascript', 'js', 'jsx', 'python', 'py', 'typescript', 'ts', 'tsx', 'java', 'cpp', 'c', 'go', 'ruby', 'sql', 'bash', 'json', 'html', 'css'].includes(language)
    ? language
    : 'javascript';
  return (
    <Highlight code={code} language={lang} theme={dark ? themes.nightOwl : themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="my-2 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: dark ? '#011627' : '#f6f8fa' }}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

function fmtBlock(text) {
  // Minimal markdown rendering: headings, lists, code blocks, inline styles.
  // Diagrams render as Mermaid only inside explicit ```mermaid code fences.
  const lines = text.split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let codeLang = '';

  const flushCode = (key) => {
    if (codeBuf.length) {
      const src = codeBuf.join('\n');
      out.push(
        isMermaidLang(codeLang)
          ? <Mermaid key={key} code={src} />
          : <CodeBlock key={key} code={src} language={codeLang} />
      );
      codeBuf = [];
      codeLang = '';
    }
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('```')) {
      if (inCode) {
        flushCode(`code-${i}`);
        inCode = false;
      } else {
        flushCode(`code-${i}`);
        inCode = true;
        codeLang = t.slice(3).trim();
      }
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }
    if (t.startsWith('### ')) {
      out.push(<h5 key={i} className="mt-3 mb-1 text-[13px] font-bold">{t.slice(4)}</h5>);
    } else if (t.startsWith('## ')) {
      out.push(<h4 key={i} className="mt-3 mb-1 text-sm font-bold">{t.slice(3)}</h4>);
    } else if (t.startsWith('# ')) {
      out.push(<h3 key={i} className="mt-3 mb-1 text-base font-bold">{t.slice(2)}</h3>);
    } else if (/^\d+\.\s/.test(t)) {
      const num = t.match(/^(\d+)\.\s/)[1];
      out.push(
        <div key={i} className="flex gap-2 py-0.5">
          <span className="w-4 shrink-0 text-right font-semibold text-accent">{num}.</span>
          <span>{inline(t.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      out.push(
        <div key={i} className="flex gap-1.5 py-0.5">
          <span className="text-accent">•</span>
          <span>{inline(t.slice(2))}</span>
        </div>
      );
    } else if (t.startsWith('> ')) {
      out.push(<blockquote key={i} className="my-1 border-l-2 border-accent/40 pl-2 italic text-muted">{inline(t.slice(2))}</blockquote>);
    } else if (t === '') {
      out.push(<div key={i} className="h-2" />);
    } else {
      out.push(<p key={i} className="py-0.5 leading-relaxed">{inline(t)}</p>);
    }
  });
  flushCode('code-final');
  return out;
}

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
        {isUser ? content : fmtBlock(content)}
      </div>
    </div>
  );
}

export default function Design() {
  const [mode, setMode] = useState('learn');
  const [track, setTrack] = useState('lld');
  const [topics, setTopics] = useState({ lld: [], hld: [] });
  const [curriculum, setCurriculum] = useState({ lld: [], hld: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState(null);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const chat = useChatPersistence('design');

  const topicKey = `${track}:${selected || ''}`;

  const loadChat = async (key) => {
    const msgs = await chat.loadThread(key);
    if (msgs) setMessages(msgs);
  };

  useEffect(() => {
    (async () => {
      try {
        const [{ data: t }, { data: c }, s] = await Promise.all([
          api.get('/design/topics'),
          api.get('/design/curriculum'),
          api.get('/settings/ai'),
        ]);
        setTopics(t);
        setCurriculum(c);
        setSelected(c.lld[0]?.concepts[0] || t.lld[0]?.name || null);
        setHasKey(s.data.hasKey);
      } finally {
        setLoading(false);
        const first = c.lld?.[0]?.concepts?.[0] || t.lld?.[0]?.name || '';
        const msgs = await chat.loadThread(`lld:${first}`);
        if (msgs) setMessages(msgs);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const selectTrack = (t) => {
    setTrack(t);
    setMessages([]);
    setError('');
    const first = curriculum[t]?.[0]?.concepts?.[0] || topics[t]?.[0]?.name || null;
    setSelected(first);
    loadChat(`${t}:${first || ''}`);
  };

  const chooseTopic = (name) => {
    setSelected(name);
    setMessages([]);
    setError('');
    loadChat(`${track}:${name}`);
    if (mode === 'practice' && (name === 'Your Own Problem' || name === 'Your Own Design')) {
      setInput('Help me practice this design problem: ');
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setMessages([]);
    setError('');
    const first =
      m === 'learn'
        ? curriculum[track]?.[0]?.concepts?.[0]
        : topics[track]?.[0]?.name;
    setSelected(first || null);
    loadChat(`${track}:${first || ''}`);
  };

  const selectSaved = async (key) => {
    const [tr, ...rest] = key.split(':');
    const name = rest.join(':');
    setTrack(tr || track);
    setSelected(name || null);
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
      const { data } = await api.post('/design/chat', {
        track,
        topic: selected || '',
        message: content.trim(),
        history: messages.slice(-10),
      }, { signal: controller.signal });
      const final = [...next, { role: 'assistant', content: data.reply }];
      setMessages(final);
      chat.saveThread({
        topicKey,
        label: `${track === 'lld' ? 'LLD' : 'HLD'} — ${selected || 'General'}`,
        messages: final,
      });
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

  const topicList = track === 'lld' ? topics.lld : topics.hld;

  return (
    <div>
      <PageHeader
        title="System Design Lab"
        subtitle="Learn Low-Level and High-Level design with an AI tutor that uses your own API key."
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => selectTrack('lld')}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
            track === 'lld' ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/40'
          )}
        >
          <Boxes className={cn('size-5', track === 'lld' ? 'text-accent' : 'text-muted')} />
          <div>
            <p className="text-sm font-semibold">Low-Level Design (LLD)</p>
            <p className="text-xs text-muted">Classes, patterns, SOLID, object modeling</p>
          </div>
        </button>
        <button
          onClick={() => selectTrack('hld')}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
            track === 'hld' ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/40'
          )}
        >
          <Layout className={cn('size-5', track === 'hld' ? 'text-accent' : 'text-muted')} />
          <div>
            <p className="text-sm font-semibold">High-Level Design (HLD)</p>
            <p className="text-xs text-muted">Architecture, scaling, trade-offs, data flow</p>
          </div>
        </button>
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
          Practice Design
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-[560px] overflow-y-auto p-3">
          {mode === 'learn' ? (
            <div className="space-y-4">
              {(curriculum[track] || []).map((group) => (
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
              {selected && <Badge className="ml-2" color="accent">{track === 'lld' ? 'LLD' : 'HLD'}</Badge>}
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
                  <p className="text-sm font-semibold">{mode === 'learn' ? 'Learn with the AI tutor' : 'Start designing'}</p>
                  <p className="mt-1 max-w-sm text-xs text-muted">
                    {mode === 'learn'
                      ? 'Pick a concept, then ask the AI tutor to teach it, show examples, or quiz you.'
                      : 'Pick a topic, then ask the AI tutor to explain it, walk through a design, or quiz you.'}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {(QUICK_PROMPTS[track]?.[mode] || []).map((p) => (
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
                <Spinner className="size-3.5" /> Designing…
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
                placeholder={hasKey ? `Ask about ${selected || track.toUpperCase()}…` : 'Add an AI key in Settings to chat'}
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
