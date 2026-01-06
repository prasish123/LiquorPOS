import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import './index.css'
import App from './App.tsx'
import { productRepository } from './infrastructure/repositories/ProductRepository';

// Initialize Sentry for error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE || 'development',
        integrations: [
            new Sentry.BrowserTracing({
                // Set sampling rate for performance monitoring
                tracePropagationTargets: [
                    'localhost',
                    /^https:\/\/api\.pos-omni\.example\.com/,
                ],
            }),
            new Sentry.Replay({
                // Session replay for debugging
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],
        
        // Performance Monitoring
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
        
        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
        
        // Release tracking
        release: import.meta.env.VITE_APP_VERSION || 'unknown',
        
        // Filter out sensitive data
        beforeSend(event, _hint) {
            // Remove sensitive data from breadcrumbs
            if (event.breadcrumbs) {
                event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                    if (breadcrumb.data) {
                        const { password, token, apiKey, ...safeData } = breadcrumb.data;
                        return { ...breadcrumb, data: safeData };
                    }
                    return breadcrumb;
                });
            }
            
            return event;
        },
    });
    
    console.log('✅ Sentry initialized for error tracking');
} else {
    console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
}

try {
    // Initialize local DB (Seed)
    productRepository.seedDefaults().catch(err => {
        console.error("DB Seed Error:", err);
        Sentry.captureException(err, {
            tags: { component: 'database', operation: 'seed' },
        });
    });

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
} catch (error) {
    console.error("Critical Startup Error:", error);
    
    // Report to Sentry
    Sentry.captureException(error, {
        tags: { component: 'startup', critical: true },
    });
    
    document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>Startup Error</h1><pre>${String(error)}</pre></div>`;
}
