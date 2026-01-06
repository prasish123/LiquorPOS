import './ProblemRecognition.css';
import { useEffect, useRef, useState } from 'react';

const ProblemRecognition = () => {
  const [visibleCards, setVisibleCards] = useState<boolean[]>([false, false, false, false, false, false]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCards([true, true, true, true, true, true]);
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
    <section className="problem-recognition" ref={sectionRef}>
      <h2 className="section-title">Does this sound familiar?</h2>
      <p className="section-subtitle">
        You're not alone. Thousands of liquor store owners face these exact problems every day.
      </p>
      
      <div className="pain-points">
        <div className={`pain-card ${visibleCards[0] ? 'visible' : ''}`}>
          <div className="pain-icon">💰</div>
          <h3>Costs keep rising</h3>
          <p className="pain-description">
            Your POS bill went from $350 to $450 in three years. They added "infrastructure fees" 
            nobody asked for. Extra terminals cost $20 each. You're trapped in a contract.
          </p>
          <div className="pain-impact">Annual waste: $2,400+</div>
        </div>

        <div className={`pain-card ${visibleCards[1] ? 'visible' : ''}`}>
          <div className="pain-icon">📞</div>
          <h3>Support is impossible</h3>
          <p className="pain-description">
            Wait 2+ hours for help. Get transferred between departments. Your store is down 
            during rush hour. Support doesn't care. You're losing sales while waiting.
          </p>
          <div className="pain-impact">Lost revenue per incident: $500-1,500</div>
        </div>

        <div className={`pain-card ${visibleCards[2] ? 'visible' : ''}`}>
          <div className="pain-icon">📦</div>
          <h3>Inventory is killing you</h3>
          <p className="pain-description">
            3,000+ SKUs to manage manually. You hired someone full-time just to track stock. 
            Overstock ties up $50K+ in capital. You don't know what to reorder until it's too late.
          </p>
          <div className="pain-impact">Wasted capital: $50,000+</div>
        </div>

        <div className={`pain-card ${visibleCards[3] ? 'visible' : ''}`}>
          <div className="pain-icon">🌐</div>
          <h3>Can't go omnichannel</h3>
          <p className="pain-description">
            Customers want to order online. DoorDash, Instacart, your own website. But your 
            POS wants $5,000 per integration. You can't afford it. Competitors are taking your sales.
          </p>
          <div className="pain-impact">Lost opportunity: $78,000/year</div>
        </div>

        <div className={`pain-card ${visibleCards[4] ? 'visible' : ''}`}>
          <div className="pain-icon">😰</div>
          <h3>Compliance anxiety</h3>
          <p className="pain-description">
            Age verification bugs terrify you. One mistake = lose your license. System has had 
            outages where verification failed. You couldn't legally sell. Massive liability.
          </p>
          <div className="pain-impact">Risk exposure: License worth $50K-500K</div>
        </div>

        <div className={`pain-card ${visibleCards[5] ? 'visible' : ''}`}>
          <div className="pain-icon">📊</div>
          <h3>Flying blind</h3>
          <p className="pain-description">
            You don't actually know your best sellers. Reports take 5 minutes to load. 
            Dashboard is a nightmare. Can't make data-driven decisions. Guessing on pricing.
          </p>
          <div className="pain-impact">Margin loss: 2-5% annually</div>
        </div>
      </div>

      <div className="pain-summary">
        <p>
          <strong>Sound familiar?</strong> These problems cost the average liquor store 
          <strong> $55,000+ per year</strong> in lost revenue, wasted time, and missed opportunities.
        </p>
        <p className="pain-cta-text">There's a better way.</p>
      </div>
    </section>
  );
};

export default ProblemRecognition;

