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
    <PageSection>
      <h2 className="mb-3 font-display text-lg font-semibold text-gray-700">User Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-4 pl-3">
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
            <span
              id="oddsFormat-label"
              className="block text-sm font-medium text-gray-700 font-display shrink-0"
            >
              Odds format
            </span>
            <p className="mt-1 text-xs text-gray-500">
              How odds are shown in parlay markets and tickets.
            </p>
            <div
              className="mt-3 grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-labelledby="oddsFormat-label"
            >
              {ODDS_FORMAT_OPTIONS.map((option) => {
                const selected = selectedOddsFormat === option.value;
                return (
                  <label key={option.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="oddsFormat"
                      value={option.value}
                      checked={selected}
                      onChange={() => handleChange("oddsFormat", option.value)}
                      className="sr-only"
                    />
                    <span
                      className={`flex min-h-[2.75rem] w-full flex-col items-center justify-center rounded-md border px-1 py-1.5 font-display text-center shadow-sm transition-colors ${
                        selected
                          ? "border-gray-300 bg-white ring-2 ring-gray-400 ring-offset-2"
                          : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-sm font-medium leading-tight text-gray-900">
                        {option.label}
                      </span>
                      <span className="mt-0.5 text-xs tabular-nums text-gray-500">
                        {option.example}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

        <div className="flex justify-center !mt-10">
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
