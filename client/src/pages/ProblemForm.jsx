import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Lightbulb, AlertTriangle, GitBranch, Clock, Zap, Sparkles, Square, BookOpen } from 'lucide-react';
import api from '../api/client.js';
import { Button, Input, Select, Textarea, Card, PageHeader, Spinner, Loading, cn } from '../components/ui.jsx';
import { fmt } from '../lib/markdown.jsx';

const AI_ACTIONS = [
  { key: 'hint', label: 'Hint', mode: 'hint', msg: 'Give me a hint for solving this problem. Do not reveal the full solution.' },
  { key: 'explain', label: 'Explain', mode: 'explain', msg: 'Explain the key pattern/approach for this problem clearly.' },
  { key: 'variation', label: 'Variation', mode: 'hint', msg: 'Give me a harder variation of this problem to practice.' },
  { key: 'review', label: 'Review', mode: 'review', msg: 'Review my code for correctness, complexity, edge cases and style.' },
];

const PLATFORMS = ['LeetCode', 'Codeforces', 'HackerRank', 'GeeksForGeeks', 'Other'];
const TOPICS = [
  'Arrays', 'Strings', 'Hashing', 'Linked Lists', 'Stack', 'Queue', 'Trees',
  'Graphs', 'Dynamic Programming', 'Greedy', 'Backtracking', 'Binary Search',
  'Sliding Window', 'Two Pointers', 'Heap', 'Trie', 'Bit Manipulation', 'Recursion', 'SQL', 'Other',
];
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'SQL', 'Other'];

const EMPTY = {
  name: '',
  platform: 'LeetCode',
  url: '',
  difficulty: 'Easy',
  topic: 'Arrays',
  date_solved: new Date().toISOString().slice(0, 10),
  language: 'JavaScript',
  time_taken_min: 30,
  attempts: 1,
  solved_independently: true,
  confidence: 3,
  difficulty_experienced: 'Medium',
  how_i_solved: '',
  key_insight: '',
  mistake: '',
  why_first_failed: '',
  pattern: '',
  time_complexity: '',
  space_complexity: '',
  code: '',
  alternative_approach: '',
  when_to_use: '',
  tags: '',
};

