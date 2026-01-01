import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { productRepository } from './infrastructure/repositories/ProductRepository';

try {
    // Initialize local DB (Seed)
    productRepository.seedDefaults().catch(err => console.error("DB Seed Error:", err));

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
} catch (error) {
    console.error("Critical Startup Error:", error);
    document.body.innerHTML = `<div style="color:red; padding:20px;"><h1>Startup Error</h1><pre>${String(error)}</pre></div>`;
}
