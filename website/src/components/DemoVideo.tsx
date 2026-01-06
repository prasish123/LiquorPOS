import './DemoVideo.css';
import { useState, useEffect, useRef } from 'react';

const DemoVideo = () => {
  const [videoUrl] = useState<string>('');
  const hasVideo = videoUrl && videoUrl.trim() !== '';
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // To add video tomorrow, use: const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/embed/YOUR_VIDEO_ID');

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
    <section className="demo-video" ref={sectionRef}>
      <div className="demo-container">
        <h2 className="section-title">See LiquorPOS in Action</h2>
        <p className="demo-subtitle">
          Watch how LiquorPOS transforms your liquor store operations in under 2 minutes
        </p>

        <div className={`video-wrapper ${isVisible ? 'visible' : ''}`}>
          {hasVideo ? (
            <div className="video-container">
              <iframe
                src={videoUrl}
                title="LiquorPOS Demo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <div className="video-placeholder">
              <div className="placeholder-content">
                <div className="play-icon">▶</div>
                <h3>Demo Video Coming Soon</h3>
                <p>We're preparing an in-depth demo showcasing:</p>
                <ul className="demo-features">
                  <li>✓ Lightning-fast checkout process</li>
                  <li>✓ Real-time inventory management</li>
                  <li>✓ Offline mode demonstration</li>
                  <li>✓ Age verification in action</li>
                  <li>✓ Omnichannel order processing</li>
                  <li>✓ Beautiful reporting dashboard</li>
                </ul>
                <div className="placeholder-cta">
                  <button className="btn-primary">Request Early Access</button>
                  <button className="btn-secondary">Schedule Live Demo</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="video-stats">
          <div className="stat">
            <div className="stat-value">2 min</div>
            <div className="stat-label">Watch Time</div>
          </div>
          <div className="stat">
            <div className="stat-value">5 Key Features</div>
            <div className="stat-label">Demonstrated</div>
          </div>
          <div className="stat">
            <div className="stat-value">Real Store</div>
            <div className="stat-label">Actual Usage</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoVideo;