export default function ProblemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAction, setAiAction] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiError, setAiError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/problems/${id}`)
      .then(({ data }) => {
        setForm({
          ...EMPTY,
          ...data.problem,
          date_solved: (data.problem.date_solved || '').slice(0, 10),
          tags: (data.problem.tags || []).join(', '),
        });
      })
      .catch(() => navigate('/problems'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  useEffect(() => {
    api.get('/tutor').then(({ data }) => setHasKey(data.hasKey)).catch(() => setHasKey(false));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const runAi = async (action) => {
    if (!id || aiBusy) return;
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
          problemId: id,
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

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        time_taken_min: form.time_taken_min ? Number(form.time_taken_min) : null,
        attempts: form.attempts ? Number(form.attempts) : 1,
        confidence: form.confidence ? Number(form.confidence) : null,
        tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        url: form.url || null,
      };
      if (isEdit) {
        await api.put(`/problems/${id}`, payload);
      } else {
        await api.post('/problems', payload);
      }
      navigate('/problems');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save problem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isEdit ? 'Edit Problem' : 'Add Problem'}
        subtitle="The 'How I solved it' fields power your memory cards."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/problems')}>
              <ArrowLeft className="size-4" /> Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              <Save className="size-4" /> {isEdit ? 'Save Changes' : 'Add Problem'}
            </Button>
          </>
        }
      />

      {error && <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Basics</h2>
            <div className="space-y-3">
              <Input label="Problem name *" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Two Sum" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Platform" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </Select>
                <Select label="Difficulty" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </Select>
              </div>
              <Select label="Topic" value={form.topic} onChange={(e) => set('topic', e.target.value)}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <Input label="Problem URL" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://leetcode.com/problems/two-sum/" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date solved" type="date" value={form.date_solved} onChange={(e) => set('date_solved', e.target.value)} />
                <Select label="Language" value={form.language} onChange={(e) => set('language', e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Time taken (min)" type="number" min="0" value={form.time_taken_min} onChange={(e) => set('time_taken_min', e.target.value)} />
                <Input label="Attempts" type="number" min="1" value={form.attempts} onChange={(e) => set('attempts', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Solved independently?" value={String(form.solved_independently)} onChange={(e) => set('solved_independently', e.target.value === 'true')}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
                <Select label="Difficulty experienced" value={form.difficulty_experienced} onChange={(e) => set('difficulty_experienced', e.target.value)}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </Select>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted">Confidence (1–5)</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('confidence', n)}
                      className={cn(
                        'h-9 flex-1 rounded-lg border text-sm font-semibold transition-all',
                        form.confidence === n
                          ? 'border-accent bg-accent text-white'
                          : 'border-line text-muted hover:border-accent/40'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="arrays, hashmap, classic" />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">How I solved it</h2>
            </div>
            <Textarea
              className="min-h-[100px]"
              value={form.how_i_solved}
              onChange={(e) => set('how_i_solved', e.target.value)}
              placeholder="I initially tried brute force O(n²). Then I realized…"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Pattern / Technique" value={form.pattern} onChange={(e) => set('pattern', e.target.value)} placeholder="Hash Map" />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Time complexity" value={form.time_complexity} onChange={(e) => set('time_complexity', e.target.value)} placeholder="O(n)" />
                <Input label="Space complexity" value={form.space_complexity} onChange={(e) => set('space_complexity', e.target.value)} placeholder="O(n)" />
              </div>
            </div>
            <div className="mt-3">
              <Input label="Key Insight" value={form.key_insight} onChange={(e) => set('key_insight', e.target.value)} placeholder="Store previously seen values and search for the complement." />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-danger" />
                <h2 className="text-sm font-semibold">Mistake I Made</h2>
              </div>
              <Textarea className="min-h-[90px]" value={form.mistake} onChange={(e) => set('mistake', e.target.value)} placeholder="What tripped you up?" />
            </Card>
            <Card>
              <div className="mb-2 flex items-center gap-2">
                <GitBranch className="size-4 text-warn" />
                <h2 className="text-sm font-semibold">Why My First Approach Failed</h2>
              </div>
              <Textarea className="min-h-[90px]" value={form.why_first_failed} onChange={(e) => set('why_first_failed', e.target.value)} placeholder="e.g. nested loops didn't use the complement idea" />
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Clock className="size-4 text-info" />
              <h2 className="text-sm font-semibold">Alternative Approach</h2>
            </div>
            <Textarea value={form.alternative_approach} onChange={(e) => set('alternative_approach', e.target.value)} placeholder="A different solution you could try next time." />
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Zap className="size-4 text-ok" />
              <h2 className="text-sm font-semibold">When to Use This Pattern</h2>
            </div>
            <Textarea value={form.when_to_use} onChange={(e) => set('when_to_use', e.target.value)} placeholder="Need to find two values satisfying a condition → think HashMap." />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Code</h2>
            <Textarea
              className="min-h-[180px] font-mono text-[13px]"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="// your solution"
              spellCheck={false}
            />
          </Card>

          {isEdit && (
            <Card className="p-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" />
                  <h2 className="text-sm font-semibold">AI Assistant</h2>
                </div>
              </div>
              <div className="space-y-3 p-5">
                {hasKey === false && (
                  <div className="flex items-start gap-2 rounded-lg bg-warn-soft p-3 text-xs text-warn">
                    <BookOpen className="mt-0.5 size-4 shrink-0" />
                    <span>Add your AI key in Settings to use hints, explanations and code review.</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {AI_ACTIONS.map((a) => (
                    <Button
                      key={a.key}
                      type="button"
                      size="sm"
                      variant={aiAction === a.key && aiBusy ? 'danger' : 'secondary'}
                      onClick={() => (aiAction === a.key && aiBusy ? stopAi() : runAi(a))}
                      disabled={!hasKey || (aiBusy && aiAction !== a.key)}
                    >
                      {aiAction === a.key && aiBusy ? <Square className="size-3.5" /> : <Sparkles className="size-3.5" />}
                      {aiAction === a.key && aiBusy ? 'Stop' : a.label}
                    </Button>
                  ))}
                </div>
                {aiBusy && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Spinner className="size-3.5" /> Thinking…
                  </div>
                )}
                {aiError && <p className="text-xs text-danger">{aiError}</p>}
                {aiReply && (
                  <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm">{fmt(aiReply)}</div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
