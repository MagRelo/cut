import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-md'>
      <div className='text-sm text-red-800'>{message}</div>
    </div>
  );
};
