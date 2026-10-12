import { Component, type ReactNode } from 'react';
import { clearStoredPayload } from '../state/store';

interface BoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal">
        <div>
          <h1>This page ran into a problem</h1>
          <p className="muted">The demonstration data in this browser may need to be restored.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => {
              clearStoredPayload();
              window.location.assign('/');
            }}
          >
            Restore demonstration
          </button>
        </div>
      </div>
    );
  }
}
