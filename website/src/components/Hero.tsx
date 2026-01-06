import { useState, useEffect } from 'react';
import './Hero.css';
import Logo from './Logo';

const Hero: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      icon: '💰',
      title: 'Lower Costs',
      description: '"Transparent pricing and no hidden fees" means you save $200-300/month compared to legacy systems',
      visual: 'cost'
    },
    {
      icon: '⚡',
      title: 'Better Operations',
      description: 'AI-powered inventory management and real-time insights streamline your daily operations',
      visual: 'operations'
    },
    {
      icon: '🚀',
      title: 'Faster Growth',
      description: 'Omnichannel capabilities from day one enable rapid expansion and unlock new revenue streams',
      visual: 'growth'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="hero">
      <div className="hero-logo">
        <Logo />
      </div>
      <div className="hero-content">
        <h1 className="hero-title">
          The POS that works<br />when your internet doesn't
        </h1>
        <p className="hero-subtitle">
          Built for liquor stores. Process sales 100% offline.<br />
          Track inventory. Stay compliant. Never lose a sale.
        </p>

        <div className="hero-badge">
          <span className="badge-sparkle">✨</span>
          <span>Powered by AI</span>
        </div>

        {/* Tote.ai-style carousel */}
        <div className="hero-carousel">
          <div className="carousel-track">
            {slides.map((slide, index) => (
              <div key={index} className="carousel-slide">
                <div className="slide-content">
                  <div className="slide-text">
                    <h2 className="slide-title">{slide.title}</h2>
                    <p className="slide-description">{slide.description}</p>
                  </div>
                  <div className="slide-visual">
                    {slide.visual === 'cost' && (
                      <div className="visual-mockup cost-mockup">
                        <div className="mockup-comparison">
                          <div className="comparison-item old">
                            <div className="label">Legacy POS</div>
                            <div className="price">$450/mo</div>
                            <div className="fees">+ Hidden fees</div>
                            <div className="fees">+ Setup costs</div>
                            <div className="fees">+ Training fees</div>
                          </div>
                          <div className="vs-arrow">→</div>
                          <div className="comparison-item new">
                            <div className="label">LiquorPOS</div>
                            <div className="price highlight">$249/mo</div>
                            <div className="included">✓ All included</div>
                            <div className="included">✓ Free setup</div>
                            <div className="included">✓ Free training</div>
                          </div>
                        </div>
                        <div className="savings-badge">Save $2,400+/year</div>
                      </div>
                    )}
                    {slide.visual === 'operations' && (
                      <div className="visual-mockup operations-mockup">
                        <div className="dashboard-preview">
                          <div className="dashboard-header">
                            <span className="dashboard-title">📊 Live Dashboard</span>
                            <span className="live-indicator">● LIVE</span>
                          </div>
                          <div className="dashboard-stats">
                            <div className="stat-card">
                              <div className="stat-label">Today's Sales</div>
                              <div className="stat-value">$3,247</div>
                              <div className="stat-trend up">↑ 12%</div>
                            </div>
                            <div className="stat-card">
                              <div className="stat-label">Low Stock Items</div>
                              <div className="stat-value">8</div>
                              <div className="stat-trend">🔔 Reorder</div>
                            </div>
                            <div className="stat-card">
                              <div className="stat-label">Top Seller</div>
                              <div className="stat-value">Jack Daniel's</div>
                              <div className="stat-trend">47 sold</div>
                            </div>
                          </div>
                          <div className="ai-insight">
                            <span className="ai-icon">✨</span>
                            <span>AI suggests ordering 12 more cases of Corona for weekend</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {slide.visual === 'growth' && (
                      <div className="visual-mockup growth-mockup">
                        <div className="channels-grid">
                          <div className="channel-card active">
                            <div className="channel-icon">🏪</div>
                            <div className="channel-name">In-Store POS</div>
                            <div className="channel-status">✓ Active</div>
                          </div>
                          <div className="channel-card active">
                            <div className="channel-icon">🛒</div>
                            <div className="channel-name">E-Commerce</div>
                            <div className="channel-status">✓ Active</div>
                          </div>
                          <div className="channel-card active">
                            <div className="channel-icon">🚗</div>
                            <div className="channel-name">DoorDash</div>
                            <div className="channel-status">✓ Active</div>
                          </div>
                          <div className="channel-card active">
                            <div className="channel-icon">📱</div>
                            <div className="channel-name">Instacart</div>
                            <div className="channel-status">✓ Active</div>
                          </div>
                        </div>
                        <div className="unified-badge">All inventory synced in real-time</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="carousel-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === activeSlide ? 'active' : ''}`}
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="hero-cta">
          <a href="#trial" className="btn btn-primary">Start free trial</a>
          <a href="#demo" className="btn btn-secondary">Watch demo</a>
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
    </section>
  );
};

export default Hero;

