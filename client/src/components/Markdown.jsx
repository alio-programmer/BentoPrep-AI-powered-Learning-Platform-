import { cn } from './ui.jsx';
import { fmt, inline } from '../lib/markdown.jsx';

export { inline };

export function Markdown({ text }) {
  return <>{fmt(text)}</>;
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
