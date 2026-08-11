import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Sparkles, Database, Square } from 'lucide-react';
import api from '../api/client.js';
import { Button, Input, Select, Textarea, Card, PageHeader, Spinner, Loading, cn } from '../components/ui.jsx';
import { fmt } from '../lib/markdown.jsx';

const TOPICS = [
  'Basic SQL', 'Joins', 'Aggregations', 'Subqueries', 'CTEs',
  'Window Functions', 'Ranking', 'Date Functions', 'Advanced SQL', 'Other',
];

const EMPTY = {
  name: '',
  topic: 'Joins',
  difficulty: 'Medium',
  url: '',
  date_solved: new Date().toISOString().slice(0, 10),
  time_taken_min: 20,
  confidence: 3,
  query: '',
  approach: '',
  mistake: '',
  explanation: '',
  complexity: '',
  tags: '',
};

export default function SqlForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/sql/${id}`)
      .then(({ data }) => {
        setForm({
          ...EMPTY,
          ...data.problem,
          date_solved: (data.problem.date_solved || '').slice(0, 10),
          tags: (data.problem.tags || []).join(', '),
        });
        if (data.problem.ai_review?.content) setReview(data.problem.ai_review.content);
      })
      .catch(() => navigate('/sql'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        time_taken_min: form.time_taken_min ? Number(form.time_taken_min) : null,
        confidence: form.confidence ? Number(form.confidence) : null,
        tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
        url: form.url || null,
      };
      if (isEdit) {
        await api.put(`/sql/${id}`, payload);
      } else {
        await api.post('/sql', payload);
      }
      navigate('/sql');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save problem.');
    } finally {
      setSaving(false);
    }
  };

  const runReview = async () => {
    if (!isEdit) {
      setError('Save the problem first, then run the AI review.');
      return;
    }
    if (!form.query?.trim()) {
      setError('Write your SQL query before requesting a review.');
      return;
    }
    setReviewing(true);
    setReviewError('');
    setReview(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data } = await api.post(`/sql/${id}/review`, {}, { signal: controller.signal });
      setReview(data.review);
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        setReviewError(err.response?.data?.error || 'AI review failed.');
      }
    } finally {
      setReviewing(false);
      abortRef.current = null;
    }
  };

  const stopReview = () => {
    abortRef.current?.abort();
  };

  if (loading) return <Loading />;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isEdit ? 'Edit SQL Problem' : 'Add SQL Problem'}
        subtitle="Log your query and get an AI review of correctness, efficiency and style."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate('/sql')}>
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
            <h2 className="mb-4 text-sm font-semibold">Details</h2>
            <div className="space-y-3">
              <Input label="Problem name *" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Find the top 3 salaries per department" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Topic" value={form.topic} onChange={(e) => set('topic', e.target.value)}>
                  {TOPICS.map((t) => <option key={t}>{t}</option>)}
                </Select>
                <Select label="Difficulty" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </Select>
              </div>
              <Input label="Problem URL" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://leetcode.com/problems/…" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date solved" type="date" value={form.date_solved} onChange={(e) => set('date_solved', e.target.value)} />
                <Input label="Time taken (min)" type="number" min="0" value={form.time_taken_min} onChange={(e) => set('time_taken_min', e.target.value)} />
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
              <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="window-functions, ranking" />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Database className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">Your SQL Query</h2>
            </div>
            <Textarea
              className="min-h-[160px] font-mono text-[13px]"
              value={form.query}
              onChange={(e) => set('query', e.target.value)}
              placeholder="SELECT …"
              spellCheck={false}
            />
            <div className="mt-3">
              <Input label="Complexity" value={form.complexity} onChange={(e) => set('complexity', e.target.value)} placeholder="e.g. O(n log n), full scan, uses index" />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Approach</h2>
              <Textarea className="min-h-[110px]" value={form.approach} onChange={(e) => set('approach', e.target.value)} placeholder="How did you structure the query? Which joins / window functions?" />
            </Card>
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Mistake I Made</h2>
              <Textarea className="min-h-[110px]" value={form.mistake} onChange={(e) => set('mistake', e.target.value)} placeholder="What tripped you up?" />
            </Card>
          </div>

          <Card>
            <h2 className="mb-2 text-sm font-semibold">Explanation</h2>
            <Textarea className="min-h-[90px]" value={form.explanation} onChange={(e) => set('explanation', e.target.value)} placeholder="Why this query works, what each clause does." />
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <h2 className="text-sm font-semibold">AI Query Review</h2>
              </div>
              <Button
                type="button"
                variant={reviewing ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => (reviewing ? stopReview() : runReview())}
                disabled={!isEdit || (!reviewing && !form.query?.trim())}
              >
                {reviewing ? <Square className="size-3.5" /> : <Sparkles className="size-3.5" />}
                {reviewing ? 'Stop' : review ? 'Re-review' : 'Review my query'}
              </Button>
            </div>
            <div className="p-5">
              {reviewing ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner className="size-4" /> Reviewing your query…
                </div>
              ) : review ? (
                <div className="space-y-1 text-sm">{fmt(review)}</div>
              ) : reviewError ? (
                <p className="text-xs text-danger">{reviewError}</p>
              ) : (
                <p className="text-xs text-muted">
                  Save the problem and add your query, then get a structured review covering correctness, efficiency, edge cases and a score.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
