import React from 'react';
import './FAQ.css';

const FAQ: React.FC = () => {
  return (
    <section className="faq">
      <h2 className="section-title">Frequently asked questions</h2>
      
      <div className="faq-grid">
        <div className="faq-item">
          <h3>What happens if my internet goes down?</h3>
          <p>Your POS keeps working. Process unlimited sales offline. Everything syncs automatically when internet returns. Zero lost sales.</p>
        </div>
        
        <div className="faq-item">
          <h3>Do I need special hardware?</h3>
          <p>No. Works on any Windows PC, Mac, or tablet. Use your existing barcode scanner, receipt printer, and cash drawer.</p>
        </div>
        
        <div className="faq-item">
          <h3>What about credit card processing?</h3>
          <p>Use your existing Stripe account (2.9% + $0.30 - you pay Stripe directly). We can help you set up Stripe in 1 day. We don't charge transaction fees.</p>
        </div>
        
        <div className="faq-item">
          <h3>How long does setup take?</h3>
          <p>2-4 hours. We provide free setup help and training. Import products from spreadsheet. Most stores are live same day.</p>
        </div>
        
        <div className="faq-item">
          <h3>Can I try before I buy?</h3>
          <p>Yes. 30-day free trial. No credit card required. We'll help you set it up. Cancel anytime.</p>
        </div>
        
        <div className="faq-item">
          <h3>What makes this different?</h3>
          <p>We work 100% offline. We show purchase history and profit margins. We include unlimited terminals in one price. Built specifically for liquor stores.</p>
        </div>
      </div>
    </section>
  );
};

export default FAQ;

