import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import api from '../api/client.js';
import { Card, Badge, Loading, EmptyState, Button, PageHeader, Spinner } from '../components/ui.jsx';

export default function Resumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/resumes');
      setResumes(data.resumes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/resumes', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/resumes/${data.resume.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this resume and its analysis?')) return;
    await api.delete(`/resumes/${id}`);
    setResumes((r) => r.filter((x) => x.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="Resumes"
        subtitle="Upload your resume, get an AI analysis, and reuse it for job applications."
        actions={
          <div>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
            <Button size="lg" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner /> : <Upload className="size-4" />}
              {uploading ? 'Uploading…' : 'Upload Resume (PDF)'}
            </Button>
          </div>
        }
      />

      {error && <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}

      {loading ? (
        <Loading />
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          subtitle="Upload your resume as a PDF and BentoPrep will analyze it for ATS compatibility, strengths, weaknesses and skill gaps."
          action={<Button onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Upload your first resume</Button>}
        />
      ) : (
        <div className="space-y-2">
          {resumes.map((r) => (
            <Card key={r.id} className="group flex flex-wrap items-center gap-3 p-4 transition-colors hover:border-accent/40">
              <button
                onClick={() => navigate(`/resumes/${r.id}`)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold group-hover:text-accent">{r.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {r.target_role && <Badge color="info">{r.target_role}</Badge>}
                    {r.ai_analysis ? (
                      <Badge color="ok"><Sparkles className="size-3" /> Analyzed</Badge>
                    ) : (
                      <Badge>Not analyzed yet</Badge>
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/resumes/${r.id}`)}
                  className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-ink"
                  title="Open"
                >
                  <ArrowRight className="size-4" />
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
