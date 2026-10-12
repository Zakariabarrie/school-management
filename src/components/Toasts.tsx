import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../state/store';

export function ToastViewport() {
  const { state, dismissToast } = useApp();
  useEffect(() => {
    if (state.toasts.length === 0) return;
    const timers = state.toasts.map((item) => window.setTimeout(() => dismissToast(item.id), 4200));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [state.toasts, dismissToast]);

  if (state.toasts.length === 0) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {state.toasts.map((item) => (
        <div key={item.id} className={`toast toast-${item.tone}`} role="status">
          <span>{item.title}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(item.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
