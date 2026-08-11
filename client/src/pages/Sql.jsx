import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Database, Pencil, Trash2, Sparkles } from 'lucide-react';
import api from '../api/client.js';
import { Card, Badge, Loading, EmptyState, Button, Input, Select, PageHeader } from '../components/ui.jsx';

const TOPICS = [
  'Basic SQL', 'Joins', 'Aggregations', 'Subqueries', 'CTEs',
  'Window Functions', 'Ranking', 'Date Functions', 'Advanced SQL', 'Other',
];

function difficultyBadge(d) {
  if (d === 'Easy') return <Badge color="ok">{d}</Badge>;
  if (d === 'Medium') return <Badge color="warn">{d}</Badge>;
  if (d === 'Hard') return <Badge color="danger">{d}</Badge>;
  return <Badge>{d}</Badge>;
}

export default function Sql() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (topic) params.set('topic', topic);
      if (difficulty) params.set('difficulty', difficulty);
      const { data } = await api.get(`/sql?${params.toString()}`);
      setProblems(data.problems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchProblems, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, topic, difficulty]);

  const remove = async (id) => {
    if (!confirm('Delete this SQL problem?')) return;
    await api.delete(`/sql/${id}`);
    setProblems((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="SQL Practice"
        subtitle="Track solved SQL questions and get AI review of your queries."
        actions={
          <Link to="/sql/new">
            <Button size="lg">
              <Plus className="size-4" /> Add SQL Problem
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search problems…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">All difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <Loading />
      ) : problems.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No SQL problems yet"
          subtitle="Add your first SQL question and get an AI review of your query."
          action={
            <Link to="/sql/new">
              <Button>Add your first problem</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {problems.map((p) => (
            <Card key={p.id} className="group flex flex-wrap items-center gap-3 p-4 transition-colors hover:border-accent/40">
              <button
                onClick={() => navigate(`/sql/${p.id}`)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Database className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold group-hover:text-accent">{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {difficultyBadge(p.difficulty)}
                    <Badge>{p.topic || 'Uncategorized'}</Badge>
                    {p.ai_review && (
                      <Badge color="info"><Sparkles className="size-3" /> Reviewed</Badge>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/sql/${p.id}`)}
                  className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
