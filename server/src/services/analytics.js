import { supabase } from '../config/supabase.js';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getProblems(userId) {
  const { data, error } = await supabase
    .from('problems')
    .select('difficulty, topic, confidence, solved_independently, date_solved, name')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export function overview(problems) {
  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach((p) => {
    if (byDifficulty[p.difficulty] !== undefined) byDifficulty[p.difficulty]++;
  });
  return {
    total: problems.length,
    easy: byDifficulty.Easy,
    medium: byDifficulty.Medium,
    hard: byDifficulty.Hard,
  };
}

export function topicPerformance(problems) {
  const map = {};
  problems.forEach((p) => {
    if (!p.topic) return;
    if (!map[p.topic]) map[p.topic] = { solved: 0, scoreSum: 0, count: 0 };
    map[p.topic].solved++;
    map[p.topic].count++;
    const conf = p.confidence ? p.confidence : 3;
    let score = (conf / 5) * 80;
    if (p.solved_independently) score += 20;
    map[p.topic].scoreSum += Math.min(100, score);
  });
  return Object.entries(map)
    .map(([topic, v]) => ({
      topic,
      solved: v.solved,
      performance: Math.round(v.scoreSum / v.count),
    }))
    .sort((a, b) => b.solved - a.solved);
}

export function streak(problems) {
  const days = new Set(
    problems.map((p) => new Date(p.date_solved).toISOString().slice(0, 10))
  );
  const sorted = [...days].sort();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  const msDay = 86400000;
  const todayStr = startOfToday().toISOString().slice(0, 10);
  const yday = new Date(Date.now() - msDay).toISOString().slice(0, 10);

  // longest streak
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1]);
    const b = new Date(sorted[i]);
    if (b - a === msDay) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // current streak: count backwards from today (or yesterday)
  let current = 0;
  let cursor = days.has(todayStr) ? todayStr : days.has(yday) ? yday : null;
  while (cursor) {
    current++;
    const prev = new Date(new Date(cursor).getTime() - msDay).toISOString().slice(0, 10);
    if (days.has(prev)) cursor = prev;
    else break;
  }

  return { current, longest };
}

export function solveCalendar(problems, weeks = 12) {
  const counts = new Map();
  const msDay = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = (weeks * 7) - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * msDay);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  problems.forEach((p) => {
    const key = new Date(p.date_solved).toISOString().slice(0, 10);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  });
  return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

export async function getDashboard(userId) {
  const problems = await getProblems(userId);
  const ov = overview(problems);
  const tp = topicPerformance(problems);
  const st = streak(problems);

  const dueDate = startOfToday().toISOString();
  const { data: dueCards } = await supabase
    .from('memory_cards')
    .select('id, front_title, pattern, due_date, status')
    .eq('user_id', userId)
    .lte('due_date', dueDate)
    .order('due_date', { ascending: true })
    .limit(50);

  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('track', 'dsa')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let todayDay = null;
  let progressPercent = 0;
  if (roadmap) {
    const todayDate = startOfToday().toISOString().slice(0, 10);
    const { data: days } = await supabase
      .from('roadmap_days')
      .select('*')
      .eq('roadmap_id', roadmap.id)
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    const allDays = days || [];
    todayDay = allDays.find((d) => (d.date || '').slice(0, 10) === todayDate) || null;
    const done = allDays.filter((d) => d.status === 'done').length;
    progressPercent = allDays.length ? Math.round((done / allDays.length) * 100) : 0;
  }

  // SQL roadmap
  const { data: sqlRoadmap } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('track', 'sql')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sqlTodayDay = null;
  let sqlProgressPercent = 0;
  if (sqlRoadmap) {
    const todayDate = startOfToday().toISOString().slice(0, 10);
    const { data: days } = await supabase
      .from('roadmap_days')
      .select('*')
      .eq('roadmap_id', sqlRoadmap.id)
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    const allDays = days || [];
    sqlTodayDay = allDays.find((d) => (d.date || '').slice(0, 10) === todayDate) || null;
    const done = allDays.filter((d) => d.status === 'done').length;
    sqlProgressPercent = allDays.length ? Math.round((done / allDays.length) * 100) : 0;
  }

  const { data: todayReviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .gte('review_date', startOfToday().toISOString());

  // Resume-based roadmap
  const { data: resumeRoadmap } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('track', 'resume')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let resumeTodayDay = null;
  let resumeProgressPercent = 0;
  if (resumeRoadmap) {
    const todayDate = startOfToday().toISOString().slice(0, 10);
    const { data: days } = await supabase
      .from('roadmap_days')
      .select('*')
      .eq('roadmap_id', resumeRoadmap.id)
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    const allDays = days || [];
    resumeTodayDay = allDays.find((d) => (d.date || '').slice(0, 10) === todayDate) || null;
    const done = allDays.filter((d) => d.status === 'done').length;
    resumeProgressPercent = allDays.length ? Math.round((done / allDays.length) * 100) : 0;
  }

  return {
    overview: ov,
    topics: tp,
    streak: st,
    dueCards: dueCards || [],
    roadmap,
    todayDay,
    progressPercent,
    sqlRoadmap,
    sqlTodayDay,
    sqlProgressPercent,
    resumeRoadmap,
    resumeTodayDay,
    resumeProgressPercent,
    todayReviews: todayReviews ? todayReviews.length : 0,
  };
}
