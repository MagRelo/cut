import React from 'react';
import { BetForm } from '../components/BetForm';

export const Order: React.FC = () => {
  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-8'>Place Order</h1>
      <BetForm />
    </div>
  );
};
