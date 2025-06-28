import { useState, useEffect } from "react";
import { usePortoAuth } from "../../contexts/PortoAuthContext";

export function UserSettings() {
  const { user, updateUser, updateUserSettings } = usePortoAuth();
  const [name, setName] = useState(user?.name || "");
  const [settings, setSettings] = useState<Record<string, unknown>>(user?.settings || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track original values for comparison
  const [originalName, setOriginalName] = useState(user?.name || "");
  const [originalSettings, setOriginalSettings] = useState<Record<string, unknown>>(
    user?.settings || {}
  );

  // Update original values when user data changes
  useEffect(() => {
    if (user) {
      setOriginalName(user.name || "");
      setOriginalSettings(user.settings || {});
      setName(user.name || "");
      setSettings(user.settings || {});
    }
  }, [user]);

  // Check if there are any changes
  const hasChanges = () => {
    return name !== originalName || JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Update name separately from settings
      if (name !== user?.name) {
        await updateUser({ name });
      }

      // Update color in settings
      await updateUserSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="text-lg font-semibold text-gray-700 mb-2 font-display">Team Display</div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              NAME
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">
              COLOR
            </label>
            <div className="mt-3 grid grid-cols-5 gap-3">
              {[
                "#0a73eb",
                "#A3A3A3",
                "#FF48BF",
                "#F58300",
                "#00ABB8",
                "#FFD60A",
                "#E00000",
                "#4700E0",
                "#9600CC",
                "#00B86B",
              ].map((color) => (
                <label key={color} className="flex flex-col items-center cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    checked={(settings.color as string) === color}
                    onChange={() => handleChange("color", color)}
                    className="sr-only"
                  />
                  <span
                    className={`h-8 w-8 rounded-full border-4 ${
                      (settings.color as string) === color
                        ? "border-white ring-2 ring-gray-400"
                        : "border-white"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

        <div className="mt-4 flex justify-center">
          <button
            type="submit"
            disabled={isLoading || !hasChanges()}
            className="min-w-[120px] bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
