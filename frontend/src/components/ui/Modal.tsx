import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0E1116]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-lg transform rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition-all duration-300',
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
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
