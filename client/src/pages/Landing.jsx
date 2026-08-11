import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  Brain,
  Repeat,
  Target,
  Sparkles,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Code2,
  Database,
  Boxes,
  Activity,
  Layers,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Landing() {
  const { dark, toggle } = useTheme();
  
  // Hero Widget State
  const [heroAnswerRevealed, setHeroAnswerRevealed] = useState(false);

  // Interactive Playground State (Memory Card, Active Recall, Spaced Repetition)
  const [playgroundTab, setPlaygroundTab] = useState('card');
  const [activeRecallRevealed, setActiveRecallRevealed] = useState(false);
  const [selectedRecallRating, setSelectedRecallRating] = useState('Good');

  // AI Section Accordion State
  const [activeAiFeature, setActiveAiFeature] = useState(0);

  const recallRatings = [
    { label: 'Again', interval: '1 day', desc: 'Forgot completely', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
    { label: 'Hard', interval: '3 days', desc: 'Recalled with effort', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { label: 'Good', interval: '7 days', desc: 'Correct recall', color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
    { label: 'Easy', interval: '14 days', desc: 'Perfect recall', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  ];

  const retentionLoopSteps = [
    { num: '01', name: 'SOLVE', desc: 'Solve DSA, SQL, or System Design questions in your environment.' },
    { num: '02', name: 'UNDERSTAND', desc: 'Identify the underlying pattern, time/space constraints, and invariants.' },
    { num: '03', name: 'SAVE YOUR APPROACH', desc: 'Log your mental trigger, key insight, and personal mistake notes.' },
    { num: '04', name: 'FORGET', desc: 'Natural memory decay occurs over hours and days.' },
    { num: '05', name: 'RECALL', desc: 'BentoPrep prompts active retrieval before showing the solution.' },
    { num: '06', name: 'REVIEW', desc: 'Rate your recall difficulty to update the SM-2 algorithm.' },
    { num: '07', name: 'REMEMBER', desc: 'Pattern moves into permanent long-term memory for interview day.' },
  ];

  const aiCapabilities = [
    {
      title: 'Extract patterns from your solutions',
      desc: 'You record the pattern behind each solution (e.g. Two-Pointers, Sliding Window, Monotonic Stack), and BentoPrep turns it into a structured memory card.',
      codeSnippet: `// Pattern Extracted: Sliding Window (Variable Length)
// Invariant: window sum <= target
while (right < nums.length) {
  currentSum += nums[right];
  while (currentSum > target) {
    currentSum -= nums[left++];
  }
  maxLength = Math.max(maxLength, right - left + 1);
}`,
    },
    {
      title: 'Generate active-recall questions',
      desc: 'The AI tutor asks Socratic questions that guide you to recall edge cases and invariants on your own.',
      codeSnippet: `Question: "What happens to the pointer boundary when mid equals target in lower-bound Binary Search?"
Hint: "Focus on maintaining the invariant that target is always inside [low, high]."`,
    },
    {
      title: 'Identify weak concepts',
      desc: 'Tracks your recall ratings across topics to highlight where your memory is weakest and prioritizes those for review.',
      codeSnippet: `Weak Topic Detected: Topological Sort
Confidence: Low
→ 3 review cards scheduled for this week.`,
    },
    {
      title: 'Explain mistakes without spoiling solutions',
      desc: 'When you get stuck, the AI Tutor provides incremental Socratic hints that guide your reasoning without handing you the answers.',
      codeSnippet: `User: "I keep getting TLE on 3Sum."
Tutor: "Notice that for each fixed element i, you are running an O(N) search. Have you sorted the array first to allow a two-pointer scan?"`,
    },
    {
      title: 'Recommend what to review daily',
      desc: 'Builds your daily review queue from due memory cards and today\'s roadmap tasks.',
      codeSnippet: `Queue Priority for Today:
1. Binary Tree Vertical Order (Due today - High Decay)
2. SQL CTE Window Aggregation (Due today)
3. System Design: Rate Limiter Token Bucket (Review scheduled)`,
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent/20 font-sans">
      {/* Minimal Tech Grid Pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.03] dark:opacity-[0.04]">
        <div className="grid-pattern absolute inset-0" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-accent text-xs font-bold text-white">
              P
            </div>
            <span className="text-sm font-bold tracking-tight text-ink">BentoPrep</span>
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-medium text-muted md:flex">
            <a href="#product" className="transition-colors hover:text-ink">
              Product
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-ink">
              How It Works
            </a>
            <a href="#analytics" className="transition-colors hover:text-ink">
              Analytics
            </a>
            <a href="#ai" className="transition-colors hover:text-ink">
              AI Capabilities
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="flex size-8 items-center justify-center rounded border border-line bg-surface text-muted transition-colors hover:text-ink"
              aria-label="Toggle Theme"
            >
              {dark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-indigo-400" />}
            </button>
            <Link to="/login" className="text-xs font-medium text-muted transition-colors hover:text-ink">
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-accent/90"
            >
              Start Preparing <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section: Two-Column Product-First Layout */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          
          {/* Left Column: Product Value Proposition */}
          <div className="lg:col-span-6">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl text-ink leading-tight">
              Stop solving the same problem twice.
            </h1>

            <p className="mt-5 text-sm sm:text-base text-muted leading-relaxed max-w-xl">
              BentoPrep turns the DSA, SQL, and System Design problems you solve into long-term memories — then brings them back through active recall and spaced repetition.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-accent/90"
              >
                Start Preparing <ArrowRight className="size-3.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded border border-line bg-surface px-5 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-line/60">
              <span className="font-mono text-xs text-muted font-medium tracking-wide">
                DSA · SQL · System Design
              </span>
            </div>
          </div>

          {/* Right Column: Actual Product Interface (The Hero Visual) */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-accent" />
                  <span className="font-mono text-[11px] font-bold tracking-wider text-muted uppercase">
                    TODAY'S RECALL
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted">Card 1 of 8</span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-ink">Binary Search</span>
                  <span className="rounded bg-surface-2 border border-line px-2 py-0.5 font-mono text-[10px] text-muted">
                    Medium · DSA
                  </span>
                </div>

                <div className="mt-4 rounded-lg border border-line bg-bg p-4">
                  <p className="text-xs text-muted leading-relaxed font-sans">
                    <strong className="text-ink font-semibold">Prompt:</strong> "Explain the invariant behind binary search."
                  </p>

                  <AnimatePresence>
                    {heroAnswerRevealed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-line text-xs font-mono text-violet-300"
                      >
                        <p className="text-[11px]">
                          Invariant: Search range [low, high] is guaranteed to contain target if target exists. In each iteration, mid eliminates half the range while maintaining the invariant.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setHeroAnswerRevealed(!heroAnswerRevealed)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-mono font-medium text-accent hover:underline"
                  >
                    {heroAnswerRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {heroAnswerRevealed ? '[ Hide Answer ]' : '[ Reveal Answer ]'}
                  </button>
                </div>

                {/* Real Memory Strength Bar */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted">Memory Strength</span>
                    <span className="font-bold text-emerald-400">82%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-surface-2">
                    <div className="h-full bg-emerald-500 rounded" style={{ width: '82%' }} />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted pt-1">
                    <span>Last reviewed: 4 days ago</span>
                    <span className="text-violet-400 font-medium">Next review: In 3 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Reworked Interactive Playground: "How BentoPrep Remembers" */}
      <section id="product" className="relative z-10 border-t border-line bg-surface/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <span className="font-mono text-xs text-accent font-semibold tracking-wider uppercase">
              Product Demonstration
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              How BentoPrep Remembers
            </h2>
            <p className="mt-2 text-xs text-muted sm:text-sm max-w-lg mx-auto">
              From a solved problem to permanent pattern retention in three interactive states.
            </p>

            {/* Interactive Playground State Tabs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {[
                { id: 'card', label: '1. MEMORY CARD', desc: 'Structured Recall' },
                { id: 'recall', label: '2. ACTIVE RECALL', desc: 'Self Testing' },
                { id: 'spaced', label: '3. SPACED REPETITION', desc: 'Decay Curve' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPlaygroundTab(tab.id)}
                  className={`rounded border px-4 py-2 text-xs font-mono transition-all ${
                    playgroundTab === tab.id
                      ? 'border-accent bg-accent/15 text-accent font-bold'
                      : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Playground Container */}
          <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {playgroundTab === 'card' && (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="grid gap-6 lg:grid-cols-12"
                >
                  <div className="lg:col-span-7">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="font-mono text-sm font-bold text-ink">
                        Memory Card: LRU Cache
                      </span>
                      <span className="font-mono text-[10px] text-muted border border-line px-2 py-0.5 rounded">
                        System Design & LLD
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 font-mono text-xs">
                      <div className="rounded border border-line bg-bg p-3">
                        <span className="text-violet-400 font-semibold">// Mental Trigger:</span>
                        <p className="mt-1 text-muted font-sans">
                          Fast O(1) lookup + O(1) removal order = HashMap + Doubly Linked List.
                        </p>
                      </div>

                      <div className="rounded border border-line bg-bg p-3">
                        <span className="text-emerald-400 font-semibold">// Key Approach:</span>
                        <p className="mt-1 text-muted font-sans">
                          Use dummy head & tail nodes to avoid null checks when inserting or deleting node pointers.
                        </p>
                      </div>

                      <div className="rounded border border-line bg-bg p-3">
                        <span className="text-amber-400 font-semibold">// Common Pitfall Logged:</span>
                        <p className="mt-1 text-muted font-sans">
                          Forgot to update map reference when evicting tail.prev node on capacity overflow.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between rounded border border-line bg-bg p-5 font-mono text-xs">
                    <div>
                      <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Complexity & Bounds</span>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between border-b border-line/50 pb-1.5">
                          <span className="text-muted">Time Complexity:</span>
                          <span className="text-emerald-400 font-bold">O(1) get & put</span>
                        </div>
                        <div className="flex justify-between border-b border-line/50 pb-1.5">
                          <span className="text-muted">Space Complexity:</span>
                          <span className="text-ink">O(Capacity)</span>
                        </div>
                        <div className="flex justify-between border-b border-line/50 pb-1.5">
                          <span className="text-muted">Review Interval:</span>
                          <span className="text-violet-400">7 Days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">SM-2 Factor:</span>
                          <span className="text-ink">2.5</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted">
                      Card logged automatically upon solving problem.
                    </div>
                  </div>
                </motion.div>
              )}

              {playgroundTab === 'recall' && (
                <motion.div
                  key="recall"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="font-mono text-sm font-bold text-ink">
                      Active Recall Prompt: Lowest Common Ancestor (BST)
                    </span>
                    <span className="font-mono text-[10px] text-muted">Attempt Active Recall</span>
                  </div>

                  <div className="mt-4 rounded border border-line bg-bg p-4 font-mono text-xs">
                    <p className="text-ink font-sans font-medium">
                      Question: "What is the key property of BST that allows finding LCA in O(H) time without parent pointers?"
                    </p>

                    <AnimatePresence>
                      {activeRecallRevealed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-line text-emerald-400 font-mono text-[11px] leading-relaxed"
                        >
                          Answer: If both p and q are smaller than root, LCA is in left subtree. If both are larger, LCA is in right subtree. The first split node where p and q diverge IS the LCA!
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={() => setActiveRecallRevealed(!activeRecallRevealed)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-mono font-medium text-accent hover:underline"
                    >
                      {activeRecallRevealed ? '[ Hide Answer ]' : '[ Reveal Solution Pattern ]'}
                    </button>
                  </div>

                  <div className="mt-5">
                    <p className="font-mono text-[11px] text-muted mb-2">How well did you recall this approach?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                      {recallRatings.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => setSelectedRecallRating(r.label)}
                          className={`rounded border p-2.5 text-left transition-all ${
                            selectedRecallRating === r.label ? r.color + ' font-bold' : 'border-line bg-bg text-muted hover:text-ink'
                          }`}
                        >
                          <div className="font-bold">{r.label}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">Interval: {r.interval}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {playgroundTab === 'spaced' && (
                <motion.div
                  key="spaced"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="grid gap-6 lg:grid-cols-12"
                >
                  <div className="lg:col-span-6 space-y-3 font-mono text-xs">
                    <div className="border border-line bg-bg p-4 rounded">
                      <span className="text-muted text-[11px] uppercase font-bold">Memory Retention Model</span>
                      <p className="mt-2 text-ink font-sans text-xs leading-relaxed">
                        Without active recall, human memory decays exponentially (Ebbinghaus curve). BentoPrep schedules reviews right before memory drop-off occurs.
                      </p>
                    </div>

                    <div className="border border-line bg-bg p-4 rounded space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Review #1 (Immediate):</span>
                        <span className="text-ink">1 Day</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Review #2 (Successful Recall):</span>
                        <span className="text-ink">3 Days</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Review #3 (Pattern Solidified):</span>
                        <span className="text-violet-400">7 Days</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Review #4 (Long-Term Memory):</span>
                        <span className="text-emerald-400 font-bold">21 Days</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 border border-line bg-bg p-5 rounded font-mono text-xs flex flex-col justify-between">
                    <div>
                      <span className="text-accent font-bold">SM-2 Algorithm Schedule</span>
                      <p className="mt-2 text-muted font-sans text-xs">
                        Each problem has a unique repetition interval `I(n) = I(n-1) * EF` calculated dynamically based on your actual performance rating.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-line">
                      <div className="flex items-center justify-between text-ink font-bold">
                        <span>Target Interview Readiness:</span>
                        <span className="text-emerald-400">92% Retention</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Visual Story Section: The Retention Loop */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-12 text-center">
          <span className="font-mono text-xs text-accent font-semibold tracking-wider uppercase">
            System Workflow
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            The Continuous Retention Loop
          </h2>
          <p className="mt-2 text-xs text-muted sm:text-sm max-w-md mx-auto">
            How BentoPrep converts one-time problem solving into permanent memory.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 font-mono">
          {retentionLoopSteps.map((step, idx) => (
            <div
              key={step.name}
              className="relative rounded border border-line bg-surface p-4 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-accent">{step.num}</span>
                <h3 className="mt-1 text-xs font-bold text-ink tracking-tight">{step.name}</h3>
                <p className="mt-2 font-sans text-[11px] text-muted leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* "Show the Difference" Product Analytics Section */}
      <section id="analytics" className="relative z-10 border-t border-line bg-surface/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl max-w-2xl mx-auto">
              "You've solved 200 problems. How many can you solve again without looking?"
            </h2>
            <p className="mt-3 text-xs text-muted sm:text-sm">
              Real product metrics that show actual memory retention instead of vanity question counters.
            </p>
            <p className="mt-1.5 text-[10px] text-muted/70 font-mono">
              Sample data shown for demonstration.
            </p>
          </div>

          {/* Product Analytics Dashboard Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
            <div className="rounded border border-line bg-surface p-5">
              <span className="text-xs text-muted font-medium">Problems Solved</span>
              <div className="mt-2 text-3xl font-extrabold text-ink">237</div>
              <span className="mt-1 block text-[10px] text-muted">Across DSA, SQL & System Design</span>
            </div>

            <div className="rounded border border-line bg-surface p-5">
              <span className="text-xs text-muted font-medium">Memory Strength</span>
              <div className="mt-2 text-3xl font-extrabold text-emerald-400">82%</div>
              <span className="mt-1 block text-[10px] text-emerald-500/80">Active recall confidence</span>
            </div>

            <div className="rounded border border-line bg-surface p-5">
              <span className="text-xs text-muted font-medium">Problems Due Today</span>
              <div className="mt-2 text-3xl font-extrabold text-violet-400">18</div>
              <span className="mt-1 block text-[10px] text-muted">Scheduled spaced reviews</span>
            </div>

            <div className="rounded border border-line bg-surface p-5">
              <span className="text-xs text-muted font-medium">Weak Concepts</span>
              <div className="mt-2 text-3xl font-extrabold text-amber-400">4</div>
              <span className="mt-1 block text-[10px] text-amber-500/80">Require pattern reinforcement</span>
            </div>
          </div>

          {/* Detailed Topic Mastery Breakdown */}
          <div className="mt-6 rounded border border-line bg-surface p-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-bold text-ink">Topic Mastery & Retention Profile</span>
              <span className="text-muted text-[10px]">Updated in real-time</span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Two Pointers & Sliding Window</span>
                  <span className="text-emerald-400 font-bold">94%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded" style={{ width: '94%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Trees & Graph Traversal</span>
                  <span className="text-emerald-400 font-bold">81%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 rounded overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded" style={{ width: '81%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted">Dynamic Programming & Memo</span>
                  <span className="text-amber-400 font-bold">64%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 rounded overflow-hidden">
                  <div className="h-full bg-amber-400 rounded" style={{ width: '64%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Section: AI as a Supporting Capability */}
      <section id="ai" className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mb-12 text-center">
          <span className="font-mono text-xs text-accent font-semibold tracking-wider uppercase">
            Supporting Capability
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            AI that strengthens your preparation.
          </h2>
          <p className="mt-2 text-xs text-muted sm:text-sm max-w-lg mx-auto">
            AI operates silently behind the scenes to extract patterns, generate recall prompts, and identify weak spots.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* AI Feature Selector */}
          <div className="lg:col-span-5 space-y-2">
            {aiCapabilities.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActiveAiFeature(idx)}
                className={`w-full rounded border p-4 text-left font-mono text-xs transition-all ${
                  activeAiFeature === idx
                    ? 'border-accent bg-accent/10 text-ink font-bold'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{item.title}</span>
                  <ChevronRight className={`size-3.5 transition-transform ${activeAiFeature === idx ? 'rotate-90 text-accent' : ''}`} />
                </div>
              </button>
            ))}
          </div>

          {/* AI Output Console */}
          <div className="lg:col-span-7 rounded border border-line bg-surface p-6 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-line pb-3 text-muted">
                <Sparkles className="size-4 text-accent" />
                <span className="font-bold text-ink">{aiCapabilities[activeAiFeature].title}</span>
              </div>
              <p className="mt-3 text-muted font-sans text-xs leading-relaxed">
                {aiCapabilities[activeAiFeature].desc}
              </p>
              <div className="mt-4 rounded border border-line bg-bg p-4 text-[11px] text-violet-300 font-mono overflow-x-auto">
                <pre>{aiCapabilities[activeAiFeature].codeSnippet}</pre>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-line text-[10px] text-muted">
              Bring Your Own Key (OpenAI, DeepSeek, or any OpenAI-compatible endpoint) • 100% Privacy
            </div>
          </div>
        </div>
      </section>

      {/* Technical Open Key & Privacy Card */}
      <section className="relative z-10 border-t border-line bg-surface/30 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded border border-line bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-ink font-mono">100% Privacy & Open Key Control</h3>
              <p className="mt-1 text-xs text-muted max-w-lg font-sans leading-relaxed">
                Your API key is stored securely in your account settings and never exposed to the browser. BentoPrep never locks you into monthly AI markup fees.
              </p>
            </div>
            <div className="shrink-0 font-mono text-xs font-semibold text-accent border border-accent/30 bg-accent/10 px-4 py-2 rounded">
              Zero Subscription Lock-in
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer CTA Banner */}
      <section className="relative z-10 border-t border-line bg-bg py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Stop solving the same problem twice.
          </h2>
          <p className="mt-3 text-xs text-muted sm:text-sm">
            Start building permanent long-term memory for your technical interviews today.
          </p>
          <div className="mt-6">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-xs font-semibold text-white transition-all hover:bg-accent/90"
            >
              Start Preparing Free <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-line bg-surface py-8 text-xs text-muted">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded bg-accent text-white flex items-center justify-center text-[10px] font-bold">
              P
            </div>
            <span className="text-ink font-bold">BentoPrep</span>
            <span className="text-[11px] text-muted">— Spaced Repetition OS</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <Link to="/login" className="hover:text-ink transition-colors">Log in</Link>
            <Link to="/register" className="hover:text-ink transition-colors">Register</Link>
            <a href="#product" className="hover:text-ink transition-colors">Product</a>
            <a href="#analytics" className="hover:text-ink transition-colors">Analytics</a>
          </div>

          <div className="text-[10px] opacity-60">
            © {new Date().getFullYear()} BentoPrep
          </div>
        </div>
      </footer>
    </div>
  );
}
