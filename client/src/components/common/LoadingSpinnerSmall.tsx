import React from "react";

interface LoadingSpinnerSmallProps {
  color?: "white" | "green" | "blue" | "red" | "gray";
}

export const LoadingSpinnerSmall: React.FC<LoadingSpinnerSmallProps> = ({ color = "white" }) => {
  const getColorClass = () => {
    switch (color) {
      case "green":
        return "text-green-500";
      case "blue":
        return "text-blue-500";
      case "red":
        return "text-red-500";
      case "gray":
        return "text-gray-500";
      default:
        return "text-white";
    }
  };

  return (
    <svg
      className={`animate-spin h-5 w-5 ${getColorClass()}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      {/* Outer circle with stroke */}
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />

      {/* Overlapping arc that creates the spinning effect */}
      <path
        className="opacity-75"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        d="M 12 2 A 10 10 0 0 1 12 22 A 10 10 0 0 1 12 2"
        strokeDasharray="31.416"
        strokeDashoffset="15.708"
      />
    </svg>
  );
};
