import './FAQ.css';
import { useEffect, useRef, useState } from 'react';

const FAQ = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = sectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <section className="faq" ref={sectionRef}>
      <h2 className="section-title">Frequently asked questions</h2>
      
      <div className="faq-grid">
        <div className={`faq-item ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.05s' }}>
          <h3>What happens if my internet goes down?</h3>
          <p>Your POS keeps working. Process unlimited sales offline. Everything syncs automatically when internet returns. Zero lost sales. Your register never stops.</p>
        </div>
        
        <div className={`faq-item ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.1s' }}>
          <h3>Will I lose data switching from my current POS?</h3>
          <p>No. We handle all data migration. We verify every transaction, customer, and product is imported correctly. If anything is wrong, we fix it at no cost. Your data is 100% safe.</p>
        </div>
        
        <div className={`faq-item ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.15s' }}>
          <h3>What if I want to switch back to my old POS?</h3>
          <p>We'll help you export your data and move back. No penalties. No questions asked. We're confident you won't want to, but we don't lock you in. Zero risk.</p>
        </div>
        
        <div className={`faq-item ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }}>
          <h3>Do I need special hardware?</h3>
          <p>No. LiquorPOS works with all standard hardware (monitors, registers, card readers, printers). Same equipment, better software. Works on Windows, Mac, or tablet.</p>
        </div>
        
        <div className={`faq-item ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.25s' }}>
          <h3>Do you integrate with my payment processor?</h3>
          <p>Yes. We work with all major processors. Or we can handle payment processing at competitive rates (2.8%). You choose. Stripe fees paid directly to Stripe, not us.</p>
        </div>
        
        <div className="faq-item">
          <h3>What if I have multiple stores?</h3>
          <p>Perfect. You manage all stores in one system. Unified reporting, inventory transfer between locations, consolidated P&L. Scales from 1 store to 100+.</p>
        </div>
        
        <div className="faq-item">
          <h3>What about credit card processing?</h3>
          <p>Use your existing Stripe account (2.9% + $0.30 - you pay Stripe directly). We can help you set up Stripe in 1 day. We don't charge transaction fees.</p>
        </div>
        
        <div className="faq-item">
          <h3>Can I run offline?</h3>
          <p>Yes. If your internet goes down, you keep selling. All transactions sync when internet comes back. Your register never stops. 100% offline capability.</p>
        </div>
        
        <div className="faq-item">
          <h3>How long does setup take?</h3>
          <p>3 days from decision to live. Day 1: data import. Day 2: training. Day 3: go live. Most stores are ready in 2 days. We handle everything.</p>
        </div>
        
        <div className="faq-item">
          <h3>What's your support like?</h3>
          <p>Live people, &lt;15 min response time. No chatbots. No waiting. If we can't fix something in 30 min, we credit your account. 99.9% uptime guarantee.</p>
        </div>
        
        <div className="faq-item">
          <h3>Can I try before I buy?</h3>
          <p>Yes. 30-day free trial. No credit card required. We'll help you set it up. If you're not happier, we'll help you switch back. Cancel anytime.</p>
        </div>
        
        <div className="faq-item">
          <h3>What makes this different?</h3>
          <p>We work 100% offline. We show purchase history and profit margins. We include unlimited terminals in one price. Built specifically for liquor stores. Modern UI, not 1995.</p>
        </div>
      </div>
    </section>
  );
};

export default FAQ;

