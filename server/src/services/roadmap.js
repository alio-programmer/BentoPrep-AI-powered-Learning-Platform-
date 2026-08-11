// Deterministic (non-AI) roadmap calendar generator for Phase 1.
// Curated problem bank + topic ordering. AI-enhanced generation is a Phase 2 upgrade.

import { chatCompletion } from './aiProvider.js';

const RESUME_TYPES = new Set(['new', 'revision', 'concept', 'assessment', 'mock']);

// Extract a JSON object from an AI reply (handles code fences + stray text).
function extractJson(text) {
  const cleaned = String(text || '').trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : cleaned;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(candidate.slice(start, end + 1));
}

// Validate + normalize AI-generated roadmap days into our row shape.
function normalizeResumeDays(raw) {
  if (!raw || !Array.isArray(raw.days)) throw new Error('AI response missing "days" array');
  return raw.days.map((d, i) => {
    const type = RESUME_TYPES.has(d.type) ? d.type : 'new';
    const tasks = Array.isArray(d.tasks)
      ? d.tasks.map((t) => ({
          name: String(t?.name || 'Task').slice(0, 200),
          difficulty: String(t?.difficulty || 'Mixed').slice(0, 20),
          topic: String(t?.topic || 'General').slice(0, 80),
        }))
      : [{ name: String(d?.title || 'Task').slice(0, 200), difficulty: 'Mixed', topic: 'General' }];
    return {
      day_number: Number(d.day_number) || i + 1,
      type,
      title: String(d.title || `Day ${i + 1}`).slice(0, 300),
      tasks,
      status: 'pending',
    };
  });
}

// Generate a personalized roadmap from a resume using the user's AI provider.
export async function generateResumeRoadmap({ resume, settings, duration_days, daily_availability }) {
  const days = Math.min(Math.max(Number(duration_days) || 30, 7), 90);
  const parts = [`Resume file: ${resume.name}`];
  if (resume.target_role) parts.push(`Target role: ${resume.target_role}`);
  if (resume.job_description) {
    parts.push(`\nJob description to match against:\n${resume.job_description}`);
  }
  if (resume.ai_analysis?.content) {
    parts.push(`\nPrior AI analysis of this resume (use it to target weak areas):\n${resume.ai_analysis.content}`);
  }
  parts.push(`\nResume content:\n${resume.content || '(empty)'}`);

  const system = `You are a senior interview preparation coach.
Build a ${days}-day, ${daily_availability || '2 hours'}/day interview-prep calendar tailored to this person's resume,
target role, and any job description provided.

Rules:
- Return ONLY valid JSON, no markdown, no commentary. Shape:
{ "days": [ { "day_number": 1, "type": "new|revision|concept|assessment|mock", "title": "short summary",
"tasks": [ { "name": "specific task or problem", "difficulty": "Easy|Medium|Hard|Concept|Mixed", "topic": "topic" } ] } ] }
- Generate exactly ${days} days (day_number 1..${days}).
- Anchor content in the resume: reinforce listed skills, close gaps implied by the target role/JD.
- Mix DSA, system design, SQL, projects/behavioral (STAR) and weekly assessments.
- Task names must be concrete and actionable.`;

  const reply = await chatCompletion({
    baseUrl: settings.baseUrl || settings.ai_base_url,
    apiKey: settings.apiKey || settings.ai_api_key,
    model: settings.model || settings.ai_model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: parts.join('\n') },
    ],
    temperature: 0.6,
  });

  const parsed = extractJson(reply);
  const normalized = normalizeResumeDays(parsed).slice(0, days);
  if (normalized.length === 0) throw new Error('AI returned an empty roadmap');

  return {
    days: normalized,
    meta: { target: resume.name || 'Resume-based', level: resume.target_role || 'Resume', duration_days: days, track: 'resume' },
  };
}

