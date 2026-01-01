import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export function Toast() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="toast-container">
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.type}`}
                    style={{
                        animationDelay: `${index * 100}ms`,
                    }}
                >
                    <div className="toast-icon">
                        {toast.type === 'success' && <CheckCircle size={20} />}
                        {toast.type === 'error' && <XCircle size={20} />}
                        {toast.type === 'info' && <Info size={20} />}
                    </div>
                    <div className="toast-message">{toast.message}</div>
                    <button
                        className="toast-close"
                        onClick={() => removeToast(toast.id)}
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}

            <style>{`
        .toast-container {
          position: fixed;
          top: var(--space-xl);
          right: var(--space-xl);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          pointer-events: none;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          min-width: 300px;
          max-width: 500px;
          pointer-events: auto;
          animation: slideInRight 0.3s ease-out, fadeIn 0.3s ease-out;
          backdrop-filter: blur(10px);
        }

        .toast-success {
          border-left: 4px solid var(--color-success);
        }

        .toast-error {
          border-left: 4px solid var(--color-error);
        }

        .toast-info {
          border-left: 4px solid var(--color-primary);
        }

        .toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .toast-success .toast-icon {
          color: var(--color-success);
        }

        .toast-error .toast-icon {
          color: var(--color-error);
        }

        .toast-info .toast-icon {
          color: var(--color-primary);
        }

        .toast-message {
          flex: 1;
          font-size: var(--font-size-sm);
          line-height: 1.4;
        }

        .toast-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-xs);
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .toast-close:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .toast-container {
            top: auto;
            bottom: var(--space-xl);
            left: var(--space-md);
            right: var(--space-md);
          }

          .toast {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
}
