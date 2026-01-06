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
          <strong>Questions?</strong> Email <a href="mailto:hello@liquorpos.store">hello@liquorpos.store</a>
        </p>
      </div>
      </div>
      <footer className="footer">
        <div className="footer-content">
          <p>© 2026 LiquorPOS. All rights reserved.</p>
          <p className="footer-contact">
            <a href="mailto:hello@liquorpos.store">hello@liquorpos.store</a>
          </p>
        </div>
      </footer>
    </section>
  );
};

export default CTA;

