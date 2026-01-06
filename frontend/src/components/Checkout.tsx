import { useState } from 'react';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { api } from '../infrastructure/adapters/ApiClient';
import { getValidatedConfig } from '../utils/validation';

// Validate configuration on module load
let LOCATION_ID: string;
let TERMINAL_ID: string;

try {
    const config = getValidatedConfig();
    LOCATION_ID = config.locationId;
    TERMINAL_ID = config.terminalId;
} catch (err) {
    console.error('[CRITICAL] Invalid configuration:', err);
    // Fallback to invalid values that will be caught by backend
    LOCATION_ID = import.meta.env.VITE_LOCATION_ID || 'INVALID-LOCATION-ID';
    TERMINAL_ID = import.meta.env.VITE_TERMINAL_ID || 'INVALID-TERMINAL-ID';
}

export function Checkout() {
    const items = useCartStore((state) => state.items);
    const clearCart = useCartStore((state) => state.clearCart);
    const getTotal = useCartStore((state) => state.getTotal);
    const hasAgeRestrictedItems = useCartStore((state) => state.hasAgeRestrictedItems);

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [ageVerified, setAgeVerified] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const requiresAgeVerification = hasAgeRestrictedItems();
    // Logic: if age restricted, MUST verify.
    const canCheckout = items.length > 0 && (!requiresAgeVerification || ageVerified);

    const handleCheckout = async () => {
        if (!canCheckout) return;

        setProcessing(true);
        setError(null);

        try {
            const { getSubtotal, getTax, getTotal } = useCartStore.getState();

            const orderData = {
                locationId: LOCATION_ID,
                terminalId: TERMINAL_ID,
                items: items.map((item) => ({
                    sku: item.sku,
                    quantity: item.quantity,
                    discount: item.discount,
                    priceAtSale: item.basePrice
                })),
                paymentMethod,
                channel: 'counter' as const,
                ageVerified: requiresAgeVerification ? ageVerified : undefined,
                subtotal: getSubtotal(),
                tax: getTax(),
                total: getTotal()
            };

            await api.createOrder(orderData);

            setSuccess(true);
            useToastStore.getState().addToast({
                type: 'success',
                message: `Transaction complete!`,
                duration: 2000,
            });
            setTimeout(() => {
                clearCart();
                setSuccess(false);
                setAgeVerified(false);
            }, 2000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
            setError(errorMessage);
            
            // Show toast for critical errors
            useToastStore.getState().addToast({
                type: 'error',
                message: errorMessage,
                duration: 5000,
            });
            
            console.error('[Checkout Error]', err);
        } finally {
            setProcessing(false);
        }
    };

    if (items.length === 0) {
        return null;
    }

    if (success) {
        return (
            <div className="checkout-success" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                <CheckCircle size={64} className="success-icon" />
                <h2 style={{ fontSize: '24px', color: 'var(--color-primary)' }}>Payment Successful</h2>
                <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>
                    Total processed: <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>${getTotal().toFixed(2)}</span>
                </p>
                <div style={{ marginTop: '20px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Receipt sent to configured printer.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout">
            {error && (
                <div className="checkout-error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {requiresAgeVerification && (
                <div className="age-verification">
                    <label className="age-checkbox">
                        <input
                            type="checkbox"
                            checked={ageVerified}
                            onChange={(e) => setAgeVerified(e.target.checked)}
                            style={{ width: '20px', height: '20px', accentColor: 'var(--color-warning)' }}
                        />
                        <span>Confirm Customer is 21+</span>
                    </label>
                </div>
            )}

            <div className="payment-methods">
                <div
                    className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                >
                    <DollarSign size={24} />
                    <span>Cash</span>
                </div>
                <div
                    className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                >
                    <CreditCard size={24} />
                    <span>Card</span>
                </div>
            </div>

            <button
                className="btn btn-primary checkout-btn"
                onClick={handleCheckout}
                disabled={!canCheckout || processing}
            >
                {processing ? (
                    <>
                        <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }} />
                        Processing...
                    </>
                ) : (
                    <>
                        Pay ${getTotal().toFixed(2)}
                        <ArrowRight size={20} />
                    </>
                )}
            </button>
        </div>
    );
}
