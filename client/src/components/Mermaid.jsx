import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

let renderCounter = 0;

const MERMAID_LANGS = new Set(['mermaid', 'mmd', 'flowchart', 'graph']);

export function isMermaidLang(lang) {
  return MERMAID_LANGS.has(String(lang || '').toLowerCase());
}

const MERMAID_DIRECTION = /^(?:flowchart|graph)\s+(?:TB|TD|BT|LR|RL)\b/i;

const MERMAID_TYPE = /^(?:sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|journey|pie|gitGraph|mindmap|timeline|requirementDiagram|quadrantChart|xychart|block-beta|packet-beta|C4Context|C4Container|C4Component|C4Deployment|C4System|architecture-beta)\b/i;

const MERMAID_STRUCT = /^(?:subgraph|end|participant|actor|activate|deactivate|note|alt|else|opt|loop|par|rect|classDef|style|linkStyle|direction|autonumber)\b/i;

const MERMAID_ARROW = /(-->|--->|<--|->|\.->|\.\.\.|==>|=>|:::|~~~|--\||\|--|-\-o|\|\|--o{)/;

export function isMermaidStart(line) {
  const t = String(line || '').trim();
  return MERMAID_DIRECTION.test(t) || MERMAID_TYPE.test(t);
}

export function isMermaidContent(line) {
  const t = String(line || '').trim();
  if (t === '') return true;
  if (/^%%/.test(t)) return true;
  if (MERMAID_STRUCT.test(t)) return true;
  return MERMAID_ARROW.test(t);
}

export default function Mermaid({ code }) {
  const { dark } = useTheme();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const renderId = `mermaid-${Date.now()}-${++renderCounter}`;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: dark ? 'dark' : 'default',
          themeVariables: dark
            ? {
                darkMode: true,
                background: 'transparent',
                primaryColor: '#1e293b',
                primaryTextColor: '#e2e8f0',
                primaryBorderColor: '#334155',
                lineColor: '#94a3b8',
                secondaryColor: '#0f172a',
                tertiaryColor: '#1e293b',
                fontSize: '14px',
              }
            : undefined,
        });
        const result = await mermaid.render(renderId, code);
        if (alive) setSvg(result.svg);
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to render diagram');
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, dark]);

  if (error) {
    return (
      <div className="my-2 rounded-lg border border-danger/40 bg-danger-soft p-3">
        <p className="mb-1 text-xs font-semibold text-danger">Could not render diagram</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] text-muted">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-2 animate-pulse rounded-lg border border-line bg-surface-2 p-4 text-xs text-muted">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="my-2 overflow-x-auto rounded-lg border border-line bg-white p-3 dark:bg-transparent"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
