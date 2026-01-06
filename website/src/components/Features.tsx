import './Features.css';
import { useEffect, useRef, useState } from 'react';

const Features = () => {
  const [visibleRows, setVisibleRows] = useState<boolean[]>([false, false, false]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleRows([true, true, true]);
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
    <section className="features" ref={sectionRef}>
      <h2 className="section-title">Everything you need</h2>
      
      <div className={`feature-row ${visibleRows[0] ? 'visible' : ''}`}>
        <div className="feature-content">
          <h3>Multi-channel pricing</h3>
          <p>Different prices for in-store, DoorDash, and e-commerce. Automatic pricing by source. Maximize profit on every channel.</p>
          <div className="feature-data">
            <span className="data-point">+18% markup for delivery</span>
            <span className="data-point">+20% for e-commerce</span>
          </div>
        </div>
        <div className="feature-visual">
          <div className="pricing-card">
            <div className="price-row">🏪 In-Store: $42.99</div>
            <div className="price-row">🚗 DoorDash: $50.73</div>
            <div className="price-row">🌐 Online: $51.59</div>
          </div>
        </div>
      </div>

      <div className={`feature-row reverse ${visibleRows[1] ? 'visible' : ''}`}>
        <div className="feature-content">
          <h3>Profit calculator</h3>
          <p>See real-time profit margins. Price with confidence. Never sell below cost. Set target profit percentage and we calculate the price.</p>
          <div className="feature-data">
            <span className="data-point">Real-time margin tracking</span>
            <span className="data-point">Below-cost warnings</span>
          </div>
        </div>
        <div className="feature-visual">
          <div className="profit-card">
            <div className="profit-row">Cost: $32.50</div>
            <div className="profit-row">Price: $42.99</div>
            <div className="profit-result">Profit: $10.49 (32%)</div>
          </div>
        </div>
      </div>

      <div className={`feature-row ${visibleRows[2] ? 'visible' : ''}`}>
        <div className="feature-content">
          <h3>Smart inventory alerts</h3>
          <p>Predicts stockouts based on sales velocity. Shows last purchase price and reorder quantity. Never run out of best-sellers.</p>
          <div className="feature-data">
            <span className="data-point">Predictive stockout alerts</span>
            <span className="data-point">Email & SMS notifications</span>
          </div>
        </div>
        <div className="feature-visual">
          <div className="alert-card">
            <div className="alert-icon">⚠️</div>
            <div className="alert-text">
              <strong>Grey Goose 1L</strong><br />
              5 bottles left • Stockout in 4 days<br />
              Last: Oct 28 @ $32.50
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;

