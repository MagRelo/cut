import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  disabled?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  className = '',
  htmlFor,
  disabled = false,
}) => (
  <label
    className={`text-sm font-bold pr-1 ${
      disabled ? 'text-gray-400' : 'text-gray-700'
    } ${className} flex items-center gap-1`}
    htmlFor={htmlFor}>
    {children}

    {disabled && (
      <span className='text-xs text-gray-400'>
        {/* simple svg to indicate locked */}
        <svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
          <path
            fillRule='evenodd'
            d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
            clipRule='evenodd'
          />
        </svg>
      </span>
    )}
  </label>
);
