import { useEffect, useState } from 'react';
import { CalendarRange, Check, Plus, RefreshCw, Code2, Database, FileText, ChevronDown, BookOpen, ListChecks, Target, Users } from 'lucide-react';
import api from '../api/client.js';
import {
  Button, Card, Loading, EmptyState, Modal, Select, Input, Badge, PageHeader, cn,
} from '../components/ui.jsx';

const TYPE_META = {
  new: { label: 'New', cell: 'bg-info-soft text-info border-info', dot: 'bg-info' },
  revision: { label: 'Revision', cell: 'bg-warn-soft text-warn border-warn', dot: 'bg-warn' },
  assessment: { label: 'Assessment', cell: 'bg-danger-soft text-danger border-danger', dot: 'bg-danger' },
  concept: { label: 'Concept', cell: 'bg-ok-soft text-ok border-ok', dot: 'bg-ok' },
  mock: { label: 'Mock', cell: 'bg-accent-soft text-accent border-accent', dot: 'bg-accent' },
};

const TYPE_ICON = {
  new: ListChecks,
  revision: RefreshCw,
  assessment: Target,
  concept: BookOpen,
  mock: Users,
};

function difficultyBadge(difficulty) {
  if (difficulty === 'Easy') return <Badge color="ok">{difficulty}</Badge>;
  if (difficulty === 'Medium') return <Badge color="warn">{difficulty}</Badge>;
  if (difficulty === 'Hard') return <Badge color="danger">{difficulty}</Badge>;
  return <Badge>{difficulty || ''}</Badge>;
}

