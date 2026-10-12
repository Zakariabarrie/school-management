import { useEffect } from 'react';
import { useApp } from '../state/store';

export function usePageTitle(title: string) {
  const { settings } = useApp();
  useEffect(() => {
    document.title = `${title} · ${settings.shortName}`;
  }, [title, settings.shortName]);
}
