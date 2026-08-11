// Seed script — creates a demo user with realistic sample data.
// Usage: npm run seed  (requires .env with Supabase credentials)

import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';
import { createCardFromProblem } from './spacedRepetition.js';
import { generateRoadmap } from './roadmap.js';

dotenv.config();

const DEMO_EMAIL = 'demo@bentoprep.local';
const DEMO_PASSWORD = 'demo1234';

const SAMPLE_PROBLEMS = [
  {
    name: 'Two Sum',
    platform: 'LeetCode',
    url: 'https://leetcode.com/problems/two-sum/',
    difficulty: 'Easy',
    topic: 'Arrays',
    language: 'JavaScript',
    time_taken_min: 12,
    attempts: 1,
    solved_independently: true,
    confidence: 5,
    difficulty_experienced: 'Low',
    how_i_solved:
      'I initially tried brute force O(n²). Then realized I could use a HashMap to store previously seen values and check whether target - current existed. This reduced the solution to O(n).',
    key_insight: 'Store previously seen values and search for the complement.',
    mistake: 'Initially attempted nested loops without realizing the hashmap trick.',
    why_first_failed: 'Was thinking in terms of pairs rather than complements.',
    pattern: 'Hash Map',
    time_complexity: 'O(n)',
    space_complexity: 'O(n)',
    code: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) return [seen.get(complement), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}',
    alternative_approach: 'Two-pointer after sorting (O(n log n)).',
    when_to_use: 'Need to find two values satisfying a condition → think HashMap.',
    tags: ['arrays', 'hashmap', 'classic'],
  },
  {
    name: 'Valid Anagram',
    platform: 'LeetCode',
    url: 'https://leetcode.com/problems/valid-anagram/',
    difficulty: 'Easy',
    topic: 'Strings',
    language: 'Python',
    time_taken_min: 8,
    attempts: 1,
    solved_independently: true,
    confidence: 5,
    difficulty_experienced: 'Low',
    how_i_solved: 'Counted character frequencies in both strings with a hashmap and compared the maps.',
    key_insight: 'Anagrams have identical character frequency maps.',
    mistake: 'None on this one.',
    why_first_failed: 'n/a',
    pattern: 'Hash Map / Frequency Count',
    time_complexity: 'O(n)',
    space_complexity: 'O(k) where k = alphabet size',
    code: 'def is_anagram(s, t):\n  from collections import Counter\n  return Counter(s) == Counter(t)',
    alternative_approach: 'Sort both strings and compare (O(n log n)).',
    when_to_use: 'Compare multisets of characters or elements.',
    tags: ['strings', 'hashmap'],
  },
  {
    name: 'Best Time to Buy and Sell Stock',
    platform: 'LeetCode',
    url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
    difficulty: 'Easy',
    topic: 'Arrays',
    language: 'JavaScript',
    time_taken_min: 15,
    attempts: 2,
    solved_independently: false,
    confidence: 4,
    difficulty_experienced: 'Medium',
    how_i_solved:
      'Track the minimum price seen so far, then compute max profit for the current price.',
    key_insight: 'Only the minimum-so-far matters; profit is max(prices[i] - minSoFar).',
    mistake: 'Kept comparing pairs of days instead of maintaining a running minimum.',
    why_first_failed: 'Tried a max/min sliding approach that required two passes.',
    pattern: 'One Pass / Kadane-like',
    time_complexity: 'O(n)',
    space_complexity: 'O(1)',
    code: 'function maxProfit(prices) {\n  let min = Infinity, profit = 0;\n  for (const p of prices) {\n    min = Math.min(min, p);\n    profit = Math.max(profit, p - min);\n  }\n  return profit;\n}',
    alternative_approach: 'Kadane on the difference array.',
    when_to_use: 'Maximize gain across a sequence with a single purchase/sale.',
    tags: ['arrays', 'kadane'],
  },
  {
    name: 'Valid Parentheses',
    platform: 'LeetCode',
    url: 'https://leetcode.com/problems/valid-parentheses/',
    difficulty: 'Easy',
    topic: 'Stack',
    language: 'JavaScript',
    time_taken_min: 10,
    attempts: 1,
    solved_independently: true,
    confidence: 5,
    difficulty_experienced: 'Low',
    how_i_solved: 'Used a stack; push open brackets, pop and match on close brackets.',
    key_insight: 'Last-open bracket must close first → perfect stack fit.',
    mistake: 'None.',
    why_first_failed: 'n/a',
    pattern: 'Stack',
    time_complexity: 'O(n)',
    space_complexity: 'O(n)',
    code: 'function isValid(s) {\n  const stack = [];\n  const map = { ")": "(", "]": "[", "}": "{" };\n  for (const c of s) {\n    if (c === "(" || c === "[" || c === "{") stack.push(c);\n    else if (stack.pop() !== map[c]) return false;\n  }\n  return stack.length === 0;\n}',
    alternative_approach: 'Replace pairs recursively (O(n²)).',
    when_to_use: 'Nesting/ordering constraints → stack.',
    tags: ['stack'],
  },
  {
    name: 'Longest Substring Without Repeating Characters',
    platform: 'LeetCode',
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    difficulty: 'Medium',
    topic: 'Sliding Window',
    language: 'JavaScript',
    time_taken_min: 25,
    attempts: 2,
    solved_independently: true,
    confidence: 4,
    difficulty_experienced: 'Medium',
    how_i_solved:
      'Sliding window with two pointers and a set. Expand the right pointer; when a duplicate appears, shrink from the left until the duplicate is removed.',
    key_insight: 'A set + two pointers keeps the window valid in amortized O(n).',
    mistake: 'Initially reset the window on every duplicate instead of shrinking it.',
    why_first_failed: 'Did not realize the window could keep growing past a duplicate.',
    pattern: 'Sliding Window',
    time_complexity: 'O(n)',
    space_complexity: 'O(min(n, alphabet))',
    code: 'function lengthOfLongestSubstring(s) {\n  const set = new Set();\n  let left = 0, best = 0;\n  for (let right = 0; right < s.length; right++) {\n    while (set.has(s[right])) set.delete(s[left++]);\n    set.add(s[right]);\n    best = Math.max(best, right - left + 1);\n  }\n  return best;\n}',
    alternative_approach: 'Hashmap of last-seen indices (skip directly).',
    when_to_use: 'Contiguous subarray/substring with a constraint → sliding window.',
    tags: ['sliding-window', 'hashmap'],
  },
  {
    name: 'Number of Islands',
    platform: 'LeetCode',
    url: 'https://leetcode.com/problems/number-of-islands/',
    difficulty: 'Medium',
    topic: 'Graphs',
    language: 'Python',
    time_taken_min: 30,
    attempts: 2,
    solved_independently: false,
    confidence: 3,
    difficulty_experienced: 'High',
    how_i_solved:
      'DFS from every unvisited "1", marking visited cells to avoid recounting.',
    key_insight: 'Grid traversal = graph traversal; mark visited by mutating or a visited set.',
    mistake: 'Forgot to mark cells as visited when pushing to the stack → infinite loop.',
    why_first_failed: 'Did not think of the grid as a graph explicitly.',
    pattern: 'DFS / BFS on grid',
    time_complexity: 'O(R × C)',
    space_complexity: 'O(R × C) worst case (recursion)',
    code: 'def num_islands(grid):\n  def dfs(i, j):\n    if i < 0 or j < 0 or i >= len(grid) or j >= len(grid[0]) or grid[i][j] == "0":\n      return\n    grid[i][j] = "0"\n    for di, dj in ((1,0),(-1,0),(0,1),(0,-1)):\n      dfs(i + di, j + dj)\n  count = 0\n  for i in range(len(grid)):\n    for j in range(len(grid[0])):\n      if grid[i][j] == "1":\n        count += 1\n        dfs(i, j)\n  return count',
    alternative_approach: 'Union-Find / BFS with a queue.',
    when_to_use: 'Connected components in a grid or graph.',
    tags: ['graphs', 'dfs', 'grid'],
  },
];

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in server/.env');
    process.exit(1);
  }

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  let demo = users.users.find((u) => u.email === DEMO_EMAIL);

  if (!demo) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: 'Demo Developer' },
    });
    if (error) {
      console.error('Failed to create demo user:', error.message);
      process.exit(1);
    }
    demo = data.user;
    console.log('Created demo user');
  }

  const uid = demo.id;
  await supabase.from('problems').delete().eq('user_id', uid);
  await supabase.from('memory_cards').delete().eq('user_id', uid);
  await supabase.from('reviews').delete().eq('user_id', uid);
  await supabase.from('roadmaps').update({ status: 'archived' }).eq('user_id', uid);

  // spread solve dates over the last 14 days
  const dates = Array.from({ length: SAMPLE_PROBLEMS.length }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (SAMPLE_PROBLEMS.length - 1 - i));
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  });

  const cards = [];
  for (let i = 0; i < SAMPLE_PROBLEMS.length; i++) {
    const { data: problem } = await supabase
      .from('problems')
      .insert({ ...SAMPLE_PROBLEMS[i], user_id: uid, date_solved: dates[i] })
      .select('*')
      .single();
    const card = createCardFromProblem(problem);
    // stagger due dates so some cards are due now
    card.due_date = new Date(Date.now() - i * 86400000).toISOString();
    const { data: cardRow } = await supabase.from('memory_cards').insert(card).select('*').single();
    cards.push(cardRow);
  }

  console.log(`Seeded ${SAMPLE_PROBLEMS.length} problems + memory cards`);

  // a roadmap
  const { data: roadmap } = await supabase
    .from('roadmaps')
    .insert({
      user_id: uid,
      duration_days: 45,
      level: 'Intermediate',
      target: 'FAANG',
      daily_availability: '2 hours',
      track: 'dsa',
      status: 'active',
    })
    .select('*')
    .single();

  const { days } = generateRoadmap({ duration_days: 45, level: 'Intermediate', target: 'FAANG' });
  const rows = days.map((day, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    d.setHours(0, 0, 0, 0);
    return {
      roadmap_id: roadmap.id,
      user_id: uid,
      day_number: day.day_number,
      type: day.type,
      title: day.title,
      tasks: day.tasks,
      status: idx === 0 ? 'done' : 'pending',
      date: d.toISOString(),
    };
  });
  await supabase.from('roadmap_days').insert(rows);
  console.log(`Seeded 45-day roadmap (${rows.length} days)`);

  // profile + settings
  await supabase
    .from('profiles')
    .upsert({
      id: uid,
      display_name: 'Demo Developer',
      target_role: 'Software Engineer',
      target_companies: ['Google'],
      experience: '2-5 years',
      dsa_level: 'Intermediate',
      pref_language: 'JavaScript',
      daily_hours: 2,
      days_target: 45,
      weak_topics: ['Graphs', 'Dynamic Programming'],
      onboarded: true,
    });
  await supabase
    .from('user_settings')
    .upsert({ user_id: uid, ai_provider: 'deepseek', ai_model: 'deepseek-chat', ai_base_url: 'https://api.deepseek.com' }, { onConflict: 'user_id' });

  console.log('\nDone. Log in with:');
  console.log('  email:    ' + DEMO_EMAIL);
  console.log('  password: ' + DEMO_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
