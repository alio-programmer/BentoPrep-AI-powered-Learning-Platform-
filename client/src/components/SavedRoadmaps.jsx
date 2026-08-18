import { useState } from 'react';
import { Bookmark, Check, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import { Button, Modal, cn } from './ui.jsx';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function SavedRoadmaps({
  savedList = [],
  activeSavedId = null,
  onSelect,
  onSave,
  onDelete,
  isSaving = false,
  isSaved = false,
  hasActiveRoadmap = false,
  disabled = false,
  className = '',
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Saved plans select picker */}
      <div className="relative flex items-center">
        <select
          value={activeSavedId || ''}
          onChange={(e) => {
            if (e.target.value) {
              onSelect(e.target.value);
            }
          }}
          disabled={disabled || savedList.length === 0}
          className="h-8 max-w-[260px] rounded-lg border border-line bg-surface pl-2.5 pr-7 text-xs font-medium text-ink transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-50"
          title="Select from saved past roadmaps"
        >
          <option value="">
            {savedList.length === 0 ? 'No saved plans yet' : `Saved Plans (${savedList.length})…`}
          </option>
          {savedList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} · {s.duration_days}d ({s.progress_percent}% done) · {fmtDate(s.updated_at)}
            </option>
          ))}
        </select>
        <FolderOpen className="pointer-events-none absolute right-2 size-3.5 text-muted/70" />
      </div>

      {/* Save / Bookmark Button */}
      {hasActiveRoadmap && (
        <Button
          onClick={onSave}
          disabled={disabled || isSaving}
          size="sm"
          variant={isSaved ? 'secondary' : 'primary'}
          className={cn(
            'h-8 text-xs font-medium transition-all',
            isSaved && 'border-ok/30 bg-ok/10 text-ok hover:bg-ok/20 hover:text-ok'
          )}
          title={isSaved ? 'Plan is saved to library (click to update snapshot)' : 'Save this roadmap to your library'}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          ) : isSaved ? (
            <>
              <Check className="size-3 text-ok" /> Saved
            </>
          ) : (
            <>
              <Bookmark className="size-3" /> Save Plan
            </>
          )}
        </Button>
      )}

      {/* Delete button if an active saved plan is selected */}
      {activeSavedId && (
        <button
          type="button"
          onClick={() => {
            const target = savedList.find((s) => s.id === activeSavedId);
            if (target) setDeleteTarget(target);
          }}
          disabled={disabled}
          title="Delete this saved plan from library"
          className="inline-flex h-8 items-center rounded-lg border border-line bg-surface p-2 text-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete saved roadmap?"
        width="max-w-sm"
      >
        <p className="text-xs leading-relaxed text-muted">
          Are you sure you want to remove <span className="font-semibold text-ink">"{deleteTarget?.title}"</span> from your saved library?
          This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