// AI-based generator for DSA / SQL tracks (no resume required).
export async function generateAiRoadmap({ track, level = 'Intermediate', target = 'General DSA', duration_days, daily_availability, settings }) {
  const days = Math.min(Math.max(Number(duration_days) || 30, 7), 90);
  const bank = track === 'sql' ? SQL_TOPICS : TOPICS;
  const topicBank = bank.map((t) => `${t.topic}: ${t.problems.map((p) => p[0]).join(', ')}`).join('\n');
  const trackLabel = track === 'sql' ? 'SQL' : 'DSA';

  const system = `You are a senior interview preparation coach.
Build a ${days}-day, ${daily_availability || '2 hours'}/day ${trackLabel} interview-prep calendar for a ${level} level candidate targeting "${target}".

Rules:
- Return ONLY valid JSON, no markdown, no commentary. Shape:
{ "days": [ { "day_number": 1, "type": "new|revision|concept|assessment|mock", "title": "short summary",
"tasks": [ { "name": "specific task or problem", "difficulty": "Easy|Medium|Hard|Concept|Mixed", "topic": "topic" } ] } ] }
- Generate exactly ${days} days (day_number 1..${days}).
- Prefer the concrete problems/topics from the provided topic bank. Do NOT repeat the same problem across different days.
- Structure: start with fundamentals, progress to harder topics, include revision days, weekly assessments, and a mock interview.
- Task names must be concrete and actionable.`;

  const user = `Target: ${target}\nLevel: ${level}\n\nTopic bank:\n${topicBank}`;

  const reply = await chatCompletion({
    baseUrl: settings.baseUrl || settings.ai_base_url,
    apiKey: settings.apiKey || settings.ai_api_key,
    model: settings.model || settings.ai_model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.6,
  });

  const parsed = extractJson(reply);
  const normalized = normalizeResumeDays(parsed).slice(0, days);
  if (normalized.length === 0) throw new Error('AI returned an empty roadmap');

  return {
    days: normalized,
    meta: { target, level, duration_days: days, track },
  };
}

const SQL_TOPICS = [
  {
    topic: 'Basic SQL',
    problems: [
      ['SELECT specific columns', 'Easy'],
      ['WHERE filtering', 'Easy'],
      ['ORDER BY + LIMIT', 'Easy'],
      ['DISTINCT values', 'Easy'],
      ['NULL handling (IS NULL, COALESCE)', 'Medium'],
    ],
  },
  {
    topic: 'Joins',
    problems: [
      ['INNER JOIN', 'Easy'],
      ['LEFT / RIGHT JOIN', 'Easy'],
      ['FULL OUTER JOIN', 'Medium'],
      ['SELF JOIN (manager-employee)', 'Medium'],
      ['Multiple joins with filters', 'Medium'],
    ],
  },
  {
    topic: 'Aggregations',
    problems: [
      ['COUNT / SUM / AVG', 'Easy'],
      ['GROUP BY basics', 'Easy'],
      ['HAVING filter on groups', 'Medium'],
      ['COUNT(DISTINCT …)', 'Medium'],
      ['Aggregate + join combined', 'Medium'],
    ],
  },
  {
    topic: 'Subqueries',
    problems: [
      ['Scalar subquery in SELECT', 'Medium'],
      ['IN / NOT IN subquery', 'Easy'],
      ['EXISTS / NOT EXISTS', 'Medium'],
      ['Correlated subquery', 'Hard'],
      ['Subquery in FROM (derived table)', 'Medium'],
    ],
  },
  {
    topic: 'CTEs',
    problems: [
      ['Basic WITH clause', 'Easy'],
      ['Multiple CTEs chained', 'Medium'],
      ['CTE + join', 'Medium'],
      ['Recursive CTE (flatten tree)', 'Hard'],
    ],
  },
  {
    topic: 'Window Functions',
    problems: [
      ['ROW_NUMBER() OVER', 'Easy'],
      ['RANK vs DENSE_RANK', 'Medium'],
      ['SUM() OVER running total', 'Medium'],
      ['LAG / LEAD', 'Medium'],
      ['PARTITION BY grouping', 'Medium'],
    ],
  },
  {
    topic: 'Ranking',
    problems: [
      ['Top N per group', 'Medium'],
      ['Nth highest salary', 'Medium'],
      ['Moving average', 'Hard'],
      ['NTILE percentiles', 'Hard'],
    ],
  },
  {
    topic: 'Date Functions',
    problems: [
      ['EXTRACT / DATE_PART', 'Easy'],
      ['DATE_TRUNC grouping', 'Medium'],
      ['Interval arithmetic', 'Medium'],
      ['BETWEEN date ranges', 'Easy'],
    ],
  },
  {
    topic: 'Advanced SQL',
    problems: [
      ['Pivot with CASE + aggregate', 'Medium'],
      ['Cumulative & running aggregates', 'Medium'],
      ['Gaps and islands', 'Hard'],
      ['String functions (CONCAT, SPLIT)', 'Medium'],
    ],
  },
];

