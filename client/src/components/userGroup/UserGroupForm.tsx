import { useState } from "react";
import { type CreateUserGroupInput, type UpdateUserGroupInput } from "../../types/userGroup";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

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
  submitLabel = "Create Group",
}: UserGroupFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (!name.trim()) {
      setValidationError("Group name is required");
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

      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Group Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter group name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter group description (optional)"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading && <LoadingSpinnerSmall />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
