import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();

const SUBJECTS = ['dbms', 'cn', 'os'];

const TOPICS = {
  dbms: [
    { id: 'schema-design', name: 'Design a Schema', kind: 'problem', blurb: 'Normalized schemas for e-commerce, social, banking and more.' },
    { id: 'query-tuning', name: 'Query Optimization', kind: 'problem', blurb: 'Fix slow queries with indexes, rewrites and explain plans.' },
    { id: 'transactions', name: 'Transactions & Isolation', kind: 'problem', blurb: 'Concurrent writes, isolation levels and lost-update bugs.' },
    { id: 'indexing', name: 'Indexing Strategy', kind: 'problem', blurb: 'Pick indexes for read-heavy and write-heavy workloads.' },
    { id: 'data-modeling', name: 'Data Modeling', kind: 'problem', blurb: 'ER diagrams, relationships and normal forms.' },
    { id: 'custom', name: 'Your Own Topic', kind: 'problem', blurb: 'Ask about any DBMS topic you want to explore.' },
  ],
  cn: [
    { id: 'design-api', name: 'Design an API', kind: 'problem', blurb: 'REST/GraphQL design, versioning, pagination and auth.' },
    { id: 'tcp-dive', name: 'TCP Deep Dive', kind: 'problem', blurb: 'Handshake, congestion control, retransmission and timeouts.' },
    { id: 'load-balancing', name: 'Load Balancing', kind: 'problem', blurb: 'Algorithms, session affinity and health checks.' },
    { id: 'cdn', name: 'CDN & Caching', kind: 'problem', blurb: 'Edge caching, TTLs, invalidation and cache hits.' },
    { id: 'realtime', name: 'Real-Time Messaging', kind: 'problem', blurb: 'WebSockets, presence, ordering and reconnection.' },
    { id: 'custom', name: 'Your Own Topic', kind: 'problem', blurb: 'Ask about any networking topic you want to explore.' },
  ],
  os: [
    { id: 'producer-consumer', name: 'Producer-Consumer', kind: 'problem', blurb: 'Bounded buffer with semaphores or mutexes.' },
    { id: 'dining-philosophers', name: 'Dining Philosophers', kind: 'problem', blurb: 'Deadlock-free concurrent design with resources.' },
    { id: 'reader-writer', name: 'Reader-Writer', kind: 'problem', blurb: 'Readers-preference vs writers-preference solutions.' },
    { id: 'paging', name: 'Paging & Virtual Memory', kind: 'problem', blurb: 'Page tables, TLB, page faults and replacement.' },
    { id: 'scheduling', name: 'CPU Scheduling', kind: 'problem', blurb: 'Design a scheduler for a given workload.' },
    { id: 'custom', name: 'Your Own Topic', kind: 'problem', blurb: 'Ask about any OS topic you want to explore.' },
  ],
};

const CURRICULUM = {
  dbms: [
    {
      level: 'Basics',
      color: 'info',
      concepts: [
        'What is a Database?',
        'SQL vs NoSQL',
        'Tables, Rows & Columns',
        'Primary & Foreign Keys',
        'CRUD & Basic SQL',
        'Normalization (1NF, 2NF, 3NF)',
        'Transactions & ACID',
        'Indexes Basics',
      ],
    },
    {
      level: 'Intermediate',
      color: 'warn',
      concepts: [
        'Joins (INNER, LEFT, RIGHT, FULL)',
        'GROUP BY & Aggregations',
        'Subqueries & CTEs',
        'Window Functions',
        'Indexing Strategies (B-tree, Hash)',
        'Isolation Levels',
        'Locking & Concurrency',
        'Stored Procedures & Triggers',
      ],
    },
    {
      level: 'Advanced',
      color: 'danger',
      concepts: [
        'Query Optimization & EXPLAIN',
        'Partitioning & Sharding',
        'Replication & High Availability',
        'CAP Theorem for Databases',
        'Distributed Databases',
        'Caching Layers (Redis)',
        'Backup & Recovery',
        'Designing Databases for Scale',
      ],
    },
  ],
  cn: [
    {
      level: 'Basics',
      color: 'info',
      concepts: [
        'OSI Model',
        'TCP/IP Model',
        'IP Addressing & Subnetting',
        'DNS & How It Works',
        'HTTP & HTTPS',
        'TCP vs UDP',
        'Ports & Sockets',
        'Network Devices (Switch, Router)',
      ],
    },
    {
      level: 'Intermediate',
      color: 'warn',
      concepts: [
        'TCP Three-Way Handshake',
        'Flow & Congestion Control',
        'HTTP Methods & Status Codes',
        'REST & API Design',
        'WebSockets & Realtime',
        'Load Balancing',
        'CDN & Caching',
        'TLS/SSL & Network Security',
      ],
    },
    {
      level: 'Advanced',
      color: 'danger',
      concepts: [
        'TCP/IP Deep Dive',
        'HTTP/2 & HTTP/3',
        'Networking for Distributed Systems',
        'Latency & Throughput Optimization',
        'NAT, VPNs & Proxies',
        'Content Delivery at Scale',
        'Network Troubleshooting',
        'Real-Time Communication at Scale',
      ],
    },
  ],
  os: [
    {
      level: 'Basics',
      color: 'info',
      concepts: [
        'What is an Operating System?',
        'Process vs Thread',
        'Process States & PCB',
        'System Calls',
        'Memory Management Basics',
        'File Systems',
        'Linux Basics',
        'Process vs Kernel Space',
      ],
    },
    {
      level: 'Intermediate',
      color: 'warn',
      concepts: [
        'CPU Scheduling (FCFS, SJF, RR, Priority)',
        'Synchronization & Race Conditions',
        'Mutex & Semaphores',
        'Deadlocks & Handling',
        'Paging & Virtual Memory',
        'Page Replacement Algorithms',
        'Context Switching',
        'Thread vs Process Trade-offs',
      ],
    },
    {
      level: 'Advanced',
      color: 'danger',
      concepts: [
        'Concurrency & Parallelism',
        'Lock-Free & Atomics',
        'Memory-Mapped Files',
        'Kernel vs User Space Deep Dive',
        'Scheduling at Scale',
        'Virtualization & Containers',
        'Coordination in Distributed Systems',
        'Performance Optimization',
      ],
    },
  ],
};

