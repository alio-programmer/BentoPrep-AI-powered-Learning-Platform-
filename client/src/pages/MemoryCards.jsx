import { useEffect, useRef, useState } from 'react';
import { RefreshCw, PartyPopper, Pencil, CreditCard, Layers, XCircle, Sparkles, Square } from 'lucide-react';
import api from '../api/client.js';
import FlashCard from '../components/FlashCard.jsx';
import {
  Card, Button, Badge, Loading, EmptyState, Modal, Input, Textarea,
  PageHeader, Spinner, cn,
} from '../components/ui.jsx';
import { fmt } from '../lib/markdown.jsx';

const AI_ACTIONS = [
  { key: 'explain', label: 'Explain', mode: 'explain', msg: 'Explain this memory card / pattern in detail.' },
  { key: 'variation', label: 'Variation', mode: 'hint', msg: 'Give me a harder variation of this problem to practice.' },
];

export default function MemoryCards() {
  const [mode, setMode] = useState('due');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasKey, setHasKey] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAction, setAiAction] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiError, setAiError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    api.get('/tutor').then(({ data }) => setHasKey(data.hasKey)).catch(() => setHasKey(false));
  }, []);

  const runAi = async (action) => {
    const card = cards[index];
    if (!card || aiBusy) return;
    setAiAction(action.key);
    setAiReply('');
    setAiError('');
    setAiBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data } = await api.post(
        '/tutor/chat',
        {
          mode: action.mode,
          message: action.msg,
          history: [],
          cardId: card.id,
        },
        { signal: controller.signal }
      );
      setAiReply(data.reply);
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        setAiError(err.response?.data?.error || 'AI request failed.');
      }
    } finally {
      setAiBusy(false);
      abortRef.current = null;
    }
  };

  const stopAi = () => abortRef.current?.abort();

  const fetchCards = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(mode === 'due' ? '/cards?due=true' : '/cards');
      setCards(data.cards);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [mode]);

  const review = async (outcome) => {
    const card = cards[index];
    if (!card) return;
    try {
      await api.post(`/cards/${card.id}/review`, { outcome });
      if (index + 1 < cards.length) setIndex(index + 1);
      else {
        setCards(cards.filter((_, i) => i !== index));
        setIndex(0);
      }
    } catch {}
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/cards/${editing.id}`, {
        notes: editing.notes,
        tags: editing.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      });
      setCards((c) => c.map((x) => (x.id === data.card.id ? { ...x, notes: data.card.notes, tags: data.card.tags } : x)));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const current = cards[index];

  return (
    <div>
      <PageHeader
        title="Memory Cards"
        subtitle="Spaced repetition keeps your solutions fresh."
        actions={
          <div className="flex rounded-lg border border-line bg-surface p-0.5">
            <button
              onClick={() => setMode('due')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium', mode === 'due' ? 'bg-accent text-white' : 'text-muted hover:text-ink')}
            >
              Due now
            </button>
            <button
              onClick={() => setMode('all')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium', mode === 'all' ? 'bg-accent text-white' : 'text-muted hover:text-ink')}
            >
              All cards
            </button>
          </div>
        }
      />

      {loading ? (
        <Loading />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={mode === 'due' ? PartyPopper : CreditCard}
          title={mode === 'due' ? 'Nothing due right now' : 'No memory cards yet'}
          subtitle={
            mode === 'due'
              ? 'Great job staying on top of your reviews. Check back later or switch to see all cards.'
              : 'Add a solved problem and its memory card is created automatically.'
          }
          action={
            mode === 'all' ? (
              <Button onClick={fetchCards}>
                <RefreshCw className="size-4" /> Refresh
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Card {index + 1} of {cards.length}
            </span>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
            </div>
          </div>

          <FlashCard card={current} />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="danger" onClick={() => review('forgotten')}>
              <XCircle className="size-4" /> Forgotten
            </Button>
            <Button variant="outline" onClick={() => review('difficult')}>
              <Layers className="size-4" /> Difficult
            </Button>
            <Button variant="ok" onClick={() => review('remembered')}>
              <PartyPopper className="size-4" /> Remembered
            </Button>
            <Button variant="ghost" onClick={() => setEditing({ ...current, tags: (current.tags || []).join(', ') })}>
              <Pencil className="size-4" /> Edit
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-4">
            {AI_ACTIONS.map((a) => (
              <Button
                key={a.key}
                variant={aiAction === a.key && aiBusy ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => (aiAction === a.key && aiBusy ? stopAi() : runAi(a))}
                disabled={!hasKey || (aiBusy && aiAction !== a.key)}
              >
                {aiAction === a.key && aiBusy ? <Square className="size-3.5" /> : <Sparkles className="size-3.5" />}
                {aiAction === a.key && aiBusy ? 'Stop' : a.label}
              </Button>
            ))}
            {hasKey === false && <span className="text-[11px] text-muted">Add an AI key in Settings</span>}
          </div>

          {aiBusy && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <Spinner className="size-3.5" /> Thinking…
            </div>
          )}
          {aiError && <p className="text-center text-xs text-danger">{aiError}</p>}
          {aiReply && (
            <Card className="border-line bg-surface-2 text-sm">{fmt(aiReply)}</Card>
          )}

          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted">Due in:</span>
              <Badge color="accent">day {Math.max(1, Math.round((new Date(current.due_date) - new Date()) / 86400000) + 1)}</Badge>
              {current.status && <Badge color="info">{current.status}</Badge>}
              {(current.tags || []).map((t) => (
                <Badge key={t}>#{t}</Badge>
              ))}
              {current.notes && <span className="w-full text-xs text-muted">{current.notes}</span>}
            </div>
          </Card>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit memory card">
        <form onSubmit={saveEdit} className="space-y-3">
          <Input label="Title" value={editing?.front_title || ''} disabled />
          <Input
            label="Tags (comma separated)"
            value={editing?.tags || ''}
            onChange={(e) => setEditing((c) => ({ ...c, tags: e.target.value }))}
          />
          <Textarea
            label="Notes"
            value={editing?.notes || ''}
            onChange={(e) => setEditing((c) => ({ ...c, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />} Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