const TOPICS = [
  {
    topic: 'Arrays',
    problems: [
      ['Two Sum', 'Easy'],
      ['Best Time to Buy and Sell Stock', 'Easy'],
      ['Product of Array Except Self', 'Medium'],
      ['Maximum Subarray', 'Medium'],
      ['Merge Intervals', 'Medium'],
      ['Container With Most Water', 'Medium'],
    ],
  },
  {
    topic: 'Strings',
    problems: [
      ['Valid Anagram', 'Easy'],
      ['Valid Palindrome', 'Easy'],
      ['Longest Common Prefix', 'Easy'],
      ['Group Anagrams', 'Medium'],
      ['Longest Palindromic Substring', 'Medium'],
      ['Minimum Window Substring', 'Hard'],
    ],
  },
  {
    topic: 'Hashing',
    problems: [
      ['Contains Duplicate', 'Easy'],
      ['Intersection of Two Arrays', 'Easy'],
      ['Top K Frequent Elements', 'Medium'],
      ['Subarray Sum Equals K', 'Medium'],
      ['Longest Consecutive Sequence', 'Medium'],
    ],
  },
  {
    topic: 'Two Pointers',
    problems: [
      ['Valid Palindrome II', 'Easy'],
      ['Two Sum II — Sorted Array', 'Medium'],
      ['3Sum', 'Medium'],
      ['Trapping Rain Water', 'Hard'],
    ],
  },
  {
    topic: 'Sliding Window',
    problems: [
      ['Best Time to Buy and Sell Stock II', 'Medium'],
      ['Longest Substring Without Repeating Characters', 'Medium'],
      ['Permutation in String', 'Medium'],
      ['Sliding Window Maximum', 'Hard'],
    ],
  },
  {
    topic: 'Stack',
    problems: [
      ['Valid Parentheses', 'Easy'],
      ['Min Stack', 'Medium'],
      ['Evaluate Reverse Polish Notation', 'Medium'],
      ['Largest Rectangle in Histogram', 'Hard'],
    ],
  },
  {
    topic: 'Queue',
    problems: [
      ['Implement Queue using Stacks', 'Easy'],
      ['Number of Recent Calls', 'Easy'],
      ['Design Circular Deque', 'Medium'],
    ],
  },
  {
    topic: 'Binary Search',
    problems: [
      ['Binary Search', 'Easy'],
      ['Search in Rotated Sorted Array', 'Medium'],
      ['Find Minimum in Rotated Sorted Array', 'Medium'],
      ['Koko Eating Bananas', 'Medium'],
      ['Median of Two Sorted Arrays', 'Hard'],
    ],
  },
  {
    topic: 'Linked Lists',
    problems: [
      ['Reverse Linked List', 'Easy'],
      ['Merge Two Sorted Lists', 'Easy'],
      ['Linked List Cycle', 'Easy'],
      ['Reorder List', 'Medium'],
      ['Merge K Sorted Lists', 'Hard'],
    ],
  },
  {
    topic: 'Trees',
    problems: [
      ['Invert Binary Tree', 'Easy'],
      ['Maximum Depth of Binary Tree', 'Easy'],
      ['Validate Binary Search Tree', 'Medium'],
      ['Binary Tree Level Order Traversal', 'Medium'],
      ['Binary Tree Maximum Path Sum', 'Hard'],
    ],
  },
  {
    topic: 'Heap',
    problems: [
      ['Kth Largest Element in an Array', 'Medium'],
      ['K Closest Points to Origin', 'Medium'],
      ['Find Median from Data Stream', 'Hard'],
    ],
  },
  {
    topic: 'Recursion',
    problems: [
      ['Fibonacci Number', 'Easy'],
      ['Power of Two', 'Easy'],
      ['Generate Parentheses', 'Medium'],
      ['Permutations', 'Medium'],
      ['Letter Combinations of a Phone Number', 'Medium'],
    ],
  },
  {
    topic: 'Backtracking',
    problems: [
      ['Combination Sum', 'Medium'],
      ['Subsets', 'Medium'],
      ['Word Search', 'Medium'],
      ['N-Queens', 'Hard'],
    ],
  },
  {
    topic: 'Greedy',
    problems: [
      ['Assign Cookies', 'Easy'],
      ['Jump Game', 'Medium'],
      ['Jump Game II', 'Medium'],
      ['Task Scheduler', 'Medium'],
    ],
  },
  {
    topic: 'Graphs',
    problems: [
      ['Number of Islands', 'Medium'],
      ['Clone Graph', 'Medium'],
      ['Course Schedule', 'Medium'],
      ['Pacific Atlantic Water Flow', 'Medium'],
      ['Word Ladder', 'Hard'],
    ],
  },
  {
    topic: 'Dynamic Programming',
    problems: [
      ['Climbing Stairs', 'Easy'],
      ['House Robber', 'Medium'],
      ['Coin Change', 'Medium'],
      ['Longest Increasing Subsequence', 'Medium'],
      ['Word Break', 'Medium'],
      ['Edit Distance', 'Hard'],
    ],
  },
  {
    topic: 'Trie',
    problems: [
      ['Implement Trie (Prefix Tree)', 'Medium'],
      ['Design Add and Search Words', 'Medium'],
      ['Word Search II', 'Hard'],
    ],
  },
  {
    topic: 'Bit Manipulation',
    problems: [
      ['Single Number', 'Easy'],
      ['Number of 1 Bits', 'Easy'],
      ['Counting Bits', 'Easy'],
      ['Reverse Bits', 'Easy'],
      ['Missing Number', 'Easy'],
    ],
  },
];

