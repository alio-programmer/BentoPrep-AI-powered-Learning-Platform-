import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from './ui.jsx';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SavedChats({ sessions, currentKey, onSelect, onNew, onDelete, disabled, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value);
        }}
        disabled={disabled}
        className="h-8 max-w-[240px] rounded-lg border border-line bg-surface px-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-50"
      >
        <option value="">
          {sessions.length === 0 ? 'Saved chats…' : `Saved chats (${sessions.length})…`}
        </option>
        {sessions.map((s) => (
          <option key={s.id} value={s.topic_key}>
            {s.topic_label || s.topic_key} · {s.message_count} msg · {fmtDate(s.updated_at)}
          </option>
        ))}
      </select>

      <button
        onClick={onNew}
        disabled={disabled}
        title="Start a new chat"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        <Plus className="size-3.5" />
        New
      </button>

      {currentKey && (
        <button
          onClick={() => onDelete(currentKey)}
          disabled={disabled}
          title="Delete this chat"
          className="inline-flex h-8 items-center rounded-lg p-2 text-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      <MessageSquare className="size-3.5 text-muted/60" />
    </div>
  );
}
