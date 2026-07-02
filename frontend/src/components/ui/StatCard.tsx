import { ReactNode } from 'react';
import { clsx } from 'clsx';
import Card from './Card.tsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={clsx('flex flex-col justify-between', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <h4 className="font-heading mt-2 text-3xl font-extrabold text-[#0E1116]">
            {value}
          </h4>
        </div>
        {icon && (
          <div className="rounded-lg bg-gray-50 p-2.5 text-gray-500">
            {icon}
          </div>
        )}
      </div>
      {(trend || description) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold',
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              )}
            >
              {trend.isPositive ? '+' : '-'}
              {trend.value}
            </span>
          )}
          {description && <span className="text-xs text-gray-500">{description}</span>}
        </div>
      )}
    </Card>
  );
}
