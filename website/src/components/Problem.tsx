import React from 'react';
import './Problem.css';

const Problem: React.FC = () => {
  return (
    <section className="problem">
      <h2 className="section-title">The real cost of downtime</h2>
      <div className="problem-grid">
        <div className="problem-card">
          <div className="problem-stat">$1,500</div>
          <div className="problem-label">Average loss per internet outage</div>
          <p className="problem-desc">
            Internet goes down. POS stops working. Customers leave. Revenue lost.
          </p>
        </div>
        <div className="problem-card">
          <div className="problem-stat">$10,000+</div>
          <div className="problem-label">Cost of a single TTB violation</div>
          <p className="problem-desc">
            Can you export 7 years of age verification logs? Most systems can't.
          </p>
        </div>
        <div className="problem-card">
          <div className="problem-stat">40%</div>
          <div className="problem-label">Profit margin uncertainty</div>
          <p className="problem-desc">
            Without purchase history, you're pricing blind. Leaving money on the table.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Problem;

