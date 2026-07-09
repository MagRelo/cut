import { useState, useEffect } from "react";
import { PageSection } from "../layout/PageSection";
import { useAuth } from "../../contexts/AuthContext";
import { ODDS_FORMAT_OPTIONS, parseOddsDisplayFormat } from "../../lib/oddsSettings";

type DraftState = {
  name: string;
  settings: Record<string, unknown>;
  originalName: string;
  originalSettings: Record<string, unknown>;
};

function draftFromUser(user: { name?: string | null; settings?: Record<string, unknown> | null } | null | undefined): DraftState {
  const name = user?.name || "";
  const settings = user?.settings || {};
  return { name, settings, originalName: name, originalSettings: settings };
}

export function UserSettings() {
  const { user, updateUser, updateUserSettings } = useAuth();
  const [draft, setDraft] = useState<DraftState>(() => draftFromUser(user));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDraft((prev) => ({ ...prev, ...draftFromUser(user) }));
  }, [user]);

  const hasChanges =
    draft.name !== draft.originalName ||
    JSON.stringify(draft.settings) !== JSON.stringify(draft.originalSettings);
  const selectedOddsFormat = parseOddsDisplayFormat(draft.settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (draft.name !== user?.name) {
        await updateUser({ name: draft.name });
      }
      await updateUserSettings(draft.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: unknown) => {
    setDraft((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  return (
    <PageSection variant="card">
      <h2 className="text-lg font-semibold text-gray-700 mb-3 font-display">Lineup Display</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 font-display shrink-0"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-sm border border-gray-300 bg-white py-2.5 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label
              htmlFor="color"
              className="block text-sm font-medium text-gray-700 font-display shrink-0"
            >
              Color
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
                    checked={(draft.settings.color as string) === color}
                    onChange={() => handleChange("color", color)}
                    className="sr-only"
                  />
                  <span
                    className={`h-8 w-8 rounded-full border-4 ${
                      (draft.settings.color as string) === color
                        ? "border-white ring-2 ring-gray-400"
                        : "border-white"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="oddsFormat"
              className="block text-sm font-medium text-gray-700 font-display shrink-0"
            >
              Odds format
            </label>
            <p className="mt-1 text-xs text-gray-500">
              How odds are shown in parlay markets and tickets.
            </p>
            <div className="mt-3 space-y-2">
              {ODDS_FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-sm border border-gray-200 px-3 py-2.5 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/40"
                >
                  <input
                    type="radio"
                    name="oddsFormat"
                    value={option.value}
                    checked={selectedOddsFormat === option.value}
                    onChange={() => handleChange("oddsFormat", option.value)}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

        <div className="flex justify-center !mt-6">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="inline-block min-w-[120px] bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1 px-3 rounded border border-blue-500 transition-colors text-sm font-display"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </PageSection>
  );
}
