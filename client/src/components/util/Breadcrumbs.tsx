import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className = '',
}) => {
  return (
    <nav
      className={`flex items-center text-sm ${className}`}
      aria-label='Breadcrumb'>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={item.label}>
            {index > 0 && (
              <span className='text-gray-400 mx-1' aria-hidden='true'>
                /
              </span>
            )}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className='text-emerald-600 hover:text-emerald-800 transition-colors'>
                {item.label}
              </Link>
            ) : (
              <span className={`${isLast ? 'text-gray-900' : 'text-gray-500'}`}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
