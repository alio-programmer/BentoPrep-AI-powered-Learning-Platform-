import { useEffect, useState } from 'react';
import { Sparkles, Square, BookOpen, CheckCircle2, XCircle, RefreshCw, ListChecks } from 'lucide-react';
import api from '../api/client.js';
import { Button, Card, Loading, PageHeader, Badge, Spinner, Select, cn } from '../components/ui.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];
const COUNT_OPTIONS = [5, 10];

function difficultyBadge(d) {
  if (d === 'Easy') return <Badge color="ok">{d}</Badge>;
  if (d === 'Hard') return <Badge color="danger">{d}</Badge>;
  return <Badge color="warn">{d}</Badge>;
}

export default function Quiz() {
  const [tracks, setTracks] = useState({});
  const [hasKey, setHasKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState('dsa');
  const [topic, setTopic] = useState('Mixed');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: t }, s] = await Promise.all([api.get('/quiz'), api.get('/tutor')]);
        setTracks(t.tracks || {});
        setHasKey(s.data.hasKey);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectTrack = (t) => {
    setTrack(t);
    setTopic(tracks[t]?.topics?.at(-1) || 'Mixed');
    setQuestions(null);
    setAnswers({});
    setSubmitted(false);
  };

  const generate = async () => {
    setGenerating(true);
    setError('');
    setQuestions(null);
    setAnswers({});
    setSubmitted(false);
    try {
      const { data } = await api.post('/quiz', { track, topic, count });
      setQuestions(data.questions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz.');
    } finally {
      setGenerating(false);
    }
  };

  const choose = (qi, ai) => {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qi]: ai }));
  };

  const score = questions ? questions.filter((q, i) => answers[i] === q.answer).length : 0;

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Daily Pop Quiz"
        subtitle="5 or 10 AI-generated questions to test your recall and keep your memory sharp."
        actions={
          questions ? (
            <Button onClick={generate} size="lg" variant="secondary">
              <RefreshCw className="size-4" /> New quiz
            </Button>
          ) : undefined
        }
      />

      {!hasKey && (
        <Card className="mb-5 flex items-start gap-3 border-warn/40 bg-warn-soft/40 p-4">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-warn" />
          <div>
            <p className="text-sm font-semibold">Add your AI key to unlock quizzes</p>
            <p className="mt-0.5 text-xs text-muted">
              Go to <a href="/settings" className="font-medium text-accent underline">Settings → AI Provider</a> to add your DeepSeek / OpenAI API key.
            </p>
          </div>
        </Card>
      )}

      {!questions && (
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">Track</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(tracks).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => selectTrack(key)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      track === key ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-accent/40 hover:text-ink'
                    )}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Select label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {(tracks[track]?.topics || []).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Select label="Questions" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {COUNT_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c} questions</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generate} disabled={generating || !hasKey} className="w-full">
                {generating ? <Spinner /> : <Sparkles className="size-4" />}
                {generating ? 'Generating…' : 'Generate quiz'}
              </Button>
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </Card>
      )}

      {generating && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-4" /> Crafting your questions…
        </div>
      )}

      {questions && !generating && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <ListChecks className="size-5 text-accent" />
              <div>
                <p className="text-sm font-semibold">
                  {submitted ? `Score: ${score}/${questions.length}` : `${questions.length} questions · ${tracks[track]?.label} · ${topic}`}
                </p>
                <p className="text-[11px] text-muted">
                  {submitted
                    ? score === questions.length ? 'Perfect score!' : 'Review the explanations below.'
                    : 'Select one answer per question, then check your results.'}
                </p>
              </div>
            </div>
            {!submitted ? (
              <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < questions.length}>
                <CheckCircle2 className="size-4" /> Check answers
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => { setSubmitted(false); setAnswers({}); }}>
                <RefreshCw className="size-4" /> Retry
              </Button>
            )}
          </Card>

          {questions.map((q, qi) => (
            <Card key={qi} className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold leading-snug">
                  <span className="mr-1.5 text-muted">Q{qi + 1}.</span>
                  {q.question}
                </p>
                <div className="flex items-center gap-2">
                  {difficultyBadge(q.difficulty)}
                  {submitted && (
                    answers[qi] === q.answer
                      ? <Badge color="ok"><CheckCircle2 className="size-3" /> Correct</Badge>
                      : <Badge color="danger"><XCircle className="size-3" /> Incorrect</Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, ai) => {
                  const selected = answers[qi] === ai;
                  const isCorrect = ai === q.answer;
                  let cls = 'border-line text-muted hover:border-accent/50';
                  if (!submitted) {
                    if (selected) cls = 'border-accent bg-accent-soft text-accent';
                  } else {
                    if (isCorrect) cls = 'border-ok bg-ok/10 text-ok';
                    else if (selected && !isCorrect) cls = 'border-danger bg-danger-soft text-danger';
                    else cls = 'border-line text-muted opacity-60';
                  }
                  return (
                    <button
                      key={ai}
                      onClick={() => choose(qi, ai)}
                      disabled={submitted}
                      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-all', cls)}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                        {LETTERS[ai]}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-xs text-muted">
                  <span className="font-semibold text-ink">Explanation:</span> {q.explanation}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
