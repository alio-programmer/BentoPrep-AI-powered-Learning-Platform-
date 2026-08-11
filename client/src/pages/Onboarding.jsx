import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Spinner, cn } from '../components/ui.jsx';
import api from '../api/client.js';

const ROLES = ['Software Engineer', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'Data Engineer', 'ML Engineer'];
const COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Uber', 'Adobe', 'Atlassian', 'Databricks', 'Startups', 'Any'];
const EXPERIENCE = ['Fresher', '0–2 years', '2–5 years', '5+ years'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'TypeScript'];
const HOURS = ['30 minutes', '1 hour', '2 hours', '3+ hours'];
const DAYS = [15, 30, 45, 60, 90];
const HOUR_VALUES = { '30 minutes': 0.5, '1 hour': 1, '2 hours': 2, '3+ hours': 3 };
const TOPICS = [
  'Arrays', 'Strings', 'Hashing', 'Linked Lists', 'Stack', 'Queue', 'Trees',
  'Graphs', 'Dynamic Programming', 'Greedy', 'Backtracking', 'Binary Search',
  'Sliding Window', 'Two Pointers', 'Heap', 'Trie', 'Bit Manipulation', 'Recursion',
];

function ChoicePill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line text-muted hover:border-accent/40 hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

export default function Onboarding() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    target_role: '',
    target_companies: [],
    days_target: 45,
    experience: '',
    dsa_level: '',
    pref_language: 'JavaScript',
    daily_hours: '2 hours',
    weak_topics: [],
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const canNext = () => {
    if (step === 0) return form.target_role;
    if (step === 1) return form.experience && form.dsa_level;
    return true;
  };

  const finish = async () => {
    setLoading(true);
    setError('');
    try {
      await updateProfile({ ...form, daily_hours: HOUR_VALUES[form.daily_hours] ?? form.daily_hours, onboarded: true });
      await api.post('/roadmap', {
        duration_days: form.days_target,
        level: form.dsa_level,
        target: form.target_companies[0] || 'General DSA',
        daily_availability: form.daily_hours,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all',
                  i === step ? 'w-8 bg-accent' : i < step ? 'w-4 bg-accent/50' : 'w-4 bg-line'
                )}
              />
            ))}
          </div>
          <h1 className="text-xl font-bold">
            {step === 0 && "What are you preparing for?"}
            {step === 1 && "What's your current level?"}
            {step === 2 && "Where do you need the most help?"}
          </h1>
          <p className="mt-1 text-sm text-muted">
              {step === 0 && "We'll tailor your plan to your target."}
            {step === 1 && 'This shapes difficulty and pacing.'}
            {step === 2 && 'Pick topics you want extra attention on.'}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Target role</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <ChoicePill key={r} active={form.target_role === r} onClick={() => set('target_role', r)}>
                      {r}
                    </ChoicePill>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Target companies</p>
                <div className="flex flex-wrap gap-2">
                  {COMPANIES.map((c) => (
                    <ChoicePill key={c} active={form.target_companies.includes(c)} onClick={() => toggle('target_companies', c)}>
                      {c}
                    </ChoicePill>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Days until your interview</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <ChoicePill key={d} active={form.days_target === d} onClick={() => set('days_target', d)}>
                      {d} days
                    </ChoicePill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Experience</p>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE.map((e) => (
                    <ChoicePill key={e} active={form.experience === e} onClick={() => set('experience', e)}>
                      {e}
                    </ChoicePill>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Current DSA level</p>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <ChoicePill key={l} active={form.dsa_level === l} onClick={() => set('dsa_level', l)}>
                      {l}
                    </ChoicePill>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Preferred language</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <ChoicePill key={l} active={form.pref_language === l} onClick={() => set('pref_language', l)}>
                      {l}
                    </ChoicePill>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">Daily study time</p>
                <div className="flex flex-wrap gap-2">
                  {HOURS.map((h) => (
                    <ChoicePill key={h} active={form.daily_hours === h} onClick={() => set('daily_hours', h)}>
                      {h}
                    </ChoicePill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">Weak areas (select all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <ChoicePill key={t} active={form.weak_topics.includes(t)} onClick={() => toggle('weak_topics', t)}>
                    {t}
                  </ChoicePill>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted">
                Don't worry if you're not sure yet — the plan adapts as we learn your performance.
              </p>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Continue
              </Button>
            ) : (
              <Button onClick={finish} disabled={loading}>
                {loading && <Spinner />}
                {loading ? 'Building your plan…' : 'Build my plan'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
