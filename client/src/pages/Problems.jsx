import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ExternalLink, Code2, Pencil, Trash2 } from 'lucide-react';
import api from '../api/client.js';
import { Card, Badge, Loading, EmptyState, Button, Input, Select, PageHeader, cn } from '../components/ui.jsx';

const PLATFORMS = ['LeetCode', 'Codeforces', 'HackerRank', 'GeeksForGeeks', 'Other'];
const TOPICS = [
  'Arrays', 'Strings', 'Hashing', 'Linked Lists', 'Stack', 'Queue', 'Trees',
  'Graphs', 'Dynamic Programming', 'Greedy', 'Backtracking', 'Binary Search',
  'Sliding Window', 'Two Pointers', 'Heap', 'Trie', 'Bit Manipulation', 'Recursion', 'SQL', 'Other',
];

function difficultyBadge(d) {
  if (d === 'Easy') return <Badge color="ok">{d}</Badge>;
  if (d === 'Medium') return <Badge color="warn">{d}</Badge>;
  if (d === 'Hard') return <Badge color="danger">{d}</Badge>;
  return <Badge>{d}</Badge>;
}

export default function Problems() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (topic) params.set('topic', topic);
      if (platform) params.set('platform', platform);
      if (difficulty) params.set('difficulty', difficulty);
      const { data } = await api.get(`/problems?${params.toString()}`);
      setProblems(data.problems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchProblems, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, topic, platform, difficulty]);

  const remove = async (id) => {
    if (!confirm('Delete this problem and its memory card?')) return;
    await api.delete(`/problems/${id}`);
    setProblems((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="DSA Problems"
        subtitle="Every problem becomes a spaced-repetition memory card."
        actions={
          <Link to="/problems/new">
            <Button size="lg">
              <Plus className="size-4" /> Add Problem
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
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
          icon={Code2}
          title="No problems yet"
          subtitle="Add your first problem and BentoPrep will build a memory card for it automatically."
          action={
            <Link to="/problems/new">
              <Button>Add your first problem</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {problems.map((p) => (
            <Card key={p.id} className="group flex flex-wrap items-center gap-3 p-4 transition-colors hover:border-accent/40">
              <button
                onClick={() => navigate(`/problems/${p.id}`)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Code2 className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold group-hover:text-accent">{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {difficultyBadge(p.difficulty)}
                    <Badge>{p.topic || 'Uncategorized'}</Badge>
                    <Badge color="default">{p.platform || 'Other'}</Badge>
                    {p.pattern && <span className="text-[11px] text-muted">{p.pattern}</span>}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink">
                    <ExternalLink className="size-4" />
                  </a>
                )}
                <button
                  onClick={() => navigate(`/problems/${p.id}`)}
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
