import { useState } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ModuleCard } from '../../components/admin/ModuleCard';
import { ActionButton } from '../../components/admin/ActionButton';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { FilterBox } from '../../components/admin/FilterBox';

type FilterType = 'all' | 'low-stock' | 'out-of-stock' | 'active';

export function AdminProducts() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Mock data for demonstration
    const products = [
        { id: 1, name: 'Premium Vodka', sku: 'VOD-001', price: 29.99, stock: 45, category: 'Spirits', status: 'active' },
        { id: 2, name: 'Craft Beer 6-Pack', sku: 'BEER-012', price: 12.99, stock: 120, category: 'Beer', status: 'active' },
        { id: 3, name: 'Red Wine Cabernet', sku: 'WINE-034', price: 24.99, stock: 67, category: 'Wine', status: 'active' },
        { id: 4, name: 'Whiskey Single Malt', sku: 'WHI-008', price: 54.99, stock: 8, category: 'Spirits', status: 'active' },
        { id: 5, name: 'Gin Premium', sku: 'GIN-015', price: 34.99, stock: 23, category: 'Spirits', status: 'active' },
        { id: 6, name: 'Tequila Blanco', sku: 'TEQ-007', price: 39.99, stock: 5, category: 'Spirits', status: 'active' },
        { id: 7, name: 'Champagne Brut', sku: 'CHAMP-003', price: 89.99, stock: 12, category: 'Wine', status: 'active' },
        { id: 8, name: 'IPA Craft Beer', sku: 'BEER-025', price: 15.99, stock: 0, category: 'Beer', status: 'out-of-stock' },
    ];

    const filteredProducts = products.filter(p => {
        if (activeFilter === 'low-stock') return p.stock > 0 && p.stock < 20;
        if (activeFilter === 'out-of-stock') return p.stock === 0;
        if (activeFilter === 'active') return p.status === 'active' && p.stock > 20;
        return true;
    });

    const stats = {
        all: products.length,
        lowStock: products.filter(p => p.stock > 0 && p.stock < 20).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        active: products.filter(p => p.status === 'active' && p.stock > 20).length
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }} className="animate-fadeInUp">
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-display)' }}>
                    Product Catalog
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Manage inventory and product information</p>
            </div>

            {/* Search & Actions Module */}
            <ModuleCard variant="standard" style={{ animationDelay: '0.1s', marginBottom: '24px' }}>
                <ModuleCard.Content>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products by name or SKU..."
                                style={{ width: '100%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--color-border)', borderRadius: '8px', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none', transition: 'all 0.2s' }}
                            />
                        </div>

                        {/* Actions */}
                        <ActionButton icon={Plus} size="md">
                            Add Product
                        </ActionButton>
                        <ActionButton icon={Filter} size="md" variant="secondary">
                            Advanced Filters
                        </ActionButton>
                    </div>
                </ModuleCard.Content>
            </ModuleCard>

            {/* Filter Rail Module */}
            <ModuleCard variant="standard" style={{ animationDelay: '0.2s', marginBottom: '24px' }}>
                <ModuleCard.Content>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <FilterBox
                            icon={Package}
                            label="All Products"
                            count={stats.all}
                            active={activeFilter === 'all'}
                            onClick={() => setActiveFilter('all')}
                        />
                        <FilterBox
                            icon={AlertTriangle}
                            label="Low Stock"
                            count={stats.lowStock}
                            active={activeFilter === 'low-stock'}
                            onClick={() => setActiveFilter('low-stock')}
                        />
                        <FilterBox
                            icon={XCircle}
                            label="Out of Stock"
                            count={stats.outOfStock}
                            active={activeFilter === 'out-of-stock'}
                            onClick={() => setActiveFilter('out-of-stock')}
                        />
                        <FilterBox
                            icon={CheckCircle}
                            label="Active"
                            count={stats.active}
                            active={activeFilter === 'active'}
                            onClick={() => setActiveFilter('active')}
                        />
                    </div>
                </ModuleCard.Content>
            </ModuleCard>

            {/* Product Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {filteredProducts.map((product, index) => (
                    <ProductCard 
                        key={product.id} 
                        product={product} 
                        delay={`${0.3 + (index * 0.05)}s`}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 && (
                <ModuleCard variant="expanded" style={{ animationDelay: '0.3s' }}>
                    <ModuleCard.Content>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
                            <Package size={64} style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }} strokeWidth={1.5} />
                            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>No products found</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Try adjusting your filters or search query</p>
                            <ActionButton icon={Plus} size="lg">
                                Add Your First Product
                            </ActionButton>
                        </div>
                    </ModuleCard.Content>
                </ModuleCard>
            )}
        </div>
    );
}

function ProductCard({ product, delay }: any) {
    const getStockStatus = (stock: number) => {
        if (stock === 0) return { variant: 'error' as const, label: 'Out of Stock' };
        if (stock < 20) return { variant: 'warning' as const, label: 'Low Stock' };
        return { variant: 'success' as const, label: 'In Stock' };
    };

    const stockStatus = getStockStatus(product.stock);

    return (
        <ModuleCard 
            variant="standard" 
            onClick={() => console.log('Edit product:', product.id)}
            style={{ animationDelay: delay, cursor: 'pointer' }}
        >
            {/* Product Image Area */}
            <div style={{ height: '128px', background: 'var(--gradient-subtle)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-border)' }}>
                <Package size={48} style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
            </div>

            {/* Product Info */}
            <ModuleCard.Content>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
                            {product.name}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{product.sku}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <StatusBadge variant="info" size="sm">
                            {product.category}
                        </StatusBadge>
                        <StatusBadge variant={stockStatus.variant} size="sm">
                            {stockStatus.label}
                        </StatusBadge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>${product.price}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Price</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: product.stock === 0 ? '#ef4444' : product.stock < 20 ? '#f59e0b' : '#10b981', fontFamily: 'var(--font-display)' }}>
                                {product.stock}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Stock</div>
                        </div>
                    </div>
                </div>
            </ModuleCard.Content>
        </ModuleCard>
    );
}
