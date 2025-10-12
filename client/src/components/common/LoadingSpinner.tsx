import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "medium" }) => {
  const sizeClasses = {
    small: "h-1.5",
    medium: "h-2",
    large: "h-3",
  };

  return (
    <div className="">
      <div className="flex items-center justify-center">
        <div
          className={`w-32 ${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden relative`}
        >
          <div
            className={`${sizeClasses[size]} bg-emerald-600/70 rounded-full absolute inset-0`}
            style={{
              animation: "progress 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
};
