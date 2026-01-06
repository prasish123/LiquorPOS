import './Switching.css';
import { useEffect, useRef, useState } from 'react';

const Switching = () => {
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
    <section className="switching" ref={sectionRef}>
      <h2 className="section-title">Switching is easier than you think</h2>
      <p className="section-subtitle">
        From your current POS to LiquorPOS in 3 days. Zero downtime. Zero risk.
      </p>

      <div className="timeline">
        <div className={`timeline-item ${isVisible ? 'visible' : ''}`}>
          <div className="timeline-day">Day 1</div>
          <div className="timeline-content">
            <h3>Data Migration</h3>
            <ul>
              <li>We export your data from your current POS</li>
              <li>We import into LiquorPOS (automated)</li>
              <li>You verify everything is correct</li>
              <li>All products, customers, transactions transferred</li>
            </ul>
            <div className="timeline-time">Takes 4 hours of your time</div>
          </div>
        </div>

        <div className={`timeline-item ${isVisible ? 'visible' : ''}`}>
          <div className="timeline-day">Day 2</div>
          <div className="timeline-content">
            <h3>Training</h3>
            <ul>
              <li>Your team gets 2-hour hands-on training</li>
              <li>We show them the new interface</li>
              <li>They practice on demo store</li>
              <li>Q&A session for any concerns</li>
            </ul>
            <div className="timeline-time">Takes 2 hours</div>
          </div>
        </div>

        <div className={`timeline-item ${isVisible ? 'visible' : ''}`}>
          <div className="timeline-day">Day 3</div>
          <div className="timeline-content">
            <h3>Go Live</h3>
            <ul>
              <li>Run both systems for 1 day (redundancy)</li>
              <li>Everything works? Cut over to LiquorPOS</li>
              <li>Something wrong? Rollback to old POS</li>
              <li>You're live and running</li>
            </ul>
            <div className="timeline-time">Zero downtime guaranteed</div>
          </div>
        </div>
      </div>

      <div className="switching-details">
        <div className="switching-col">
          <h3>What we handle</h3>
          <ul className="check-list">
            <li>✅ All data export/import</li>
            <li>✅ All training materials</li>
            <li>✅ All configuration</li>
            <li>✅ 2 weeks post-launch support</li>
            <li>✅ Help canceling old POS</li>
            <li>✅ Hardware compatibility check</li>
          </ul>
        </div>

        <div className="switching-col">
          <h3>What you need</h3>
          <ul className="check-list">
            <li>✅ Your current POS username/password</li>
            <li>✅ 4 hours of your time (total)</li>
            <li>✅ That's it</li>
          </ul>
          <div className="switching-note">
            No technical expertise required. We handle everything.
          </div>
        </div>
      </div>

      <div className="risk-guarantee">
        <div className="guarantee-badge">🛡️</div>
        <h3>Zero Risk Guarantee</h3>
        <p>
          If you're not happier after 30 days, we'll help you switch back to your old POS. 
          No questions asked. No penalties. No hassle. We're confident you'll stay.
        </p>
        <div className="guarantee-stats">
          <div className="stat-item">
            <div className="stat-value">99.2%</div>
            <div className="stat-label">Stay after trial</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">3 days</div>
            <div className="stat-label">Average switch time</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">$0</div>
            <div className="stat-label">Switching cost</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Switching;

