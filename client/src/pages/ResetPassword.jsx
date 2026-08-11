import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import api from '../api/client.js';
import { Button, Input, Spinner } from '../components/ui.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = params.get('access_token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!accessToken) {
      setError('Reset link is invalid or expired. Request a new one.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { access_token: accessToken, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            PP
          </div>
          <h1 className="text-xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted">Choose a strong password you'll remember.</p>
        </div>
        {done ? (
          <div className="space-y-4 rounded-xl border border-line bg-surface p-6 text-center">
            <CheckCircle2 className="mx-auto size-8 text-ok" />
            <p className="text-sm">Password updated. Redirecting to sign in…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
            <Input
              label="New password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
            />
            {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/login" className="font-medium text-accent hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
