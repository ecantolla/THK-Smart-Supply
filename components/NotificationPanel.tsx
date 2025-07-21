"use client"

import type React from "react";

interface NotificationPanelProps {
  warnings: string[];
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ warnings }) => {
  const hasWarnings = warnings && warnings.length > 0;

  // If there are no warnings, the component renders nothing.
  if (!hasWarnings) {
    return null;
  }

  // The panel is now simplified to only show warnings.
  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
      <div>
        <h4 className="font-semibold text-yellow-800">Advertencias:</h4>
        <ul className="list-disc list-inside text-sm text-yellow-700 mt-1">
          {warnings.map((warning, index) => (
            <li key={index}>{warning}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotificationPanel;
