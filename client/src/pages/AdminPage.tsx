import React from "react";
import { Link } from "react-router-dom";

export const AdminPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Staff tools and support workflows.
        </p>
      </div>

      <div className="bg-white rounded-sm shadow border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Navigation</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 hover:underline">
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
