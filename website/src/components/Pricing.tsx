import React from 'react';
import './Pricing.css';

const Pricing: React.FC = () => {
  return (
    <section className="pricing">
      <h2 className="section-title">Simple pricing</h2>
      <p className="pricing-subtitle">No surprises. No hidden fees. Cancel anytime.</p>
      
      <div className="pricing-card-container">
        <div className="pricing-card">
          <div className="pricing-header">
            <h3>Professional</h3>
            <div className="price">
              <span className="price-amount">$49</span>
              <span className="price-period">/month</span>
            </div>
          </div>
          
          <ul className="pricing-features">
            <li>✓ Unlimited transactions</li>
            <li>✓ Unlimited terminals</li>
            <li>✓ Unlimited users</li>
            <li>✓ 100% offline mode</li>
            <li>✓ Profit calculator</li>
            <li>✓ Purchase history tracking</li>
            <li>✓ Multi-channel pricing</li>
            <li>✓ Age verification logging</li>
            <li>✓ DoorDash + Uber Eats integration</li>
            <li>✓ Phone + email support</li>
            <li>✓ Free setup & training</li>
          </ul>
          
          <a href="#trial" className="btn btn-primary btn-full">Start 30-day free trial</a>
          
          <div className="pricing-note">
            <p><strong>No transaction fees from us.</strong> No long-term contract.</p>
          </div>
        </div>
      </div>

      <div className="pricing-additional">
        <div className="additional-item">
          <h4>💳 Payment Processing</h4>
          <p>Use your existing Stripe account (2.9% + $0.30). We can help you set up Stripe if needed. Stripe fees paid directly to Stripe, not us.</p>
        </div>
        <div className="additional-item">
          <h4>🖨️ Hardware</h4>
          <p>Use your existing equipment or purchase separately. Compatible with most barcode scanners, receipt printers, and cash drawers.</p>
        </div>
      </div>

      <div className="pricing-savings">
        <h3>Cost comparison: 3 terminals</h3>
        <div className="comparison">
          <div className="comparison-item">
            <div className="comparison-label">Typical POS</div>
            <div className="comparison-value">$95+/month</div>
            <div className="comparison-note">Base + per-terminal fees</div>
          </div>
          <div className="comparison-divider">vs</div>
          <div className="comparison-item highlight">
            <div className="comparison-label">LiquorPOS</div>
            <div className="comparison-value">$49/month</div>
            <div className="comparison-note">All terminals included</div>
          </div>
        </div>
        <div className="savings-result">
          ✓ Save $550+/year • Get features others charge $75+/month for
        </div>
      </div>
    </section>
  );
};

export default Pricing;

