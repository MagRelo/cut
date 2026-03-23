import React from "react";

// SVG Icon Components
const CheckmarkIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4 text-green-600",
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <path d="M5 13l4 4L19 7"></path>
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 text-gray-400" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <rect x="4.5" y="11" width="15" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

// TEMP: Calculate progress based purely on how far through the week we are.
// Mon => 1/7, Tue => 2/7, ..., Sun => 7/7.
function calculateWeekProgress(now: Date = new Date()): number {
  // JS: getDay() => 0 (Sun) ... 6 (Sat)
  const day = now.getDay();
  const dayIndex = day === 0 ? 7 : day; // Mon=1 ... Sun=7
  return (dayIndex / 7) * 100;
}

export const ContestStatusProgressBar: React.FC = () => {
  // Seven sections representing days of the week
  const sections = 7;
  const sectionWidth = 100 / sections; // ~14.29% per section
  const progressPercent = calculateWeekProgress();

  // Grid structure: left column for labels, right section for content
  // Each row represents: stage labels, progress bar, action rows

  return (
    <div className="w-full">
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        {/* Left column: Row labels */}
        <div className="flex flex-col">
          {/* Row 1: Empty (aligns with stage labels) */}
          <div className="h-4 mb-1.5"></div>

          {/* Row 2: Empty (aligns with progress bar) */}
          <div className="h-[1.5px]"></div>

          {/* Row 3: Empty (aligns with day labels) */}
          <div className="h-4 mt-1.5"></div>

          {/* Contest group - larger gap before */}
          <div className="mt-2 mb-4 flex flex-col gap-2">
            {/* Row 3: "Contest" header */}
            <div className="h-4 flex items-center">
              <span className="text-xs font-display text-green-600 font-medium">Contest</span>
            </div>

            {/* Row 4: "Enter/Leave" label */}

            <div className="h-4 flex items-center">
              <span className="text-xs font-display text-gray-600">Create Lineups</span>
            </div>

            {/* Row 5: "Edit Lineup" label */}
            <div className="h-4 flex items-center">
              <span className="text-xs font-display text-gray-600">Enter Contest</span>
            </div>
          </div>

          {/* Winner Market group - larger gap before */}
          <div className="mb-0 flex flex-col gap-2">
            {/* Row 6: "Winner Market" header */}
            <div className="h-4 flex items-center">
              <span className="text-xs font-display text-blue-600 font-medium">Winner Pool</span>
            </div>

            {/* Row 7: "Buy Shares" label */}
            <div className="h-4 flex items-center">
              <span className="text-xs font-display text-gray-600">Buy Shares</span>
            </div>
          </div>
        </div>

        {/* Right section: Progress bar and action rows - SAME STRUCTURE as left */}
        <div className="flex flex-col">
          {/* Row 1: Stage labels */}
          <div className="relative h-4 mb-1.5">
            <div
              className="absolute text-xs font-display text-center text-gray-700"
              style={{
                left: "0%",
                width: `${sectionWidth * 3}%`, // 3 sections (Mon-Wed)
              }}
            ></div>
            <div
              className="absolute text-xs font-display text-center text-gray-400"
              style={{
                left: `${sectionWidth * 3}%`,
                width: `${sectionWidth}%`, // 1 section (Thu)
              }}
            >
              R1
            </div>
            <div
              className="absolute text-xs font-display text-center text-gray-400"
              style={{
                left: `${sectionWidth * 4}%`,
                width: `${sectionWidth}%`, // 1 section (Fri)
              }}
            >
              R2
            </div>
            <div
              className="absolute text-xs font-display text-center text-gray-400"
              style={{
                left: `${sectionWidth * 5}%`,
                width: `${sectionWidth}%`, // 1 section (Sat)
              }}
            >
              R3
            </div>
            <div
              className="absolute text-xs font-display text-center text-gray-400"
              style={{
                left: `${sectionWidth * 6}%`,
                width: `${sectionWidth}%`, // 1 section (Sun)
              }}
            >
              R4
            </div>
          </div>

          {/* Row 2: Progress bar */}
          <div className="relative h-[1.5px] flex items-center">
            <div className="w-full h-1.5 bg-gray-200 rounded-full flex relative overflow-hidden">
              {Array.from({ length: sections }).map((_, index) => (
                <div
                  key={index}
                  className="flex-1 border-r border-white last:border-r-0"
                  style={{ width: `${sectionWidth}%` }}
                />
              ))}

              {/* Green progress bar on top */}
              <div
                className="absolute top-0 left-0 h-full bg-green-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Row 3: Day labels */}
          <div className="relative h-4 mt-1.5">
            {/* M, T, W in Open section (first 3 sections) */}
            {[
              { day: "M", offset: 0 },
              { day: "T", offset: 1 },
              { day: "W", offset: 2 },
            ].map(({ day, offset }) => (
              <div
                key={day}
                className="absolute text-xs font-display text-center text-gray-400"
                style={{
                  left: `${sectionWidth * offset}%`,
                  width: `${sectionWidth}%`,
                }}
              >
                {day}
              </div>
            ))}

            {/* Th, F, Sat, Sun in R1, R2, R3, R4 sections */}
            {[
              { day: "Th", offset: 3 },
              { day: "F", offset: 4 },
              { day: "Sat", offset: 5 },
              { day: "Sun", offset: 6 },
            ].map(({ day, offset }) => (
              <div
                key={day}
                className="absolute text-xs font-display text-center text-gray-400"
                style={{
                  left: `${sectionWidth * offset}%`,
                  width: `${sectionWidth}%`,
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Contest group - larger gap before */}
          <div className="mt-2 mb-4 flex flex-col gap-2">
            {/* Row 3: Empty row aligned with "Contest" header */}
            <div className="relative h-4"></div>

            {/* Row 4: Action icons - "Enter/Leave" row */}
            <div className="relative h-4 flex items-center">
              {/* Checkmarks in M, T, W sections (first 3 sections) */}
              {[0, 1, 2].map((dayIndex) => (
                <div
                  key={`enter-day-${dayIndex}`}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${sectionWidth * dayIndex}%`,
                    width: `${sectionWidth}%`,
                  }}
                >
                  <CheckmarkIcon />
                </div>
              ))}

              {/* X marks in Th, F, Sat, Sun (R1, R2, R3, R4) */}
              {[3, 4, 5, 6].map((dayIndex) => (
                <div
                  key={`enter-x-${dayIndex}`}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${sectionWidth * dayIndex}%`,
                    width: `${sectionWidth}%`,
                  }}
                >
                  <LockIcon />
                </div>
              ))}
            </div>
            {/* Row 5: Action icons - "Edit Lineup" row */}
            <div className="relative h-4 flex items-center">
              {/* Checkmarks in M, T, W sections (first 3 sections) */}
              {[0, 1, 2].map((dayIndex) => (
                <div
                  key={`edit-day-${dayIndex}`}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${sectionWidth * dayIndex}%`,
                    width: `${sectionWidth}%`,
                  }}
                >
                  <CheckmarkIcon />
                </div>
              ))}

              {/* X marks in Th, F, Sat, Sun (R1, R2, R3, R4) */}
              {[3, 4, 5, 6].map((dayIndex) => (
                <div
                  key={`edit-x-${dayIndex}`}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${sectionWidth * dayIndex}%`,
                    width: `${sectionWidth}%`,
                  }}
                >
                  <LockIcon />
                </div>
              ))}
            </div>
          </div>

          {/* Winner Market group - larger gap before */}
          <div className="mb-0 flex flex-col gap-2">
            {/* Row 6: Empty row aligned with "Winner Market" header */}
            <div className="relative h-4"></div>

            {/* Row 7: Action icons - "Buy Shares" row */}
            <div className="relative h-4 flex items-center">
              {/* Checkmarks in M, T, W, Th, F, Sat sections (days 0-5) */}
              {[0, 1, 2, 3, 4, 5].map((dayIndex) => (
                <div
                  key={`buy-day-${dayIndex}`}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${sectionWidth * dayIndex}%`,
                    width: `${sectionWidth}%`,
                  }}
                >
                  <CheckmarkIcon />
                </div>
              ))}

              {/* X mark in Sun (day 6) */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `${sectionWidth * 6}%`,
                  width: `${sectionWidth}%`,
                }}
              >
                <LockIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
