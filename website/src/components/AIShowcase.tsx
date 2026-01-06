import './AIShowcase.css';
import { useEffect, useRef, useState } from 'react';

const AIShowcase = () => {
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
    <section className="ai-showcase" ref={sectionRef}>
      <div className="ai-container">
        <div className={`ai-content ${isVisible ? 'visible' : ''}`}>
          <div className="ai-badge">
            <span className="ai-sparkle">✨</span>
            <span>AI-Powered</span>
          </div>
          <h2>Genie AI Assistant</h2>
          <p className="ai-subtitle">
            Your intelligent assistant for store operations and customer support
          </p>
          
          <div className="ai-features">
            <div className="ai-feature">
              <div className="ai-feature-icon">🤖</div>
              <div className="ai-feature-content">
                <h4>For Store Employees</h4>
                <p>Instant answers to operational questions, product lookups, and policy guidance</p>
              </div>
            </div>
            
            <div className="ai-feature">
              <div className="ai-feature-icon">💬</div>
              <div className="ai-feature-content">
                <h4>For Customers</h4>
                <p>Natural language search, product recommendations, and instant support</p>
              </div>
            </div>
            
            <div className="ai-feature">
              <div className="ai-feature-icon">📚</div>
              <div className="ai-feature-content">
                <h4>Contextual RAG</h4>
                <p>Retrieval-Augmented Generation powered by your store's data and inventory</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`ai-demo ${isVisible ? 'visible' : ''}`}>
          <div className="ai-chat-window">
            <div className="ai-chat-header">
              <div className="ai-avatar">🤖</div>
              <div>
                <div className="ai-chat-title">Genie AI</div>
                <div className="ai-chat-status">
                  <span className="status-dot"></span>
                  Always available
                </div>
              </div>
            </div>
            
            <div className="ai-chat-messages">
              <div className="ai-message user">
                <div className="ai-message-bubble">
                  Do we have Grey Goose 1.75L in stock?
                </div>
              </div>
              
              <div className="ai-message assistant">
                <div className="ai-message-bubble">
                  Yes! We have <strong>12 bottles</strong> of Grey Goose 1.75L in stock.<br /><br />
                  📍 Location: Aisle 3, Shelf B<br />
                  💰 Price: $42.99<br />
                  📦 Last restocked: 2 days ago
                </div>
              </div>
              
              <div className="ai-message user">
                <div className="ai-message-bubble">
                  What's our return policy?
                </div>
              </div>
              
              <div className="ai-message assistant">
                <div className="ai-message-bubble">
                  Our return policy:<br /><br />
                  ✅ Unopened items: 30 days with receipt<br />
                  ✅ Defective items: Full refund anytime<br />
                  ❌ Opened alcohol: Cannot be returned (state law)
                </div>
              </div>
            </div>
            
            <div className="ai-chat-input">
              <input type="text" placeholder="Ask me anything..." disabled />
              <button disabled>→</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="ai-stats">
        <div className="ai-stat">
          <div className="ai-stat-value">&lt; 2s</div>
          <div className="ai-stat-label">Response Time</div>
        </div>
        <div className="ai-stat">
          <div className="ai-stat-value">24/7</div>
          <div className="ai-stat-label">Always Available</div>
        </div>
        <div className="ai-stat">
          <div className="ai-stat-value">100%</div>
          <div className="ai-stat-label">Accurate Inventory</div>
        </div>
      </div>
    </section>
  );
};

export default AIShowcase;

