import React from 'react';
import './Solution.css';

const Solution: React.FC = () => {
  return (
    <section className="solution">
      <h2 className="section-title">LiquorPOS solves this</h2>
      <div className="solution-grid">
        <div className="solution-card">
          <div className="solution-icon">✓</div>
          <h3>Works 100% offline</h3>
          <ul className="solution-list">
            <li>Process unlimited sales without internet</li>
            <li>Cash and card payments work</li>
            <li>Auto-sync when reconnected</li>
          </ul>
          <div className="solution-data">
            <strong>Result:</strong> $0 lost sales during outages
          </div>
        </div>
        
        <div className="solution-card">
          <div className="solution-icon">🔒</div>
          <h3>Compliance built-in</h3>
          <ul className="solution-list">
            <li>Every alcohol sale logged (encrypted)</li>
            <li>Export 7 years of records in 2 clicks</li>
            <li>Immutable audit trail</li>
          </ul>
          <div className="solution-data">
            <strong>Result:</strong> Pass TTB audits with confidence
          </div>
        </div>
        
        <div className="solution-card">
          <div className="solution-icon">📊</div>
          <h3>Purchase intelligence</h3>
          <ul className="solution-list">
            <li>Track when you bought + what you paid</li>
            <li>Real-time profit margin calculator</li>
            <li>Smart reorder alerts</li>
          </ul>
          <div className="solution-data">
            <strong>Result:</strong> Price with confidence, maximize profit
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;

