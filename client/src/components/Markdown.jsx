import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from '../context/ThemeContext.jsx';
import { cn } from './ui.jsx';
import Mermaid, { isMermaidLang } from './Mermaid.jsx';

export function inline(text, key) {
  // Render **bold**, *italic*, `code`, and _underline-ish_ inline styles.
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      parts.push(
        <code key={k++} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">{tok.slice(1, -1)}</code>
      );
    } else {
      parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span key={key}>{parts}</span>;
}

function CodeBlock({ code, language }) {
  const { dark } = useTheme();
  const lang = ['javascript', 'js', 'jsx', 'python', 'py', 'typescript', 'ts', 'tsx', 'java', 'cpp', 'c', 'go', 'ruby', 'sql', 'bash', 'json', 'html', 'css'].includes(language)
    ? language
    : 'javascript';
  return (
    <Highlight code={code} language={lang} theme={dark ? themes.nightOwl : themes.github}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="my-2 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: dark ? '#011627' : '#f6f8fa' }}>
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, j) => (
                  <span key={j} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

export function Markdown({ text }) {
  // Minimal markdown rendering: headings, lists, code blocks, inline styles.
  // Diagrams render as Mermaid only inside explicit ```mermaid code fences.
  const lines = text.split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let codeLang = '';

  const flushCode = (key) => {
    if (codeBuf.length) {
      const src = codeBuf.join('\n');
      out.push(
        isMermaidLang(codeLang)
          ? <Mermaid key={key} code={src} />
          : <CodeBlock key={key} code={src} language={codeLang} />
      );
      codeBuf = [];
      codeLang = '';
    }
  };

  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('```')) {
      if (inCode) {
        flushCode(`code-${i}`);
        inCode = false;
      } else {
        flushCode(`code-${i}`);
        inCode = true;
        codeLang = t.slice(3).trim();
      }
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }
    if (t.startsWith('### ')) {
      out.push(<h5 key={i} className="mt-3 mb-1 text-[13px] font-bold">{t.slice(4)}</h5>);
    } else if (t.startsWith('## ')) {
      out.push(<h4 key={i} className="mt-3 mb-1 text-sm font-bold">{t.slice(3)}</h4>);
    } else if (t.startsWith('# ')) {
      out.push(<h3 key={i} className="mt-3 mb-1 text-base font-bold">{t.slice(2)}</h3>);
    } else if (/^\d+\.\s/.test(t)) {
      const num = t.match(/^(\d+)\.\s/)[1];
      out.push(
        <div key={i} className="flex gap-2 py-0.5">
          <span className="w-4 shrink-0 text-right font-semibold text-accent">{num}.</span>
          <span>{inline(t.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      out.push(
        <div key={i} className="flex gap-1.5 py-0.5">
          <span className="text-accent">•</span>
          <span>{inline(t.slice(2))}</span>
        </div>
      );
    } else if (t.startsWith('> ')) {
      out.push(<blockquote key={i} className="my-1 border-l-2 border-accent/40 pl-2 italic text-muted">{inline(t.slice(2))}</blockquote>);
    } else if (t === '') {
      out.push(<div key={i} className="h-2" />);
    } else {
      out.push(<p key={i} className="py-0.5 leading-relaxed">{inline(t)}</p>);
    }
  });
  flushCode('code-final');
  return out;
}

export function Message({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm',
          isUser ? 'bg-accent text-white' : 'border border-line bg-surface-2'
        )}
      >
        {isUser ? content : <Markdown text={content} />}
      </div>
    </div>
  );
}
