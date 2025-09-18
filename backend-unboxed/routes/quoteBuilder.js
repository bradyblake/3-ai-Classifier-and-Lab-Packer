import React, { useState } from 'react';

export default function QuoteBuilderTile() {
  const [vendor, setVendor] = useState('');
  const [customer, setCustomer] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    console.log('Build quote using:', { vendor, customer, description });
  };

  return (
    <div>
      <h2>Quote Builder</h2>
      <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Vendor" />
      <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the job" />
      <button onClick={handleSubmit}>Generate Quote</button>
    </div>
  );
}
