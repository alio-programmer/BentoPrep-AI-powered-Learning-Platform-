import { X } from 'lucide-react';

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 cursor-pointer';
  const variants = {
    primary: 'bg-accent text-white hover:brightness-110 shadow-sm shadow-accent/25',
    secondary: 'bg-surface-2 text-ink hover:bg-line/50 border border-line',
    ghost: 'text-muted hover:text-ink hover:bg-surface-2',
    danger: 'bg-danger/15 text-danger hover:bg-danger/25',
    ok: 'bg-ok/15 text-ok hover:bg-ok/25 border border-ok/30',
    outline: 'border border-line text-ink hover:bg-surface-2',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-sm',
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function Input({ label, error, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      <input
        className={cn(
          'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/60',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent',
          className
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      <textarea
        className={cn(
          'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/60',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent min-h-[80px]',
          className
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Select({ label, error, children, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      <select
        className={cn(
          'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/60',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-surface p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({ color = 'default', className, children }) {
  const colors = {
    default: 'bg-surface-2 text-muted border-line',
    accent: 'bg-accent-soft text-accent',
    ok: 'bg-ok-soft text-ok',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
    info: 'bg-info-soft text-info',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted">
      <Spinner className="size-6" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-16 px-6 text-center">
      {Icon && <Icon className="size-8 text-muted/50" />}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="max-w-sm text-xs text-muted">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-2xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className={cn('mt-10 w-full rounded-xl border border-line bg-surface shadow-2xl', width)}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
