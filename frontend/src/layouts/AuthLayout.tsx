import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6 font-sans">
      <div className="w-full max-w-md transform transition-all duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl font-heading font-black text-2xl shadow-sm">
            <img
              src="/ICSR%20LOGO.png"
              alt="ICSR Logo"
              className="h-10 w-10 object-contain rounded-lg"
            />
          </div>
          <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight text-[#0E1116]">
            Onco Sphere
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Enterprise Clinical Management & Research Portal
          </p>
        </div>
        
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
