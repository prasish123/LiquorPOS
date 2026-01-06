import './Logo.css';

const Logo = () => {
  return (
    <div className="logo">
      <div className="logo-icon">
        <div className="logo-circle">
          <div className="logo-pos">POS</div>
        </div>
        <div className="logo-signal">
          <span className="signal-bar"></span>
          <span className="signal-bar"></span>
          <span className="signal-bar"></span>
        </div>
      </div>
      <div className="logo-text">
        <span className="logo-name">LiquorPOS</span>
        <span className="logo-tagline">Always Online</span>
      </div>
    </div>
  );
};

export default Logo;

