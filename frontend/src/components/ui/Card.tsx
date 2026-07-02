import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export default function Card({
  children,
  className,
  title,
  subtitle,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]',
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="font-heading text-lg font-bold tracking-tight text-[#0E1116]">
              {title}
            </h3>
          )}
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
