import { ShoppingCart } from 'lucide-react';
import { ProductSearch } from '../components/ProductSearch';
import { Cart } from '../components/Cart';
import { Checkout } from '../components/Checkout';
import { useSync } from '../hooks/useSync';

export function POSTerminal() {
    useSync();

    return (
        <div className="app-container">
            <header className="app-header">
                <h1 className="app-title">
                    <ShoppingCart size={32} />
                    POS Terminal
                </h1>
            </header>

            <main className="app-main">
                <div className="search-section">
                    <ProductSearch />
                </div>

                <div className="cart-section">
                    <Cart />
                    <Checkout />
                </div>
            </main>
        </div>
    );
}