// Build the AI tutor system prompt for a subject.
function systemPrompt(subject, topic, kind) {
  const SUBJECT_DESC = {
    dbms: `You are a senior database engineer tutoring Database Management Systems (DBMS).
Teach relational modeling, SQL, normalization, indexing, transactions, query optimization and how databases work under the hood.`,
    cn: `You are a network engineer tutoring Computer Networks.
Teach the OSI/TCP-IP stack, protocols, HTTP, DNS, load balancing, CDNs, TCP/UDP and how data flows across the internet.`,
    os: `You are a systems engineer tutoring Operating Systems.
Teach processes, threads, CPU scheduling, concurrency, deadlocks, memory management, virtual memory and the kernel.`,
  };

  const role =
    kind === 'concept'
      ? `The selected topic "${topic}" is a CONCEPT, not an exercise.
Teach it directly and thoroughly: definition, core ideas, practical examples, common pitfalls, and how to apply it.
Use short code/diagram snippets where they help.`
      : `The selected topic is "${topic}", a practice exercise.
Walk through it step by step, then give a concrete solution with code or ASCII diagrams where appropriate.
Ask ONE focused clarifying question at most before proposing a solution, then deliver.`;

  return `${SUBJECT_DESC[subject] || SUBJECT_DESC.dbms}

Subject: ${subject.toUpperCase()}
Current topic: ${topic}

${role}

Format guidance:
- Use short sections with markdown headings (##), bullets (-), and fenced code blocks for code/diagrams.
- Keep responses focused and actionable — max ~600 words unless asked for more.`;
}

// GET /api/cs/topics — practice topics per subject
router.get('/topics', (_req, res) => {
  return res.json(TOPICS);
});

// GET /api/cs/curriculum — structured learning path per subject
router.get('/curriculum', (_req, res) => {
  return res.json(CURRICULUM);
});

// POST /api/cs/chat — AI tutor for CS fundamentals with history
router.post('/chat', requireAuth, async (req, res) => {
  const schema = z.object({
    subject: z.enum(SUBJECTS),
    topic: z.string().max(120),
    message: z.string().min(1).max(2000),
    history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(6000) }))
      .max(20)
      .default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const topicMeta = (TOPICS[parsed.data.subject] || []).find((t) => t.name === parsed.data.topic);
  const curriculumConcepts = (CURRICULUM[parsed.data.subject] || [])
    .flatMap((g) => g.concepts)
    .some((c) => c === parsed.data.topic);
  const kind = topicMeta?.kind || (curriculumConcepts ? 'concept' : 'problem');

  const { data } = await supabase
    .from('user_settings')
    .select('ai_provider, ai_model, ai_base_url, ai_api_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!data?.ai_api_key) {
    return res.status(400).json({ error: 'No AI API key configured. Add your key in Settings → AI Provider.' });
  }

  const settings = resolveSettings(data);

  try {
    const reply = await chatCompletion({
      baseUrl: settings.baseUrl || settings.ai_base_url,
      apiKey: settings.apiKey || settings.ai_api_key,
      model: settings.model || settings.ai_model,
      messages: [
        { role: 'system', content: systemPrompt(parsed.data.subject, parsed.data.topic, kind) },
        ...parsed.data.history,
        { role: 'user', content: parsed.data.message },
      ],
      temperature: 0.6,
    });
    return res.json({ reply });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
