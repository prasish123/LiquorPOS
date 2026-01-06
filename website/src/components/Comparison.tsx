import './Comparison.css';
import { useEffect, useRef, useState } from 'react';

const Comparison = () => {
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
    <section className="comparison" ref={sectionRef}>
      <h2 className="section-title">How we compare</h2>
      <p className="section-subtitle">
        See the difference between typical POS systems and LiquorPOS
      </p>

      <div className={`comparison-table-wrapper ${isVisible ? 'visible' : ''}`}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Typical POS</th>
              <th className="highlight-col">LiquorPOS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Monthly Cost</strong></td>
              <td>$450+</td>
              <td className="highlight-col"><strong>$249</strong></td>
            </tr>
            <tr>
              <td><strong>Additional Terminals</strong></td>
              <td>$20 each</td>
              <td className="highlight-col"><strong>$0 (unlimited)</strong></td>
            </tr>
            <tr>
              <td><strong>Hidden Fees</strong></td>
              <td>$3,000+ annually</td>
              <td className="highlight-col"><strong>None</strong></td>
            </tr>
            <tr>
              <td><strong>Support Response</strong></td>
              <td>2+ hours</td>
              <td className="highlight-col"><strong>&lt;15 minutes</strong></td>
            </tr>
            <tr>
              <td><strong>Works Offline</strong></td>
              <td>❌ Limited</td>
              <td className="highlight-col"><strong>✅ 100%</strong></td>
            </tr>
            <tr>
              <td><strong>Multi-Location</strong></td>
              <td>Clunky, separate logins</td>
              <td className="highlight-col"><strong>Native, unified</strong></td>
            </tr>
            <tr>
              <td><strong>Omnichannel Setup</strong></td>
              <td>$5,000 per integration</td>
              <td className="highlight-col"><strong>Included ($0)</strong></td>
            </tr>
            <tr>
              <td><strong>Inventory Forecasting</strong></td>
              <td>Manual, basic</td>
              <td className="highlight-col"><strong>AI-powered</strong></td>
            </tr>
            <tr>
              <td><strong>Age Verification</strong></td>
              <td>Basic, buggy</td>
              <td className="highlight-col"><strong>Bulletproof</strong></td>
            </tr>
            <tr>
              <td><strong>Mobile App</strong></td>
              <td>Poor or none</td>
              <td className="highlight-col"><strong>Modern, fast</strong></td>
            </tr>
            <tr>
              <td><strong>Contract Length</strong></td>
              <td>3 years</td>
              <td className="highlight-col"><strong>Month-to-month</strong></td>
            </tr>
            <tr>
              <td><strong>Data Export</strong></td>
              <td>Limited</td>
              <td className="highlight-col"><strong>Full access</strong></td>
            </tr>
            <tr>
              <td><strong>UI/UX</strong></td>
              <td>Built in 1995</td>
              <td className="highlight-col"><strong>Modern (2025)</strong></td>
            </tr>
            <tr>
              <td><strong>Switching Cost</strong></td>
              <td>High, painful</td>
              <td className="highlight-col"><strong>Zero (we help)</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="comparison-example">
        <h3>Example: Store with 3 terminals</h3>
        <div className="comparison-calc">
          <div className="calc-item">
            <div className="calc-label">Typical POS</div>
            <div className="calc-breakdown">
              $450 base + $40 terminals + $250 fees
            </div>
            <div className="calc-total">$740/month</div>
            <div className="calc-annual">$8,880/year</div>
          </div>
          <div className="calc-divider">vs</div>
          <div className="calc-item highlight">
            <div className="calc-label">LiquorPOS</div>
            <div className="calc-breakdown">
              $249 base + $0 terminals + $0 fees
            </div>
            <div className="calc-total">$249/month</div>
            <div className="calc-annual">$2,988/year</div>
          </div>
        </div>
        <div className="comparison-savings">
          ✅ Save <strong>$5,892 per year</strong> + get features others charge $75+/month for
        </div>
      </div>
    </section>
  );
};

export default Comparison;

