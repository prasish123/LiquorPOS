import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';

export function Cart() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTax = useCartStore((state) => state.getTax);
  const getTotal = useCartStore((state) => state.getTotal);
  const getTotalDiscount = useCartStore((state) => state.getTotalDiscount);

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = getTotal();
  const totalDiscount = getTotalDiscount();

  return (
    <div className="cart">
      <div className="cart-header">
        <h2>Current Order</h2>
        {items.length > 0 && (
          <button className="btn-danger-outline" onClick={() => {
            if (confirm('Clear cart?')) {
              useCartStore.getState().clearCart();
              useToastStore.getState().addToast({ type: 'info', message: 'Cart cleared' });
            }
          }}>
            Clear All
          </button>
        )}
      </div>

      {
        items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)', opacity: 0.7 }}>
            <ShoppingBag size={48} strokeWidth={1} style={{ marginBottom: '16px', color: 'var(--color-primary)' }} />
            <p style={{ fontWeight: 500 }}>Cart is empty</p>
            <p style={{ fontSize: '13px' }}>Scan items to begin sale</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.sku} className="cart-item">
                  {/* Icon/Image Placeholder */}
                  <div className="cart-icon-area">
                    <ShoppingBag size={20} />
                  </div>

                  <div className="cart-item-info">
                    <h3 className="cart-item-name">{item.name}</h3>
                    {/* <p className="cart-item-sku">{item.sku}</p> */}
                    <div className="cart-item-price">${item.basePrice.toFixed(2)}</div>
                  </div>

                  <div className="cart-item-controls">
                    <div className="quantity-controls">
                      <button
                        className="btn-small"
                        onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        className="btn-small"
                        onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>


                    <button
                      className="remove-btn"
                      onClick={() => {
                        removeItem(item.sku);
                        useToastStore.getState().addToast({
                          type: 'info',
                          message: `Removed ${item.name}`,
                        });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-footer">
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="summary-row" style={{ color: 'var(--color-accent)' }}>
                    <span>Savings</span>
                    <span>-${totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Tax (7%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )
      }
    </div >
  );
}
