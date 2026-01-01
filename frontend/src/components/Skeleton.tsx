export function Skeleton({ className = '', width, height }: { className?: string; width?: string; height?: string }) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
            }}
        >
            <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--color-surface) 0%,
            var(--color-surface-hover) 50%,
            var(--color-surface) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: var(--radius-md);
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
        </div>
    );
}

export function ProductSearchSkeleton() {
    return (
        <div className="search-results-skeleton">
            {[1, 2, 3].map((i) => (
                <div key={i} className="product-card-skeleton">
                    <div className="product-info-skeleton">
                        <Skeleton width="60%" height="20px" />
                        <Skeleton width="40%" height="16px" />
                    </div>
                    <Skeleton width="60px" height="24px" />
                </div>
            ))}

            <style>{`
        .search-results-skeleton {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          padding: var(--space-md);
        }

        .product-card-skeleton {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }

        .product-info-skeleton {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          flex: 1;
        }
      `}</style>
        </div>
    );
}
