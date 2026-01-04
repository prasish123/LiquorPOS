import React from 'react';
import './CTA.css';

const CTA: React.FC = () => {
  return (
    <section className="cta">
      <div className="cta-content">
        <h2>Stop losing sales during internet outages</h2>
        <p>30-day free trial. Setup help included. No credit card required.</p>
        <div className="cta-buttons">
          <a href="#trial" className="btn btn-primary">Start free trial</a>
          <a href="#demo" className="btn btn-secondary">Book a demo</a>
        </div>
        <div className="cta-contact">
          <p>
            <strong>Questions?</strong> Call <a href="tel:5551234567">(555) 123-4567</a> or email <a href="mailto:hello@liquorpos.com">hello@liquorpos.com</a>
          </p>
        </div>
      </div>
      <footer className="footer">
        <p>© 2026 LiquorPOS. All rights reserved.</p>
      </footer>
    </section>
  );
};

export default CTA;

