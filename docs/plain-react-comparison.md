# The same form in plain React

This is the CheckoutForm from the [README](../README.md) implemented without enforma, using standard React state and hooks.

```tsx
import { useState } from "react";

export function CheckoutForm() {
  const [method, setMethod] = useState("");
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateAddress = (value: string, currentMethod: string) =>
    currentMethod === "delivery" && !value ? "Address is required" : null;

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMethod(value);
    if (value !== "delivery") setAddressError(null);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    if (addressTouched) setAddressError(validateAddress(value, method));
  };

  const handleAddressBlur = () => {
    setAddressTouched(true);
    setAddressError(validateAddress(address, method));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const aErr = validateAddress(address, method);
    setAddressError(aErr);
    setAddressTouched(true);
    if (aErr) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/order", {
        method: "POST",
        body: JSON.stringify({ method, address }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="method">Delivery method</label>
        <select id="method" value={method} onChange={handleMethodChange}>
          <option value="">Select...</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup in store</option>
        </select>
      </div>
      <div>
        <label htmlFor="address">Delivery address</label>
        <input
          id="address"
          value={address}
          onChange={handleAddressChange}
          onBlur={handleAddressBlur}
          disabled={method !== "delivery"}
        />
        {addressTouched && addressError && <span>{addressError}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}
```
