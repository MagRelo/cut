import React, { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingSpinnerSmall } from "../../common/LoadingSpinnerSmall";

const NOTIFICATION_OPTIONS = [
  {
    key: "tournamentPreview",
    title: "Tournament Preview",
    description: "Get a preview of the upcoming tournament on Monday.",
    comingSoon: true,
  },
  {
    key: "lineupReminder",
    title: "Lineup Reminder",
    description: "Receive a reminder to set your lineup on Wednesday.",
    comingSoon: false,
  },
  {
    key: "tournamentResults",
    title: "Tournament Results",
    description: "Get the results of the tournament on Sunday.",
    comingSoon: true,
  },
];

export const NotificationSettings: React.FC = () => {
  const { user, updateUserSettings } = useAuth();
  const settings = (user && !user.isAnonymous && user.settings) || {};
  const notifications = (settings.notifications || {}) as {
    [key: string]: boolean;
  };

  // Track loading state for each checkbox
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const handleChange = async (key: string, checked: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    // Update the notifications object
    const newNotifications = { ...notifications, [key]: checked };
    // Update the full settings object
    const newSettings = { ...settings, notifications: newNotifications };
    try {
      await updateUserSettings(newSettings);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="bg-white max-w-md w-full mb-4">
      <form className="space-y-6">
        {NOTIFICATION_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center space-x-4">
            <div className="w-5 h-5 flex items-center justify-center">
              {loading[option.key] ? (
                <LoadingSpinnerSmall />
              ) : (
                <input
                  type="checkbox"
                  id={option.key}
                  checked={!!notifications[option.key]}
                  onChange={(e) => handleChange(option.key, e.target.checked)}
                  disabled={option.comingSoon}
                  className={`form-checkbox h-5 w-5 text-emerald-600 ${
                    option.comingSoon ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              )}
            </div>
            <label htmlFor={option.key} className="text-gray-800 flex flex-col">
              <span
                className={`font-semibold flex items-center gap-2 ${
                  option.comingSoon ? "text-gray-400" : ""
                }`}
              >
                {option.title}
                {option.comingSoon && (
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500">{option.description}</span>
            </label>
          </div>
        ))}
      </form>
    </div>
  );
};
