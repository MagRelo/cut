import { useState } from "react";
import { type CreateUserGroupInput, type UpdateUserGroupInput } from "../../types/userGroup";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

const labelClass = "block text-sm font-medium text-gray-700 font-display";
const fieldClass =
  "mt-1 block w-full rounded-sm border border-gray-300 bg-white py-2.5 px-3 text-sm font-display focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-100";
const primaryButtonClass =
  "inline-flex min-w-[120px] items-center justify-center gap-2 rounded border border-blue-500 bg-blue-500 px-4 py-1.5 font-display text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

interface UserGroupFormProps {
  initialData?: {
    name?: string;
    description?: string | null;
  };
  onSubmit: (data: CreateUserGroupInput | UpdateUserGroupInput) => void;
  isLoading?: boolean;
  error?: string | null;
  submitLabel?: string;
}

export const UserGroupForm = ({
  initialData,
  onSubmit,
  isLoading = false,
  error,
  submitLabel = "Create League",
}: UserGroupFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("League name is required");
      return;
    }

    const formData: CreateUserGroupInput | UpdateUserGroupInput = {
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}
      {validationError && <ErrorMessage message={validationError} />}

      <div>
        <label htmlFor="name" className={labelClass}>
          League Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={fieldClass}
          placeholder="Enter league name"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={fieldClass}
          placeholder="Enter league description (optional)"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-center !mt-6">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className={primaryButtonClass}
        >
          {isLoading && <LoadingSpinnerSmall />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
