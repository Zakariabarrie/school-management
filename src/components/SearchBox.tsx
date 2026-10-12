import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildSearch } from '../lib/search';
import { useApp } from '../state/store';

export function SearchBox() {
  const { state, session } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hits = useMemo(() => (session ? buildSearch(state, session, query) : []), [state, session, query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="search" ref={ref}>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        placeholder="Search students, teachers, books…"
        value={query}
        aria-label="Search the school"
        aria-expanded={open}
        aria-controls="search-results"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open ? (
        <div id="search-results" className="search-pop" role="region" aria-label="Search results">
          {query.trim().length < 2 ? <p className="search-hint">Type at least two letters.</p> : null}
          {query.trim().length >= 2 && hits.length === 0 ? <p className="search-hint">No matches in the demonstration data.</p> : null}
          {hits.map((hit) => (
            <a
              key={hit.id}
              className="hit"
              href={hit.to}
              onClick={(event) => {
                event.preventDefault();
                setOpen(false);
                setQuery('');
                navigate(hit.to);
              }}
            >
              <span className="hit-kind">{hit.kind}</span>
              <strong>{hit.title}</strong>
              <span className="small">{hit.meta}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
