import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface User {
  id: string;
  email: string;
  name: string;
  userType: string;
  createdAt: string;
}

interface SystemProcessRecord {
  id: string;
  processType: string;
  status: string;
  processData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'processes'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [processes, setProcesses] = useState<SystemProcessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (activeTab === 'users') {
          const response = await api.get<User[]>('/admin/users');
          setUsers(response);
        } else {
          const response = await api.getSystemProcesses();
          setProcesses(response);
        }
      } catch (err) {
        setError(`Failed to fetch ${activeTab}`);
        console.error(`Error fetching ${activeTab}:`, err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
  }, [activeTab]);

  if (loading)
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <LoadingSpinner size='large' />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-6'>Admin Dashboard</h1>

      <div className='mb-6'>
        <div className='border-b border-gray-200'>
          <nav className='-mb-px flex space-x-8'>
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
              Users
            </button>
            <button
              onClick={() => setActiveTab('processes')}
              className={`${
                activeTab === 'processes'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
              System Processes
            </button>
          </nav>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow'>
        <div className='p-6'>
          {activeTab === 'users' ? (
            <>
              <h2 className='text-xl font-semibold mb-4'>User Management</h2>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Name
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Email
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Type
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {user.name}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {user.email}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.userType === 'ADMIN'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                            {user.userType}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <h2 className='text-xl font-semibold mb-4'>System Processes</h2>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Process Type
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Created At
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Process Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {processes.map((process) => (
                      <tr key={process.id}>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {process.processType}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              process.status === 'SUCCESS'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                            {process.status}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {new Date(process.createdAt).toLocaleString()}
                        </td>
                        <td className='px-6 py-4'>
                          <pre className='text-xs overflow-x-auto'>
                            {JSON.stringify(process.processData, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
