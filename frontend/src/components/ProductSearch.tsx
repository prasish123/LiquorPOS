import { useState, useEffect } from 'react';
import { Search, Scan, Package, Wine, Beer, Martini, GlassWater } from 'lucide-react';
import { useProductsStore } from '../store/productsStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { Product } from '../domain/types';
import { ProductSearchSkeleton } from './Skeleton';

// Map categories to icons for visual boxes
const CATEGORIES = [
  { name: 'All', icon: Package },
  { name: 'Whiskey', icon: GlassWater },
  { name: 'Vodka', icon: Martini },
  { name: 'Tequila', icon: GlassWater }, // No cactus icon in lucide-react?
  { name: 'Rum', icon: GlassWater },
  { name: 'Gin', icon: Martini },
  { name: 'Beer', icon: Beer },
  { name: 'Wine', icon: Wine },
  { name: 'Premixed', icon: Martini }
];

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState({ name: 'All', icon: Package });

  const searchProducts = useProductsStore((state) => state.searchProducts);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const products = await searchProducts(query);
      setResults(products);
      setLoading(false);
    };

    const debounceTimer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, searchProducts]);

  const handleAddToCart = (product: Product) => {
    addItem(product);
    useToastStore.getState().addToast({
      type: 'success',
      message: `Added ${product.name} to cart`,
    });
  };

  const filteredResults = results.filter(product => {
    if (selectedCategory.name === 'All') return true;
    return product.category === selectedCategory.name || (selectedCategory.name === 'Tequila' && product.category === 'Mezcal');
  });

  return (
    <div className="search-section">
      {/* Header Tile Area */}
      <div className="tile-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="search-input-wrapper" style={{ width: '100%' }}>
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="input search-input"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{ paddingLeft: '50px', borderRadius: '100px', width: '100%' }}
          />
          <Scan className="scan-icon" size={20} />
        </div>

        {/* Category BOXES (Tiles) */}
        <div style={{ paddingBottom: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory.name === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    background: isActive ? 'var(--color-primary)' : '#f8fafc',
                    color: isActive ? 'white' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 8px 20px rgba(99, 102, 241, 0.3)' : 'none',
                    transform: isActive ? 'translateY(-2px)' : 'none'
                  }}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {loading && <ProductSearchSkeleton />}

      {/* Results Grid */}
      <div className="search-results">
        {filteredResults.map((product) => (
          <button
            key={product.id}
            className="tile-card product-card"
            onClick={() => handleAddToCart(product)}
          >
            <div className="product-image-area">
              <Package size={48} strokeWidth={1.5} />
            </div>
            <div className="product-content">
              <div>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-sku">{product.sku}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="product-price">
                  ${product.basePrice.toFixed(2)}
                </div>
                {product.ageRestricted && (
                  <span className="age-badge">21+</span>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* Empty State */}
        {!loading && filteredResults.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px' }}>
            No products found in {selectedCategory.name}.
          </div>
        )}
      </div>
    </div>
  );
}
