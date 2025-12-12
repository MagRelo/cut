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
    return "Failed to delete group";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Settings</h3>
        <UserGroupForm
          initialData={initialData}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
          error={
            updateMutation.error
              ? (updateMutation.error as any)?.response?.data?.error || "Failed to update group"
              : null
          }
          submitLabel="Save Changes"
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-semibold text-red-900 mb-2">Danger Zone</h4>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete a group, there is no going back. Please be certain.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Delete Group
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Group"
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteMutation.error && <ErrorMessage message={getDeleteError()} />}

          <p className="text-gray-700">
            Are you sure you want to delete this group? This action cannot be undone. All contests
            associated with this group will remain, but the group will be permanently deleted.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {deleteMutation.isPending && <LoadingSpinnerSmall />}
              Delete Group
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
