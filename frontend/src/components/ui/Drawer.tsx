import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  className,
}: DrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0E1116]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        {/* Slide-over panel */}
        <div
          className={clsx(
            'w-screen max-w-md transform border-l border-gray-100 bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out',
            className
          )}
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            {title && (
              <h3 className="font-heading text-lg font-bold text-[#0E1116]">
                {title}
              </h3>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 h-full overflow-y-auto pb-20">{children}</div>
        </div>
      </div>
    </div>
  );
}
