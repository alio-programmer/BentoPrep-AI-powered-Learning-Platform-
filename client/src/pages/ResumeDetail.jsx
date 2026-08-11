import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Square, FileText, Save, RefreshCw } from 'lucide-react';
import api from '../api/client.js';
import { Button, Card, Input, Textarea, PageHeader, Spinner, Loading, Badge, cn } from '../components/ui.jsx';
import { fmt } from '../lib/markdown.jsx';

export default function ResumeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [hasKey, setHasKey] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const abortRef = useRef(null);

  useEffect(() => {
    api.get(`/resumes/${id}`)
      .then(({ data }) => {
        setResume(data.resume);
        setTargetRole(data.resume.target_role || '');
        setJobDesc(data.resume.job_description || '');
        setAnalysis(data.resume.ai_analysis || null);
      })
      .catch(() => navigate('/resumes'))
      .finally(() => setLoading(false));
    api.get('/tutor').then(({ data }) => setHasKey(data.hasKey)).catch(() => setHasKey(false));
  }, [id, navigate]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put(`/resumes/${id}`, { target_role: targetRole, job_description: jobDesc });
      setResume(data.resume);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysis(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data } = await api.post(`/resumes/${id}/analyze`, {}, { signal: controller.signal });
      setAnalysis({ content: data.analysis, analyzed_at: new Date().toISOString(), had_jd: Boolean(jobDesc) });
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        setAnalysisError(err.response?.data?.error || 'AI analysis failed.');
      }
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
    }
  };

  if (loading) return <Loading />;
  if (!resume) return <Loading />;

  return (
    <div>
      <PageHeader
        title={resume.name}
        subtitle="Extracted from your uploaded PDF."
        actions={
          <Button variant="secondary" onClick={() => navigate('/resumes')}>
            <ArrowLeft className="size-4" /> All resumes
          </Button>
        }
      />

      {error && <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="size-4 text-accent" />
              <h2 className="text-sm font-semibold">Context for Analysis</h2>
            </div>
            <div className="space-y-3">
              <Input label="Target role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Backend Engineer" />
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted">Job description (optional)</span>
                <Textarea
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Paste the job description to get a match % and skill-gap analysis."
                  rows={8}
                />
              </div>
              <Button onClick={save} disabled={saving} variant="secondary">
                {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
                {saved ? 'Saved' : 'Save context'}
              </Button>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-xs font-semibold">Extracted content</span>
              <span className="text-[10px] text-muted">{resume.content ? `${resume.content.length.toLocaleString()} chars` : 'Empty'}</span>
            </div>
            <pre className="max-h-[380px] overflow-y-auto p-4 text-[11px] leading-relaxed text-muted whitespace-pre-wrap">
              {resume.content || 'No text could be extracted from this PDF (it may be a scanned image).'}
            </pre>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Card className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <h2 className="text-sm font-semibold">AI Resume Analysis</h2>
                {analysis && <Badge color="ok">Saved</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {hasKey === false && (
                  <span className="text-[11px] text-muted">
                    Add your key in <a href="/settings" className="text-accent underline">Settings</a>
                  </span>
                )}
                <Button
                  variant={analyzing ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => (analyzing ? abortRef.current?.abort() : runAnalysis())}
                  disabled={!hasKey || analyzing}
                >
                  {analyzing ? <Square className="size-3.5" /> : analysis ? <RefreshCw className="size-3.5" /> : <Sparkles className="size-3.5" />}
                  {analyzing ? 'Stop' : analysis ? 'Re-analyze' : 'Analyze resume'}
                </Button>
              </div>
            </div>
            <div className="p-5">
              {analyzing ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner className="size-4" /> Analyzing your resume…
                </div>
              ) : analysisError ? (
                <p className="text-xs text-danger">{analysisError}</p>
              ) : analysis?.content ? (
                <div className="space-y-1 text-sm">{fmt(analysis.content)}</div>
              ) : (
                <p className="text-xs text-muted">
                  Run the analysis to get a structured report: overall assessment, ATS compatibility, strengths,
                  weaknesses, impact metrics, recommended keywords, and — if you pasted a job description — a job match
                  score and skill-gap breakdown.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
