import { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, Save, CheckCircle2, XCircle, Loader2, Cpu } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, Input, Select, PageHeader, Badge, cn } from '../components/ui.jsx';

export default function Settings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ provider: 'deepseek', model: '', baseUrl: '', apiKey: '' });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    api.get('/settings/ai').then(({ data }) => {
      setSettings(data);
      setForm({ provider: data.provider, model: data.model, baseUrl: data.baseUrl, apiKey: '' });
    });
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

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your AI key and profile." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">AI Provider & API Key</h2>
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
                    Key stored on the server (per user) — it never reaches the browser.
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
    </div>
  );
}
