"use client";

export default function DebugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-6 font-mono text-sm space-y-3">
      <div className="border border-red-300 bg-red-50 text-red-900 rounded p-3">
        <div className="font-semibold mb-1">
          {error.name}: {error.message}
        </div>
        {error.digest && (
          <div className="text-[11px] text-red-700">digest: {error.digest}</div>
        )}
        {error.stack && (
          <pre className="mt-2 text-[11px] whitespace-pre-wrap overflow-x-auto">
            {error.stack}
          </pre>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800"
      >
        重试
      </button>
    </div>
  );
}
