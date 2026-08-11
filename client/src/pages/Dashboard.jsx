import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Flame,
  Layers,
  Target,
  ArrowRight,
  Play,
  CreditCard,
  CalendarRange,
  Database,
  FileText,
  Plus,
  BarChart3,
  Boxes,
  Sparkles,
} from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Badge, Loading, Button, EmptyState, cn } from '../components/ui.jsx';

const TYPE_STYLES = {
  new: { label: 'New Problem', color: 'info' },
  revision: { label: 'Revision', color: 'warn' },
  assessment: { label: 'Assessment', color: 'danger' },
  concept: { label: 'Concept', color: 'ok' },
  mock: { label: 'Mock Interview', color: 'accent' },
};

function StatCard({ icon: Icon, label, value, sub, iconColor = 'text-accent' }) {
  return (
    <Card className="flex items-center gap-3.5 p-4 transition-all hover:border-line/80">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
        <Icon className={cn('size-5', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <p className="font-mono text-xl font-bold tracking-tight text-ink">{value}</p>
          {sub && <span className="font-mono text-[10px] text-muted">{sub}</span>}
        </div>
        <p className="truncate text-xs font-medium text-muted mt-0.5">{label}</p>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading your prep workspace…" />;
  if (!data) return <EmptyState title="Couldn't load dashboard" subtitle="Make sure the server is running." />;

  const {
    overview,
    streak,
    dueCards,
    roadmap,
    todayDay,
    progressPercent,
    sqlRoadmap,
    sqlTodayDay,
    sqlProgressPercent,
    resumeRoadmap,
    resumeTodayDay,
    resumeProgressPercent,
    topics,
    todayReviews,
  } = data;

  const dayNumber = todayDay?.day_number || 0;
  const totalDays = roadmap?.duration_days || 0;
  const firstName = (profile?.display_name || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const readinessScore = topics?.length
    ? Math.round(topics.reduce((s, t) => s + (t.performance || 0), 0) / topics.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header & Main CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {greeting}, {firstName}
            </h1>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-accent border border-accent/20">
              Active
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {roadmap
              ? `Day ${Math.min(dayNumber || 1, totalDays)} of ${totalDays} · ${roadmap.target || 'General DSA Track'}`
              : 'Set up your personalized roadmap to start tracking daily progress.'}
          </p>
        </div>
        <Button onClick={() => navigate('/cards')} size="md" className="shrink-0 shadow-md shadow-accent/20">
          <Play className="size-4 fill-white" /> Start Today's Session
        </Button>
      </div>

      {/* Main Roadmap Progress Bar */}
      {roadmap && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between font-mono text-xs">
            <span className="font-medium text-muted">Overall DSA Roadmap Progress</span>
            <span className="font-bold text-accent">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Problems Solved"
          value={overview?.total || 0}
          sub={`${overview?.easy || 0}E · ${overview?.medium || 0}M · ${overview?.hard || 0}H`}
        />
        <StatCard
          icon={Flame}
          label="Day Streak"
          value={`${streak?.current || 0}d`}
          sub={`Best ${streak?.longest || 0}d`}
          iconColor="text-amber-400"
        />
        <StatCard
          icon={CreditCard}
          label="Due Reviews"
          value={dueCards?.length || 0}
          sub={`${todayReviews || 0} done`}
          iconColor="text-violet-400"
        />
        <StatCard
          icon={Target}
          label="Interview Readiness"
          value={`${readinessScore}%`}
          sub="Mastery"
          iconColor="text-emerald-400"
        />
      </div>

      {/* Middle Row: Today's Plan & Due for Review */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Plan */}
        <Card className="flex flex-col justify-between h-full">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="size-4 text-accent" />
                <h2 className="text-sm font-bold text-ink">Today's Plan</h2>
              </div>
              {todayDay && (
                <Badge color={TYPE_STYLES[todayDay.type]?.color || 'accent'}>
                  {TYPE_STYLES[todayDay.type]?.label || 'Task'}
                </Badge>
              )}
            </div>

            {todayDay ? (
              <div>
                <p className="mb-3 text-xs font-semibold text-ink font-mono">{todayDay.title}</p>
                <ul className="space-y-2">
                  {(todayDay.tasks || []).map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-line/60 bg-bg p-2.5 text-xs transition-colors hover:border-line"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CheckCircle2
                          className={cn(
                            'size-4 shrink-0',
                            t.difficulty === 'Concept' ? 'text-ok' : 'text-accent'
                          )}
                        />
                        <span className="truncate text-ink font-medium">{t.name}</span>
                      </div>
                      <Badge
                        color={
                          t.difficulty === 'Easy'
                            ? 'ok'
                            : t.difficulty === 'Medium'
                            ? 'warn'
                            : t.difficulty === 'Hard'
                            ? 'danger'
                            : 'default'
                        }
                        className="ml-2 shrink-0 font-mono text-[10px]"
                      >
                        {t.difficulty}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                icon={CalendarRange}
                title="No task scheduled today"
                subtitle="Your plan is generated from your roadmap."
                action={
                  <Link to="/roadmap">
                    <Button size="sm">Create Roadmap</Button>
                  </Link>
                }
              />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line">
            <Link
              to="/roadmap"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              View full roadmap <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Card>

        {/* Due for Review */}
        <Card className="flex flex-col justify-between h-full">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-accent" />
                <h2 className="text-sm font-bold text-ink">Due for Review</h2>
              </div>
              <Link to="/cards" className="text-xs font-semibold text-accent hover:underline">
                Review all →
              </Link>
            </div>

            {!dueCards || dueCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line py-8 px-4 text-center">
                <CheckCircle2 className="size-7 text-emerald-400" />
                <p className="text-xs font-bold text-ink">All caught up!</p>
                <p className="text-[11px] text-muted">No memory cards are due right now. Great job.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {dueCards.slice(0, 4).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Circle className="size-3.5 shrink-0 text-warn" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{c.front_title}</p>
                        <p className="truncate text-[10px] text-muted font-mono">{c.pattern || 'Memory card'}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/cards')}
                      className="shrink-0 text-xs h-7 px-2.5"
                    >
                      Review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted font-mono">
            {dueCards?.length ? `${dueCards.length} cards in review queue` : 'Active recall queue clear'}
          </div>
        </Card>
      </div>

      {/* Bottom Row: 3 Equal-Height Cards (SQL Roadmap, Resume Roadmap, Quick Actions) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* SQL Track */}
        <Card className="flex flex-col justify-between h-full">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-accent" />
                <h2 className="text-sm font-bold text-ink">SQL Roadmap</h2>
              </div>
              <Link to="/roadmap" className="text-xs font-semibold text-accent hover:underline">
                View →
              </Link>
            </div>

            {sqlRoadmap ? (
              <div>
                <div className="mb-2 flex items-center justify-between font-mono text-xs">
                  <span className="truncate text-muted">{sqlRoadmap.target || 'General SQL'}</span>
                  <span className="font-bold text-accent ml-2">{sqlProgressPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2 mb-4">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${sqlProgressPercent}%` }}
                  />
                </div>

                {sqlTodayDay ? (
                  <div className="rounded-lg border border-line bg-bg p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <p className="truncate text-xs font-semibold text-ink">{sqlTodayDay.title}</p>
                      <Badge color="accent" className="shrink-0 font-mono text-[10px]">
                        Day {sqlTodayDay.day_number}
                      </Badge>
                    </div>
                    <ul className="space-y-1.5">
                      {(sqlTodayDay.tasks || []).slice(0, 3).map((t, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-muted">
                          <CheckCircle2 className="size-3 text-accent shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No SQL task scheduled for today.</p>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Database}
                title="No SQL roadmap yet"
                subtitle="Create a plan to level up your queries."
                action={
                  <Link to="/roadmap">
                    <Button size="sm">Create SQL Roadmap</Button>
                  </Link>
                }
              />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted font-mono">
            {sqlRoadmap ? `${sqlRoadmap.duration_days} Day Structured Track` : 'Unassigned'}
          </div>
        </Card>

        {/* Resume Track */}
        <Card className="flex flex-col justify-between h-full">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-accent" />
                <h2 className="text-sm font-bold text-ink">Resume Roadmap</h2>
              </div>
              <Link to="/roadmap" className="text-xs font-semibold text-accent hover:underline">
                View →
              </Link>
            </div>

            {resumeRoadmap ? (
              <div>
                <div className="mb-2 flex items-center justify-between font-mono text-xs">
                  <span className="truncate text-muted max-w-[180px]">
                    {resumeRoadmap.target || 'Resume-based Track'}
                  </span>
                  <span className="font-bold text-accent ml-2">{resumeProgressPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2 mb-4">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${resumeProgressPercent}%` }}
                  />
                </div>

                {resumeTodayDay ? (
                  <div className="rounded-lg border border-line bg-bg p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <p className="truncate text-xs font-semibold text-ink max-w-[170px]">
                        {resumeTodayDay.title}
                      </p>
                      <Badge color="accent" className="shrink-0 font-mono text-[10px]">
                        Day {resumeTodayDay.day_number}
                      </Badge>
                    </div>
                    <ul className="space-y-1.5">
                      {(resumeTodayDay.tasks || []).slice(0, 2).map((t, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-muted">
                          <CheckCircle2 className="size-3 text-accent shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted">No resume task scheduled for today.</p>
                )}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No resume roadmap yet"
                subtitle="Generate a plan built from your resume."
                action={
                  <Link to="/roadmap">
                    <Button size="sm">Create Resume Roadmap</Button>
                  </Link>
                }
              />
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted font-mono">
            {resumeRoadmap ? `${resumeRoadmap.duration_days} Day Tailored Track` : 'Unassigned'}
          </div>
        </Card>

        {/* Quick Actions Grid */}
        <Card className="flex flex-col justify-between h-full">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <h2 className="text-sm font-bold text-ink">Quick Actions</h2>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Link to="/problems/new" className="w-full">
                  <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 hover:border-accent/40">
                    <Plus className="size-3.5 text-accent" />
                    <span className="truncate">DSA Problem</span>
                  </button>
                </Link>
                <Link to="/sql/new" className="w-full">
                  <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 hover:border-accent/40">
                    <Database className="size-3.5 text-accent" />
                    <span className="truncate">SQL Problem</span>
                  </button>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link to="/design" className="w-full">
                  <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 hover:border-accent/40">
                    <Boxes className="size-3.5 text-accent" />
                    <span className="truncate">System Design</span>
                  </button>
                </Link>
                <Link to="/analytics" className="w-full">
                  <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 hover:border-accent/40">
                    <BarChart3 className="size-3.5 text-accent" />
                    <span className="truncate">Analytics</span>
                  </button>
                </Link>
              </div>

              <Link to="/settings" className="block w-full">
                <button className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 hover:border-accent/40">
                  <FileText className="size-3.5 text-accent" />
                  <span className="truncate">Manage Resumes & API Keys</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted font-mono">
            Fast Shortcuts
          </div>
        </Card>
      </div>
    </div>
  );
}
