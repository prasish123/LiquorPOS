import { useState } from 'react';
import './ManagerOverride.css';

interface ManagerOverrideProps {
  itemName: string;
  itemSku: string;
  originalPrice: number;
  transactionId: string;
  onApproved: (newPrice: number) => void;
  onCancel: () => void;
}

export function ManagerOverride({
  itemName,
  itemSku,
  originalPrice,
  transactionId,
  onApproved,
  onCancel,
}: ManagerOverrideProps) {
  const [managerPin, setManagerPin] = useState('');
  const [newPrice, setNewPrice] = useState(originalPrice.toString());
  const [reason, setReason] = useState('PRICE_MATCH');
  const [reasonNotes, setReasonNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const overridePrice = parseFloat(newPrice);

      if (isNaN(overridePrice) || overridePrice < 0) {
        throw new Error('Invalid price');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${API_URL}/price-overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          transactionId,
          itemSku,
          originalPrice,
          overridePrice,
          reason,
          reasonNotes: reason === 'OTHER' ? reasonNotes : undefined,
          managerPin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Override failed');
      }

      const result = await response.json();
      onApproved(result.newPrice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const discountAmount = originalPrice - parseFloat(newPrice || '0');
  const discountPercent =
    originalPrice > 0 ? (discountAmount / originalPrice) * 100 : 0;

  return (
    <div className="manager-override-modal-backdrop">
      <div className="manager-override-modal">
        <div className="modal-header">
          <h2>⚠️ Manager Override Required</h2>
        </div>

        <div className="modal-body">
          <div className="item-info">
            <h3>{itemName}</h3>
            <p className="sku">SKU: {itemSku}</p>
            <p className="original-price">
              Original Price: <strong>${originalPrice.toFixed(2)}</strong>
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
                autoFocus
              />
              {discountAmount > 0 && (
                <p className="discount-info">
                  Discount: ${discountAmount.toFixed(2)} (
                  {discountPercent.toFixed(1)}%)
                  {discountPercent > 50 && (
                    <span className="warning"> ⚠️ Large discount!</span>
                  )}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                <option value="PRICE_MATCH">Price Match</option>
                <option value="DAMAGED_GOODS">Damaged Goods</option>
                <option value="CUSTOMER_SATISFACTION">
                  Customer Satisfaction
                </option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {reason === 'OTHER' && (
              <div className="form-group">
                <label>Reason Notes</label>
                <textarea
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  placeholder="Please explain the reason for override..."
                  required
                  rows={3}
                />
              </div>
            )}

            <div className="form-group">
              <label>Manager PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Enter 4-6 digit PIN"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Approving...' : 'Approve Override'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

