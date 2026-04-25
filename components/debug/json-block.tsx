"use client";

import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

export function JsonBlock({
  value,
  collapseLevel = 1,
}: {
  value: unknown;
  collapseLevel?: number;
}) {
  return (
    <div className="font-mono text-[12px] leading-snug bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <JsonView
        data={(value ?? null) as object}
        shouldExpandNode={(level) => level < collapseLevel}
        style={defaultStyles}
      />
    </div>
  );
}
