import { useEffect, useState } from 'react';
import { BarChart3, Flame, Gauge, Layers } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import api from '../api/client.js';
import { Card, Badge, Loading, EmptyState, PageHeader, cn } from '../components/ui.jsx';

const PIE_COLORS = { Easy: '#34d399', Medium: '#fbbf24', Hard: '#f87171' };

function heatColor(count) {
  if (count <= 0) return 'bg-surface-2';
  if (count === 1) return 'bg-info/30';
  if (count === 2) return 'bg-info/55';
  if (count === 3) return 'bg-info/80';
  return 'bg-info';
}

function Heatmap({ calendar }) {
  if (!calendar?.length) return null;
  // weeks columns
  const columns = [];
  for (let i = 0; i < calendar.length; i += 7) columns.push(calendar.slice(i, i + 7));
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((d) => (
              <div key={d.date} title={`${d.date}: ${d.count}`} className={cn('size-3 rounded-[3px]', heatColor(d.count))} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        Less
        {[0, 1, 2, 3, 4].map((c) => (
          <span key={c} className={cn('size-2.5 rounded-[2px]', heatColor(c))} />
        ))}
        More
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/analytics')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <EmptyState title="No analytics yet" subtitle="Solve a few problems to see your progress." />;

  const { overview, topics, streak, readiness, calendar } = data;
  const pieData = [
    { name: 'Easy', value: overview.easy },
    { name: 'Medium', value: overview.medium },
    { name: 'Hard', value: overview.hard },
  ].filter((d) => d.value > 0);

  const stats = [
    { icon: Layers, label: 'Total solved', value: overview.total },
    { icon: Flame, label: 'Current streak', value: streak.current, sub: `Longest ${streak.longest}` },
    { icon: Gauge, label: 'DSA readiness', value: `${readiness.dsa}%` },
    { icon: BarChart3, label: 'Topics tracked', value: topics.length },
  ];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Your progress, consistency and readiness at a glance." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <s.icon className="size-4" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-[11px] text-muted">{s.label}</p>
              {s.sub && <p className="text-[10px] text-muted/70">{s.sub}</p>}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Solved by difficulty</h2>
          {pieData.length === 0 ? (
            <p className="text-xs text-muted">No problems yet.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={PIE_COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex justify-center gap-3">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="size-2 rounded-full" style={{ background: PIE_COLORS[d.name] }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Topic performance</h2>
          {topics.length === 0 ? (
            <p className="text-xs text-muted">Solve problems to see topic mastery.</p>
          ) : (
            <div className="space-y-3">
              {topics.map((t) => (
                <div key={t.topic}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{t.topic}</span>
                    <span className="flex items-center gap-2 text-muted">
                      <span>{t.solved} solved</span>
                      <span className={cn('font-semibold', t.performance >= 70 ? 'text-ok' : t.performance >= 50 ? 'text-warn' : 'text-danger')}>
                        {t.performance}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        t.performance >= 70 ? 'bg-ok' : t.performance >= 50 ? 'bg-warn' : 'bg-danger'
                      )}
                      style={{ width: `${t.performance}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Consistency</h2>
          <Badge color="accent">
            <Flame className="size-3" /> {streak.current}-day streak
          </Badge>
        </div>
        <Heatmap calendar={calendar} />
      </Card>
    </div>
  );
}
