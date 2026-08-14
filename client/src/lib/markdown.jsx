import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from '../context/ThemeContext.jsx';
import Mermaid, { isMermaidLang } from '../components/Mermaid.jsx';

export function inline(text, key) {
  // Render **bold**, *italic*, and `code` inline styles.
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
      parts.push(<code key={k++} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11px]">{tok.slice(1, -1)}</code>);
    } else {
      parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span key={key}>{parts}</span>;
}

const KNOWN_LANGS = [
  'javascript', 'js', 'jsx', 'python', 'py', 'typescript', 'ts', 'tsx',
  'java', 'cpp', 'c', 'go', 'ruby', 'sql', 'bash', 'json', 'html', 'css',
];

export function CodeBlock({ code, language }) {
  const { dark } = useTheme();
  const lang = KNOWN_LANGS.includes(language) ? language : 'javascript';
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

function isTableSeparator(t) {
  return t.includes('|') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(t);
}

// A table starts when a line with "|" is immediately followed by a separator row.
function isTableStart(lines, i) {
  const t = lines[i].trim();
  if (!t.includes('|')) return false;
  const next = lines[i + 1];
  return Boolean(next) && isTableSeparator(next.trim());
}

function splitRow(line) {
  let t = String(line || '').trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

function alignFromCell(cell) {
  const t = String(cell || '').trim();
  const left = t.startsWith(':');
  const right = t.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  return 'left';
}

function alignClass(align) {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return '';
}

function renderTable(header, align, body, key) {
  return (
    <div key={key} className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className={`border-b border-line bg-surface-2 px-3 py-1.5 font-semibold text-muted ${alignClass(align[i])}`}>
                {inline(h, i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={`border-b border-line px-3 py-1.5 align-top text-ink ${alignClass(align[ci])}`}>
                  {inline(cell, ci)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function fmt(text) {
  // Minimal markdown rendering: headings, lists, tables, code blocks, inline styles.
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

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('```')) {
      if (inCode) {
        flushCode(`code-${i}`);
        inCode = false;
      } else {
        flushCode(`code-${i}`);
        inCode = true;
        codeLang = t.slice(3).trim();
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(lines[i]);
      continue;
    }
    if (isTableStart(lines, i)) {
      const block = [lines[i]];
      let j = i + 1;
      while (j < lines.length) {
        const tj = lines[j].trim();
        if (tj === '' || !tj.includes('|')) break;
        block.push(lines[j]);
        j++;
      }
      const header = splitRow(block[0]);
      const align = splitRow(block[1]).map(alignFromCell);
      const body = block.slice(2).map(splitRow);
      out.push(renderTable(header, align, body, `table-${i}`));
      i = j - 1;
      continue;
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
  }
  flushCode('code-final');
  return out;
}
