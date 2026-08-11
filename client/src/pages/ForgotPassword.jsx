import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import api from '../api/client.js';
import { Button, Input, Spinner } from '../components/ui.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
          <h1 className="text-xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">We'll email you a link to set a new one.</p>
        </div>
        {sent ? (
          <div className="space-y-4 rounded-xl border border-line bg-surface p-6 text-center">
            <MailCheck className="mx-auto size-8 text-ok" />
            <p className="text-sm">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
