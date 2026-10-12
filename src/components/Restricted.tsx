import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { EmptyState } from './ui';

export function Restricted({ title = 'This area is outside this role', text }: { title?: string; text: string }) {
  return (
    <div className="page">
      <EmptyState
        icon={<Info size={28} aria-hidden="true" />}
        title={title}
        text={text}
        action={<Link className="btn btn-primary" to="/">Back to dashboard</Link>}
      />
    </div>
  );
}
