import React from 'react';
import './Hero.css';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">
          The POS that works<br />when your internet doesn't
        </h1>
        <p className="hero-subtitle">
          Built for liquor stores. Process sales 100% offline.<br />
          Track inventory. Stay compliant. Never lose a sale.
        </p>
        <div className="hero-cta">
          <a href="#trial" className="btn btn-primary">Start free trial</a>
          <a href="#demo" className="btn btn-secondary">Watch demo</a>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-value">$0</div>
            <div className="stat-label">Lost sales during outages</div>
          </div>
          <div className="stat">
            <div className="stat-value">100%</div>
            <div className="stat-label">Offline functionality</div>
          </div>
          <div className="stat">
            <div className="stat-value">7 years</div>
            <div className="stat-label">Compliance logs stored</div>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="pos-mockup">
          <div className="status-badge">✓ WORKING OFFLINE</div>
          <div className="mockup-screen">
            <div className="mockup-header">LiquorPOS Checkout</div>
            <div className="mockup-items">
              <div className="mockup-item">
                <span>Jack Daniel's 750ml</span>
                <span>$24.99</span>
              </div>
              <div className="mockup-item">
                <span>Corona Extra 12pk</span>
                <span>$16.99</span>
              </div>
              <div className="mockup-item">
                <span>Grey Goose 1L</span>
                <span>$42.99</span>
              </div>
            </div>
            <div className="mockup-total">
              <span>Total</span>
              <span>$84.97</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

