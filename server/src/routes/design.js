import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveSettings, chatCompletion } from '../services/aiProvider.js';

const router = Router();

const LLD_TOPICS = [
  { id: 'oop-solod', name: 'OOP & SOLID', kind: 'concept', blurb: 'Encapsulation, interfaces, SRP, OCP and friends.' },
  { id: 'patterns', name: 'Design Patterns', kind: 'concept', blurb: 'Strategy, Observer, Factory, Builder and more.' },
  { id: 'parking-lot', name: 'Parking Lot', kind: 'problem', blurb: 'Classic object-modeling problem with multiple levels.' },
  { id: 'library-mgmt', name: 'Library Management', kind: 'problem', blurb: 'Members, books, checkouts and reservations.' },
  { id: 'snake-ladder', name: 'Snake & Ladder', kind: 'problem', blurb: 'Board game modeling with dice, players and cells.' },
  { id: 'elevator', name: 'Elevator System', kind: 'problem', blurb: 'Requests, scheduling and state management.' },
  { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', kind: 'problem', blurb: 'Grid, players, moves and win detection.' },
  { id: 'vending-machine', name: 'Vending Machine', kind: 'problem', blurb: 'States, products, coins and change.' },
  { id: 'logistics', name: 'Logistics / Food Delivery', kind: 'problem', blurb: 'Riders, orders, restaurants and routing.' },
  { id: 'custom', name: 'Your Own Problem', kind: 'problem', blurb: 'Describe any LLD problem you want to practice.' },
];

const HLD_TOPICS = [
  { id: 'url-shortener', name: 'URL Shortener', kind: 'problem', blurb: 'Tiny URLs, hash functions and redirects.' },
  { id: 'rate-limiter', name: 'Rate Limiter', kind: 'problem', blurb: 'Token bucket, sliding window, distributed limiting.' },
  { id: 'chat', name: 'Chat Application', kind: 'problem', blurb: 'Realtime messaging, presence and message ordering.' },
  { id: 'feed', name: 'News Feed', kind: 'problem', blurb: 'Fan-out, caching and ranking at scale.' },
  { id: 'yt-streaming', name: 'Video Streaming', kind: 'problem', blurb: 'CDN, transcoding, adaptive bitrate streaming.' },
  { id: 'ecommerce', name: 'E-Commerce', kind: 'problem', blurb: 'Inventory, carts, orders and payments.' },
  { id: 'notification', name: 'Notification System', kind: 'problem', blurb: 'Fan-out, push vs pull, delivery guarantees.' },
  { id: 'search', name: 'Search Engine', kind: 'problem', blurb: 'Crawler, inverted index, ranking.' },
  { id: 'distributed-cache', name: 'Distributed Cache', kind: 'problem', blurb: 'Sharding, replication, cache consistency.' },
  { id: 'custom', name: 'Your Own Design', kind: 'problem', blurb: 'Describe any system you want to architect.' },
];

// Build the AI tutor system prompt for a track.
function systemPrompt(track, topic, kind) {
  const base =
    track === 'lld'
      ? `You are a senior software engineer tutoring Low-Level Design (LLD).
Teach classes, interfaces, design patterns, SOLID principles and clean object modeling.
Encourage the student to propose designs before revealing answers, but correct their mistakes.`
      : `You are a staff architect tutoring High-Level Design (HLD).
Teach scalable architecture: load balancing, databases, caching, queues, CDNs, sharding and trade-offs.
Walk through requirements, estimation, API design, data model, high-level components,
data flow and bottlenecks. Use Mermaid diagrams to illustrate architecture. Discuss trade-offs and follow-up questions.`;

  const role =
    kind === 'concept'
      ? `The selected topic "${topic}" is a CONCEPT, not a design exercise.
Teach the concept directly and thoroughly: definition, core ideas, practical examples,
common pitfalls, and how to apply it. Use short code/diagram snippets where they help.
Do NOT ask the student to "paste the requirement statement" — they are here to LEARN the concept.
If the user asks to apply it, give a concrete mini-example (e.g. "Parking Lot" for SOLID).`
      : `The selected topic is "${topic}", a specific design exercise.
Follow the classic design interview flow: clarify requirements, list key entities,
map relationships, assign responsibilities, then draw a Mermaid diagram and code sketch.
Ask ONE focused clarifying question at most before proposing a solution, then deliver.`;

  return `${base}

Track: ${track === 'lld' ? 'Low-Level Design (LLD)' : 'High-Level Design (HLD)'}
Current topic: ${topic}

${role}

Format guidance:
- Use short sections with markdown headings (##), bullets (-), and fenced code blocks for diagrams/code.
- Use Mermaid diagrams wherever they help: wrap them in a fenced block with the "mermaid" language tag (e.g. flowcharts, sequence diagrams, state diagrams, class diagrams, architecture diagrams). Prefer a diagram over a long textual description.
- Keep responses focused and actionable — max ~600 words unless asked for more.`;
}

// GET /api/design/topics — curated topic lists for LLD and HLD
router.get('/topics', (_req, res) => {
  return res.json({ lld: LLD_TOPICS, hld: HLD_TOPICS });
});

// Structured concept curriculum: basics → advanced, per track.
const CURRICULUM = {
  lld: [
    {
      level: 'Basics',
      color: 'info',
      concepts: [
        'What is Object-Oriented Programming (OOP)?',
        'Classes vs Objects',
        'Encapsulation & Data Hiding',
        'Abstraction',
        'Inheritance',
        'Polymorphism',
        'Association, Aggregation & Composition',
        'UML Class Diagrams',
      ],
    },
    {
      level: 'Intermediate',
      color: 'warn',
      concepts: [
        'SOLID Principles (SRP, OCP, LSP, ISP, DIP)',
        'Loose Coupling & High Cohesion',
        'Design Patterns: Strategy',
        'Design Patterns: Observer',
        'Design Patterns: Factory & Abstract Factory',
        'Design Patterns: Singleton',
        'Design Patterns: Builder',
        'Design Patterns: Adapter & Facade',
        'Design Patterns: State Machine',
      ],
    },
    {
      level: 'Advanced',
      color: 'danger',
      concepts: [
        'Dependency Injection & Inversion of Control',
        'Composition over Inheritance',
        'Anti-Patterns & Code Smells',
        'Clean Architecture Basics',
        'Domain-Driven Design (DDD) Intro',
        'Concurrency in Object Design',
        'Designing for Testability (Mocking)',
        'Event-Driven LLD & CQRS at Object Level',
      ],
    },
  ],
  hld: [
    {
      level: 'Basics',
      color: 'info',
      concepts: [
        'Client-Server Architecture',
        'HTTP, REST & APIs',
        'Databases: SQL vs NoSQL',
        'Caching Fundamentals',
        'Load Balancing Basics',
        'DNS & How Requests Flow',
        'What is CDN?',
        'Microservices vs Monolith',
      ],
    },
    {
      level: 'Intermediate',
      color: 'warn',
      concepts: [
        'Sharding & Data Partitioning',
        'Replication & Consistency',
        'CAP Theorem',
        'Message Queues & Pub/Sub',
        'Event-Driven Architecture',
        'API Gateway Pattern',
        'Rate Limiting Strategies',
        'Consistent Hashing',
        'Content Delivery & Edge Caching',
      ],
    },
    {
      level: 'Advanced',
      color: 'danger',
      concepts: [
        'Distributed Transactions (2PC, Saga)',
        'Event Sourcing & CQRS',
        'Streaming Systems (Kafka)',
        'Consensus & Leader Election (Raft)',
        'Fault Tolerance & Availability (99.99%)',
        'Capacity Estimation & Scaling Math',
        'Real-Time Systems & WebSockets',
        'Global Systems & Geo-Routing',
        'Security in Distributed Systems',
      ],
    },
  ],
};

// GET /api/design/curriculum — structured learning path for LLD/HLD
router.get('/curriculum', (_req, res) => {
  return res.json(CURRICULUM);
});

// POST /api/design/chat — AI tutor for LLD/HLD with history
router.post('/chat', requireAuth, async (req, res) => {
  const schema = z.object({
    track: z.enum(['lld', 'hld']),
    topic: z.string().max(120),
    message: z.string().min(1).max(2000),
    history: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(6000) }))
      .max(20)
      .default([]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const topicList = parsed.data.track === 'lld' ? LLD_TOPICS : HLD_TOPICS;
  const topicMeta = topicList.find((t) => t.name === parsed.data.topic);
  const curriculumConcepts = (CURRICULUM[parsed.data.track] || [])
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

  try {
    const settings = resolveSettings(data);
    const reply = await chatCompletion({
      baseUrl: settings.baseUrl || settings.ai_base_url,
      apiKey: settings.apiKey || settings.ai_api_key,
      model: settings.model || settings.ai_model,
      messages: [
        { role: 'system', content: systemPrompt(parsed.data.track, parsed.data.topic, kind) },
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
