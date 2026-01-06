import './Products.css';
import Logo from '../components/Logo';

const Products = () => {
  const features = [
    {
      icon: '💰',
      title: 'Point of Sale',
      description: 'Lightning-fast checkout with intuitive interface',
      details: [
        'Touch-optimized for speed',
        'Barcode scanning',
        'Split payments',
        'Custom discounts',
        'Receipt printing & email',
      ],
    },
    {
      icon: '📦',
      title: 'Inventory Management',
      description: 'AI-powered smart inventory that learns your store',
      details: [
        'Real-time stock tracking',
        'Smart reorder suggestions',
        'Low stock alerts',
        'Purchase order management',
        'Multi-location transfers',
      ],
    },
    {
      icon: '🔒',
      title: 'Age Verification',
      description: 'Bulletproof compliance for alcohol sales',
      details: [
        'ID scanning with verification',
        'State-specific compliance',
        'TTB audit trail',
        'Automatic updates',
        'Zero liability',
      ],
    },
    {
      icon: '🌐',
      title: 'Omnichannel',
      description: 'Sell everywhere at once',
      details: [
        'DoorDash integration',
        'Instacart integration',
        'Shopify/WooCommerce',
        'Your own website',
        'Real-time inventory sync',
      ],
    },
    {
      icon: '📊',
      title: 'Reporting & Analytics',
      description: 'Beautiful insights in real-time',
      details: [
        'Sales dashboards',
        'Profit margin analysis',
        'Top sellers report',
        'Employee performance',
        'Custom reports',
      ],
    },
    {
      icon: '💳',
      title: 'Payment Processing',
      description: 'Accept all payment types',
      details: [
        'Credit/debit cards',
        'Contactless payments',
        'Mobile wallets',
        'Cash management',
        'Competitive rates (2.8%)',
      ],
    },
    {
      icon: '👥',
      title: 'Customer Loyalty',
      description: 'Build repeat business',
      details: [
        'Points & rewards',
        'SMS marketing',
        'Email campaigns',
        'Birthday promotions',
        'Purchase history',
      ],
    },
    {
      icon: '🏪',
      title: 'Multi-Location',
      description: 'Manage 1 store or 100',
      details: [
        'Unified dashboard',
        'Centralized inventory',
        'Cross-location reporting',
        'Role-based permissions',
        'Location transfers',
      ],
    },
    {
      icon: '📱',
      title: 'Mobile App',
      description: 'Manage your store from anywhere',
      details: [
        'iOS & Android',
        'Real-time sales monitoring',
        'Inventory checks',
        'Reports on-the-go',
        'Push notifications',
      ],
    },
    {
      icon: '✈️',
      title: 'Offline Mode',
      description: 'Never stop selling',
      details: [
        '100% offline capability',
        'Unlimited transactions',
        'Auto-sync when online',
        'Local data storage',
        'Zero downtime',
      ],
    },
    {
      icon: '🔧',
      title: 'Hardware Agnostic',
      description: 'Works with your existing hardware',
      details: [
        'Any receipt printer',
        'Any barcode scanner',
        'Any card reader',
        'Any tablet/PC',
        'No vendor lock-in',
      ],
    },
    {
      icon: '🎯',
      title: 'AI Assistant',
      description: 'Contextual help for employees & customers',
      details: [
        'Natural language queries',
        'Product recommendations',
        'Inventory insights',
        'Customer support',
        'Training assistant',
      ],
    },
  ];

  return (
    <div className="products-page">
      <header className="products-header">
        <div className="header-content">
          <Logo />
          <nav className="header-nav">
            <a href="/">Home</a>
            <a href="/products" className="active">Products</a>
            <a href="/about">About</a>
            <a href="/blog">Blog</a>
            <a href="mailto:hello@liquorpos.store" className="btn-contact">Contact</a>
          </nav>
        </div>
      </header>

      <section className="products-hero">
        <h1>Everything You Need to Run a Modern Liquor Store</h1>
        <p className="hero-subtitle">
          Powerful features that work together seamlessly. No add-ons. No hidden fees. Just modern retail software that actually works.
        </p>
      </section>

      <section className="features-grid-section">
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <ul className="feature-details">
                {feature.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="products-cta">
        <h2>Ready to Transform Your Store?</h2>
        <p>Try LiquorPOS free for 30 days. No credit card required.</p>
        <div className="cta-buttons">
          <button className="btn-primary">Start Free Trial</button>
          <button className="btn-secondary">Schedule Demo</button>
        </div>
      </section>

      <footer className="products-footer">
        <p>© 2026 LiquorPOS. All rights reserved.</p>
        <p><a href="mailto:hello@liquorpos.store">hello@liquorpos.store</a></p>
      </footer>
    </div>
  );
};

export default Products;

