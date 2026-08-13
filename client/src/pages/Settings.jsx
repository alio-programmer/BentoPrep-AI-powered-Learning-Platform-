import { useEffect, useState } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Power,
  Star,
} from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, Input, Select, PageHeader, Badge, Modal, cn } from '../components/ui.jsx';

export default function Settings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [form, setForm] = useState({ provider: 'deepseek', model: '', baseUrl: '', apiKey: '' });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', provider: 'deepseek', model: '', baseUrl: '', apiKey: '', activate: true });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [busyId, setBusyId] = useState(null);

  const loadCredentials = async () => {
    const { data } = await api.get('/settings/ai/credentials');
    setCredentials(data.credentials || []);
  };

  useEffect(() => {
    api.get('/settings/ai').then(({ data }) => {
      setSettings(data);
      setForm({ provider: data.provider, model: data.model, baseUrl: data.baseUrl, apiKey: '' });
    });
    loadCredentials();
  }, []);

  const providerPreset = settings?.providers?.[form.provider];

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put('/settings/ai', {
        provider: form.provider,
        model: form.model || providerPreset?.model,
        baseUrl: form.baseUrl || providerPreset?.baseUrl,
        apiKey: form.apiKey || undefined,
      });
      setSettings((s) => ({ ...s, ...data }));
      setForm((f) => ({ ...f, apiKey: '' }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/settings/ai/test');
      setTestResult({ ok: true, reply: data.reply });
    } catch (err) {
      setTestResult({ ok: false, error: err.response?.data?.error || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const selectProvider = (p) => {
    const preset = settings?.providers?.[p];
    setForm((f) => ({ ...f, provider: p, model: preset?.model || '', baseUrl: preset?.baseUrl || '' }));
  };

  const openAdd = () => {
    setAddForm({ name: '', provider: 'deepseek', model: '', baseUrl: '', apiKey: '', activate: true });
    setAddError('');
    setAddOpen(true);
  };

  const addCredential = async () => {
    setAdding(true);
    setAddError('');
    try {
      const preset = settings?.providers?.[addForm.provider];
      const { data } = await api.post('/settings/ai/credentials', {
        name: addForm.name || addForm.provider,
        provider: addForm.provider,
        model: addForm.model || preset?.model,
        baseUrl: addForm.baseUrl || preset?.baseUrl,
        apiKey: addForm.apiKey,
        activate: addForm.activate,
      });
      if (addForm.activate) {
        setSettings((s) => ({
          ...s,
          provider: data.provider,
          model: data.model,
          baseUrl: data.baseUrl,
          hasKey: true,
          keyMasked: data.keyMasked,
        }));
        setForm((f) => ({ ...f, provider: data.provider, model: data.model, baseUrl: data.baseUrl, apiKey: '' }));
      }
      setAddOpen(false);
      loadCredentials();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to save credential.');
    } finally {
      setAdding(false);
    }
  };

  const activate = async (id) => {
    setBusyId(id);
    try {
      const { data } = await api.post(`/settings/ai/credentials/${id}/activate`);
      setSettings((s) => ({
        ...s,
        provider: data.provider,
        model: data.model,
        baseUrl: data.baseUrl,
        hasKey: data.hasKey,
      }));
      setForm((f) => ({ ...f, provider: data.provider, model: data.model, baseUrl: data.baseUrl, apiKey: '' }));
      loadCredentials();
    } finally {
      setBusyId(null);
    }
  };

  const openRename = (cred) => {
    setRenameTarget(cred);
    setRenameName(cred.name);
  };

  const renameCredential = async () => {
    if (!renameTarget || !renameName.trim()) return;
    setRenaming(true);
    try {
      await api.put(`/settings/ai/credentials/${renameTarget.id}`, { name: renameName.trim() });
      setRenameTarget(null);
      loadCredentials();
    } finally {
      setRenaming(false);
    }
  };

  const removeCredential = async (id) => {
    if (!confirm('Delete this saved credential?')) return;
    setBusyId(id);
    try {
      await api.delete(`/settings/ai/credentials/${id}`);
      setCredentials((list) => list.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const providerLabel = (key) => settings?.providers?.[key]?.label || key;
  const isActive = (cred) =>
    settings?.provider === cred.provider &&
    settings?.model === cred.model &&
    settings?.baseUrl === cred.baseUrl;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your AI keys and profile." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">Active AI Provider</h2>
            </div>

            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-xs font-medium text-muted">Provider</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(settings?.providers || {}).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectProvider(key)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                        form.provider === key
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line text-muted hover:border-accent/40'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  Any OpenAI-compatible endpoint works — DeepSeek, local Ollama, or your own gateway.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder={providerPreset?.model || 'e.g. deepseek-chat'}
                />
                <Input
                  label="Base URL"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder={providerPreset?.baseUrl || 'https://api.deepseek.com'}
                />
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted">API key</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      placeholder={
                        settings?.hasKey ? `${settings.keyMasked} — leave blank to keep` : 'sk-••••••••••••'
                      }
                      className="h-9 w-full rounded-lg border border-line bg-surface px-3 pr-10 font-mono text-sm placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/60"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink"
                    >
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save
                  </Button>
                </div>
                {settings?.hasKey && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    Key encrypted at rest (AES-256-GCM) — it never reaches the browser.
                  </p>
                )}
                {saved && <p className="mt-1.5 text-[11px] text-ok">Saved successfully.</p>}
              </div>

              <div className="border-t border-line pt-4">
                <Button variant="secondary" onClick={test} disabled={testing || !settings?.hasKey}>
                  {testing ? <Loader2 className="size-4 animate-spin" /> : <Cpu className="size-4" />}
                  Test connection
                </Button>
                {testResult && (
                  <div className="mt-3">
                    {testResult.ok ? (
                      <div className="flex items-start gap-2 rounded-lg bg-ok-soft p-3 text-xs text-ok">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-semibold">Connection successful</p>
                          <p className="mt-0.5 text-muted">Model replied: "{testResult.reply}"</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-xs text-danger">
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-semibold">Connection failed</p>
                          <p className="mt-0.5 break-all text-muted">{testResult.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-accent" />
                <h2 className="text-sm font-semibold">Saved Credentials</h2>
              </div>
              <Button size="sm" onClick={openAdd}>
                <Plus className="size-4" />
                Add credential
              </Button>
            </div>

            {credentials.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                No saved credentials yet. Add one to quickly switch between providers or API keys.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {credentials.map((cred) => {
                  const active = isActive(cred);
                  return (
                    <li key={cred.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{cred.name}</span>
                          {active && <Badge color="ok">Active</Badge>}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted">
                          {providerLabel(cred.provider)} · {cred.keyMasked || 'no key'}
                          {cred.model ? ` · ${cred.model}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="outline" size="sm" disabled={active} onClick={() => activate(cred.id)}>
                          {busyId === cred.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Power className="size-3.5" />
                          )}
                          Use
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openRename(cred)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted hover:bg-danger/15 hover:text-danger"
                          onClick={() => removeCredential(cred.id)}
                          disabled={busyId === cred.id}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-sm font-semibold">Profile</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] text-muted">Name</p>
                <p className="font-medium">{profile?.display_name || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Target role</p>
                <p className="font-medium">{profile?.target_role || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Level</p>
                <p className="font-medium">{profile?.dsa_level || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Target</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(profile?.target_companies || []).map((c) => (
                    <Badge key={c} color="accent">{c}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted">Daily study</p>
                <p className="font-medium">{profile?.daily_hours || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Days to target</p>
                <p className="font-medium">{profile?.days_target || '—'}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-sm font-semibold">Coming in Phase 2</h2>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>• AI Tutor (hint / socratic / explain modes)</li>
              <li>• Mock interviews</li>
              <li>• Company-specific tracks</li>
              <li>• Resume & JD analysis</li>
              <li>• SQL & system design modules</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add credential"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addCredential} disabled={adding}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {addError && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{addError}</p>
          )}
          <Input
            label="Name"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            placeholder="e.g. DeepSeek (work)"
          />
          <Select
            label="Provider"
            value={addForm.provider}
            onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })}
          >
            {Object.entries(settings?.providers || {}).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Model"
              value={addForm.model}
              onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
              placeholder={settings?.providers?.[addForm.provider]?.model || 'e.g. deepseek-chat'}
            />
            <Input
              label="Base URL"
              value={addForm.baseUrl}
              onChange={(e) => setAddForm({ ...addForm, baseUrl: e.target.value })}
              placeholder={settings?.providers?.[addForm.provider]?.baseUrl || 'https://api.deepseek.com'}
            />
          </div>
          <Input
            label="API key"
            type="password"
            autoComplete="off"
            value={addForm.apiKey}
            onChange={(e) => setAddForm({ ...addForm, apiKey: e.target.value })}
            placeholder="sk-••••••••••••"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={addForm.activate}
              onChange={(e) => setAddForm({ ...addForm, activate: e.target.checked })}
              className="size-4 accent-accent"
            />
            Activate this credential immediately
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename credential"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={renameCredential} disabled={renaming || !renameName.trim()}>
              {renaming ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Name"
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}