export default function Roadmap() {
  const [track, setTrack] = useState('dsa');
  const [roadmap, setRoadmap] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState(() => new Set());
  const [generating, setGenerating] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [form, setForm] = useState({ duration_days: 45, level: 'Intermediate', target: 'FAANG', daily_availability: '2 hours' });

  const fetchData = async (t = track) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/roadmap?track=${t}`);
      setRoadmap(data.roadmap);
      setDays(data.days);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(track);
  }, [track]);

  const openModal = async () => {
    setOpen(true);
    if (track === 'resume') {
      try {
        const { data } = await api.get('/resumes');
        setResumes(data.resumes);
        setResumeId((id) => id || data.resumes[0]?.id || '');
      } catch {
        setResumes([]);
      }
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post('/roadmap', track === 'resume'
        ? { track, resumeId, duration_days: form.duration_days, daily_availability: form.daily_availability }
        : { ...form, track, ai: useAi });
      await fetchData(track);
      setOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleDone = async (day) => {
    const next = day.status === 'done' ? 'pending' : 'done';
    setDays((d) => d.map((x) => (x.id === day.id ? { ...x, status: next } : x)));
    try {
      await api.put(`/roadmap/days/${day.id}`, { status: next });
    } catch {
      setDays((d) => d.map((x) => (x.id === day.id ? { ...x, status: day.status } : x)));
    }
  };

  const toggleWeek = (wi) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(wi)) next.delete(wi);
      else next.add(wi);
      return next;
    });
    setExpanded(null);
  };

  if (loading) return <Loading />;

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const doneCount = days.filter((d) => d.status === 'done').length;

  return (
    <div>
      <PageHeader
        title="Roadmap"
        subtitle={roadmap ? `${roadmap.duration_days}-day plan · ${roadmap.target} · ${roadmap.level || 'Resume-based'}` : 'Your personalized preparation calendar.'}
        actions={
          <Button onClick={openModal} size="lg">
            <RefreshCw className="size-4" /> {roadmap ? 'Regenerate' : 'Generate roadmap'}
          </Button>
        }
      />

      <div className="mb-4 flex w-fit rounded-xl border border-line bg-surface p-1">
        <button
          onClick={() => setTrack('dsa')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            track === 'dsa' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          <Code2 className="size-4" /> DSA Roadmap
        </button>
        <button
          onClick={() => setTrack('sql')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            track === 'sql' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          <Database className="size-4" /> SQL Roadmap
        </button>
        <button
          onClick={() => setTrack('resume')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
            track === 'resume' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          <FileText className="size-4" /> Resume Roadmap
        </button>
      </div>

      {roadmap && (
        <Card className="mb-5 flex flex-wrap items-center gap-4 p-4">
          <div>
            <p className="text-xs text-muted">Progress</p>
            <p className="text-lg font-bold">{days.length ? Math.round((doneCount / days.length) * 100) : 0}%</p>
          </div>
          <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${days.length ? (doneCount / days.length) * 100 : 0}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <span key={k} className={cn('flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium', v.cell)}>
                <span className={cn('size-1.5 rounded-full', v.dot)} /> {v.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {!roadmap ? (
        <EmptyState
          icon={CalendarRange}
          title={track === 'sql' ? 'No SQL roadmap yet' : track === 'resume' ? 'No resume roadmap yet' : 'No roadmap yet'}
          subtitle={track === 'sql'
            ? 'Generate a SQL preparation plan from basic SELECTs through joins, window functions and advanced SQL.'
            : track === 'resume'
              ? 'Upload a resume, then generate an AI-personalized interview-prep calendar based on your skills, target role and job description.'
              : 'Generate a personalized preparation plan based on your target, level and available time.'}
          action={<Button onClick={openModal}><Plus className="size-4" /> Generate {track === 'sql' ? 'SQL' : track === 'resume' ? 'resume' : ''} roadmap</Button>}
        />
      ) : (
        <div className="space-y-6">
          {weeks.map((week, wi) => {
            const weekDone = week.filter((d) => d.status === 'done').length;
            const isCollapsed = collapsedWeeks.has(wi);
            return (
              <Card key={wi} className="p-0 overflow-hidden">
                <button
                  onClick={() => toggleWeek(wi)}
                  className="flex w-full items-center justify-between gap-2 border-b border-line bg-surface-2/50 px-5 py-3 text-left transition-colors hover:bg-surface-2"
                  aria-expanded={!isCollapsed}
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <span className="flex size-6 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-white">
                      {wi + 1}
                    </span>
                    Week {wi + 1}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted">
                      {weekDone}/{week.length} days done
                    </span>
                    <ChevronDown className={cn('size-4 text-muted transition-transform', !isCollapsed && 'rotate-180')} />
                  </div>
                </button>

                {!isCollapsed && (
                  <ul className="divide-y divide-line">
                  {week.map((day) => {
                    const meta = TYPE_META[day.type] || TYPE_META.new;
                    const Icon = TYPE_ICON[day.type] || ListChecks;
                    const isDone = day.status === 'done';
                    const isExpanded = expanded === day.id;
                    return (
                      <li key={day.id}>
                        <div
                          className={cn(
                            'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors',
                            isDone ? 'bg-ok/5' : 'hover:bg-surface-2/40'
                          )}
                        >
                          <button
                            onClick={() => toggleDone(day)}
                            className={cn(
                              'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                              isDone ? 'border-ok bg-ok text-white' : 'border-line text-transparent hover:border-ok hover:text-ok/40'
                            )}
                            title="Toggle done"
                          >
                            <Check className="size-4" />
                          </button>

                          <div
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                              isDone ? 'border-ok/30 bg-ok/10 text-ok' : 'border-line bg-surface-2 text-muted'
                            )}
                          >
                            <Icon className="size-4.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', meta.cell)}>
                                {meta.label}
                              </span>
                              <span className="text-[11px] font-semibold text-muted">Day {day.day_number}</span>
                            </div>
                            <p className={cn('mt-1 text-sm font-medium leading-snug', isDone && 'text-muted line-through')}>
                              {day.title}
                            </p>
                            {(day.tasks || []).length > 0 && (
                              <p className="mt-0.5 text-[11px] text-muted">
                                {day.tasks.length} task{day.tasks.length === 1 ? '' : 's'}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => setExpanded(isExpanded ? null : day.id)}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                            <ChevronDown className={cn('size-3.5 transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-line bg-bg/40 px-5 py-4">
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {(day.tasks || []).map((t, i) => (
                                <li key={i} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5">
                                  <span className="mt-0.5 text-accent">•</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs leading-snug">{t.name}</p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      {t.topic && <Badge>{t.topic}</Badge>}
                                      {t.difficulty && difficultyBadge(t.difficulty)}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Generate ${track === 'sql' ? 'SQL' : track === 'resume' ? 'Resume' : ''} roadmap`} width="max-w-md">
        <div className="space-y-3">
          <Select label="Duration" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}>
            <option value={15}>15 days</option>
            <option value={30}>30 days</option>
            <option value={45}>45 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </Select>
          {track === 'resume' ? (
            <>
              <Select label="Resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.length === 0 ? (
                  <option value="">No resumes — upload one first</option>
                ) : (
                  resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.target_role ? ` · ${r.target_role}` : ''}</option>
                  ))
                )}
              </Select>
              <p className="text-[11px] text-muted">
                The AI builds a personalized plan from your resume, target role and any pasted job description. An AI key is required.
              </p>
            </>
          ) : (
            <>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted">Generation</span>
                <div className="flex w-fit rounded-lg border border-line bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setUseAi(true)}
                    className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-all', useAi ? 'bg-accent text-white' : 'text-muted hover:text-ink')}
                  >
                    AI generated
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseAi(false)}
                    className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-all', !useAi ? 'bg-accent text-white' : 'text-muted hover:text-ink')}
                  >
                    Standard
                  </button>
                </div>
                {useAi && <p className="mt-1 text-[11px] text-muted">Uses your AI key for a fresh, varied plan. Standard uses the curated problem bank.</p>}
              </div>
              <Select label="Current level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
              </Select>
              <Select label="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}>
                {track === 'sql'
                  ? <><option>General SQL</option><option>Data Analyst</option><option>Backend Engineer</option><option>Data Engineer</option></>
                  : (
                    <>
                      <option>General DSA</option><option>FAANG</option><option>Product Companies</option><option>Startup</option>
                      {['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Uber', 'Adobe'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </>
                  )}
              </Select>
            </>
          )}
          <Select label="Daily availability" value={form.daily_availability} onChange={(e) => setForm({ ...form, daily_availability: e.target.value })}>
            <option>30 minutes</option><option>1 hour</option><option>2 hours</option><option>3+ hours</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={generating || (track === 'resume' && !resumeId)}>
              {generating ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
