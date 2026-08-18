import { Globe } from 'lucide-react';
import { cn } from './ui.jsx';

export function WebSearchToggle({
  enabled = false,
  onChange,
  disabled = false,
  size = 'sm',
  label = 'Search web',
  className = '',
  title = 'Search the web for up-to-date resources and documentation',
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      title={title}
      aria-pressed={enabled}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all select-none',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-xs',
        enabled
          ? 'border-accent/50 bg-accent/15 text-accent shadow-xs'
          : 'border-line bg-surface text-muted hover:border-line hover:bg-surface-2 hover:text-ink',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <Globe
        className={cn(
          'transition-transform',
          size === 'sm' ? 'size-3.5' : 'size-4',
          enabled ? 'text-accent animate-pulse' : 'text-muted group-hover:text-ink'
        )}
      />
      {label && <span>{label}</span>}
      <span
        className={cn(
          'inline-block size-1.5 rounded-full transition-colors',
          enabled ? 'bg-accent' : 'bg-muted/40'
        )}
      />
    </button>
  );
}
