import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareProps {
  url: string;
  title?: string;
  subtitle?: string;
}

export const Share: React.FC<ShareProps> = ({
  url,
  title = 'Share',
  subtitle = 'Share with your friends',
}) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className='bg-white rounded-lg shadow w-fit min-w-0'>
      <div className='p-4'>
        <div className='flex flex-col items-center space-y-3'>
          <h2 className='text-xl font-semibold text-gray-700'>{title}</h2>
          <p className='text-sm text-gray-500'>{subtitle}</p>

          <button
            onClick={handleShare}
            className='inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors'>
            {showCopied ? (
              <>
                <svg
                  className='w-4 h-4 mr-2 text-green-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className='w-4 h-4 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                  />
                </svg>
                Copy Link
              </>
            )}
          </button>
          <div className='p-3 bg-white rounded-lg border border-gray-200'>
            <QRCodeSVG value={url} size={128} />
          </div>
        </div>
      </div>
    </div>
  );
};
