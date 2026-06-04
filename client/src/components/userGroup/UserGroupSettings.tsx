import { useState } from "react";
import { type UpdateUserGroupInput } from "../../types/userGroup";
import { useUpdateUserGroup, useDeleteUserGroup } from "../../hooks/useUserGroupMutations";
import { UserGroupForm } from "./UserGroupForm";
import { ErrorMessage } from "../common/ErrorMessage";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { Modal } from "../common/Modal";

interface UserGroupSettingsProps {
  userGroupId: string;
  initialData: {
    name: string;
    description?: string | null;
  };
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export const UserGroupSettings = ({
  userGroupId,
  initialData,
  onUpdated,
  onDeleted,
}: UserGroupSettingsProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const updateMutation = useUpdateUserGroup();
  const deleteMutation = useDeleteUserGroup();

  const handleUpdate = (data: UpdateUserGroupInput) => {
    updateMutation.mutate(
      { id: userGroupId, data },
      {
        onSuccess: () => {
          onUpdated?.();
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(userGroupId, {
      onSuccess: () => {
        setShowDeleteModal(false);
        onDeleted?.();
      },
    });
  };

  const getDeleteError = () => {
    const error = deleteMutation.error as any;
    if (error?.message) {
      return error.message;
    }
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    return "Failed to delete league";
  };

  const secondaryButtonClass =
    "inline-flex min-w-[120px] items-center justify-center rounded border border-gray-300 bg-white px-4 py-1.5 font-display text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
  const dangerButtonClass =
    "inline-flex min-w-[120px] items-center justify-center gap-2 rounded border border-red-600 bg-red-600 px-4 py-1.5 font-display text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 font-display text-lg font-semibold text-gray-700">League Settings</h3>
        <UserGroupForm
          initialData={initialData}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          error={
            updateMutation.error
              ? (updateMutation.error as any)?.response?.data?.error || "Failed to update league"
              : null
          }
          submitLabel="Save Changes"
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="mb-2 font-display text-base font-semibold text-red-800">Danger Zone</h4>
        <p className="mb-4 font-display text-sm leading-relaxed text-gray-600">
          Once you delete a league, there is no going back. Please be certain.
        </p>
        <div className="flex justify-center">
          <button type="button" onClick={() => setShowDeleteModal(true)} className={dangerButtonClass}>
            Delete League
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete League"
        maxWidth="md"
      >
        <div className="space-y-4 p-4">
          {deleteMutation.error && <ErrorMessage message={getDeleteError()} />}

          <p className="font-display text-sm leading-relaxed text-gray-700">
            Are you sure you want to delete this league? This action cannot be undone. All contests
            associated with this league will remain, but the league will be permanently deleted.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className={secondaryButtonClass}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className={dangerButtonClass}
            >
              {deleteMutation.isPending && <LoadingSpinnerSmall />}
              {deleteMutation.isPending ? "Deleting..." : "Delete League"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
