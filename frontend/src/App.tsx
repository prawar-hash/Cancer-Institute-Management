// Base application component for scaffold verification
export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0E1116] sm:text-3xl">
          Cancer Institute Platform
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          React 19 + TypeScript + Vite + Tailwind CSS scaffold loaded successfully.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Scaffolding Complete
          </span>
        </div>
      </div>
    </div>
  );
}
