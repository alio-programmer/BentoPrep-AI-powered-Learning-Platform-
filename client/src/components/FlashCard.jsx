import { useState } from 'react';
import { cn } from './ui.jsx';

export default function FlashCard({ card, onFlip }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="card-flip mx-auto w-full max-w-xl cursor-pointer" onClick={() => {
      setFlipped((f) => !f);
      onFlip?.(flipped);
    }}>
      <div className={cn('card-flip-inner relative h-80', flipped && 'flipped')}>
        {/* Front */}
        <div className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-8 text-center shadow-lg">
          <span className="mb-3 rounded-full border border-line px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted uppercase">
            {card.pattern || 'Memory Card'}
          </span>
          <h2 className="text-2xl font-bold tracking-tight">{card.front_title}</h2>
          <p className="mt-4 text-xs text-muted">Click to reveal</p>
        </div>
        {/* Back */}
        <div className="card-face card-back absolute inset-0 overflow-y-auto rounded-2xl border border-accent/40 bg-surface p-6 shadow-lg">
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted uppercase">Core Insight</p>
              <p className="font-medium">{card.core_insight || '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted uppercase">Mental Trigger</p>
              <p className="text-muted italic">{card.mental_trigger || '—'}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-md bg-surface-2 px-2 py-1">Time: {card.time_complexity || '—'}</span>
              <span className="rounded-md bg-surface-2 px-2 py-1">Space: {card.space_complexity || '—'}</span>
            </div>
            {card.mistake && (
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted uppercase">My Mistake</p>
                <p className="text-muted">{card.mistake}</p>
              </div>
            )}
            {card.remember && (
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted uppercase">Remember</p>
                <p className="text-muted">{card.remember}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
