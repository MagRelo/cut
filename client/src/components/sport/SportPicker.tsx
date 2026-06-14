import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSportsQuery } from "../../hooks/useSportData";
import { useSportContext } from "../../contexts/SportContext";

export const SportPicker: React.FC = () => {
  const { data: sports = [], isLoading } = useSportsQuery();
  const { sportId } = useSportContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading || sports.length <= 1) {
    return null;
  }

  const onChange = (nextSportId: string) => {
    if (location.pathname.startsWith("/sports/")) {
      const rest = location.pathname.replace(/^\/sports\/[^/]+/, "");
      navigate(`/sports/${nextSportId}${rest || ""}`);
      return;
    }
    navigate(`/sports/${nextSportId}`);
  };

  return (
    <label className="hidden items-center gap-2 md:flex">
      <span className="sr-only">Sport</span>
      <select
        value={sportId}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
      >
        {sports.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.name}
          </option>
        ))}
      </select>
    </label>
  );
};