const DAY_TYPES = ['new', 'new', 'revision', 'new', 'new', 'concept', 'assessment', 'mock'];

function pickProblems(topicEntry, visit, level) {
  const list = topicEntry.problems;
  // Each visit advances 2 problems so consecutive days differ.
  const idx = (visit * 2) % list.length;
  const taken = [];
  const [n1, n2] = [list[idx % list.length], list[(idx + 1) % list.length]];
  taken.push({ name: n1[0], difficulty: levelFiltered(n1[1], level), topic: topicEntry.topic });
  if (n2 && n2[0] !== n1[0]) {
    taken.push({ name: n2[0], difficulty: levelFiltered(n2[1], level), topic: topicEntry.topic });
  }
  return taken;
}

function levelFiltered(difficulty, level) {
  if (level === 'Beginner') {
    return difficulty === 'Hard' ? 'Medium' : difficulty;
  }
  if (level === 'Advanced') {
    return difficulty === 'Easy' ? 'Medium' : difficulty;
  }
  return difficulty;
}

// Generate roadmap days for a given duration.
export function generateRoadmap({ duration_days, level = 'Intermediate', target = 'General DSA', track = 'dsa' }) {
  const bank = track === 'sql' ? SQL_TOPICS : TOPICS;
  const days = Math.min(Math.max(Number(duration_days) || 30, 7), 90);
  const result = [];
  let topicCursor = 0;
  // Tracks how many times each topic has been visited so problems advance.
  const topicVisits = new Array(bank.length).fill(0);
  let problemCursor = 0;

  for (let d = 1; d <= days; d++) {
    const weekDay = (d - 1) % 7;
    const type = weekDay === 6 ? 'assessment' : DAY_TYPES[(d - 1) % 8];
    const tasks = [];
    let title = '';

    if (type === 'assessment') {
      title = `Weekly Assessment — Week ${Math.ceil(d / 7)}`;
      tasks.push({ name: 'Mixed problems (timed)', difficulty: 'Mixed', topic: 'Assessment' });
    } else if (type === 'mock') {
      title = 'Mock Interview';
      tasks.push({ name: 'Full mock interview session', difficulty: 'Mixed', topic: 'Interview' });
    } else if (type === 'revision') {
      title = `Revision Day ${Math.ceil(d / 4)}`;
      tasks.push({ name: 'Re-attempt previous problems without solutions', difficulty: 'Mixed', topic: 'Revision' });
      tasks.push({ name: 'Review spaced-repetition due cards', difficulty: 'Mixed', topic: 'Revision' });
    } else if (type === 'concept') {
      const topic = bank[topicCursor % bank.length];
      title = `Concept: ${topic.topic} deep-dive`;
      tasks.push({ name: `Learn ${topic.topic} fundamentals`, difficulty: 'Concept', topic: topic.topic });
      topicCursor = (topicCursor + 1) % bank.length;
    } else {
      // new problems
      const topicIndex = topicCursor % bank.length;
      const topic = bank[topicIndex];
      const picked = pickProblems(topic, topicVisits[topicIndex], level);
      title = `${topic.topic} — ${picked[0].name}`;
      picked.forEach((p) => tasks.push(p));
      topicVisits[topicIndex]++;
      problemCursor++;
      if (problemCursor >= 4) {
        problemCursor = 0;
        topicCursor = (topicCursor + 1) % bank.length;
      }
    }

    result.push({
      day_number: d,
      type,
      title: title || `Day ${d}`,
      tasks,
      status: 'pending',
    });
  }

  return { days: result, meta: { target, level, duration_days: days, track } };
}
