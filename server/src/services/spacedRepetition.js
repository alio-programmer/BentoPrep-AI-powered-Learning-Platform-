// SM-2 inspired spaced repetition + memory card factory.

const LADDER = [1, 3, 7, 14, 30, 60];
const MAX_REPS = LADDER.length - 1;

export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Apply a review outcome to a card and return the new SRS state.
// outcome: 'forgotten' | 'difficult' | 'remembered'
export function applyReview(card, outcome) {
  let { repetitions = 0, interval_days = 0, ease_factor = 2.5 } = card || {};

  let reps = repetitions;
  let ease = Number(ease_factor);
  let interval = 1;

  if (outcome === 'forgotten') {
    reps = Math.max(0, reps - 2);
    ease = Math.max(1.3, ease - 0.2);
    interval = 1;
  } else if (outcome === 'difficult') {
    reps = Math.max(0, reps);
    ease = Math.max(1.3, ease - 0.1);
    interval = LADDER[Math.min(reps, MAX_REPS)] || 1;
  } else {
    reps = Math.min(reps + 1, MAX_REPS);
    ease = Math.min(2.6, ease + 0.05);
    interval = LADDER[reps];
  }

  return {
    repetitions: reps,
    interval_days: interval,
    ease_factor: Number(ease.toFixed(2)),
    due_date: addDays(today(), interval).toISOString(),
  };
}

// Build a memory card from a solved problem.
export function createCardFromProblem(problem) {
  const pattern = problem.pattern || problem.topic || '';
  const title = problem.name;
  const insight = problem.key_insight || '';
  const trigger = `"Need to solve something involving ${pattern || 'this pattern'} → think of ${pattern || 'the key insight'}."`;
  const mistake = problem.mistake || '';

  return {
    user_id: problem.user_id,
    problem_id: problem.id,
    front_title: title,
    pattern,
    core_insight: insight || pattern,
    mental_trigger: trigger,
    time_complexity: problem.time_complexity || '',
    space_complexity: problem.space_complexity || '',
    mistake,
    remember: problem.when_to_use || '',
    status: 'new',
    tags: problem.tags || [],
    due_date: today().toISOString(),
  };
}
