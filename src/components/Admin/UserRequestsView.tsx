import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Search, Trash2, Copy, CheckCircle, Users } from 'lucide-react';
import { getUserRequests, approveUserRequest, rejectUserRequest, deleteUserRequest, getAllUsers, toggleDataContributor } from '../../firebase/userManagement';
import type { UserRequest, User as AppUser } from '../../types';
import type { User } from 'firebase/auth';

interface UserRequestsViewProps {
  user: User;
}

const UserRequestsView: React.FC<UserRequestsViewProps> = ({ user }) => {
  const [view, setView] = useState<'requests' | 'users'>('requests');
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UserRequest[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isAdmin = user.email === 'dev@sandvaer.dk';

  useEffect(() => {
    loadRequests();
    loadUsers();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const allRequests = await getUserRequests();
      setRequests(allRequests);
    } catch (err: any) {
      setError(err.message || 'Failed to load user requests');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleToggleContributor = async (userId: string, currentStatus: boolean) => {
    if (!isAdmin) {
      setError('Only administrators can change contributor status');
      return;
    }

    try {
      setProcessingId(userId);
      setError('');
      await toggleDataContributor(userId, !currentStatus);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update contributor status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (requestId: string, email: string) => {
    if (!isAdmin) {
      setError('Only administrators can approve requests');
      return;
    }

    if (!confirm(`Approve access request for ${email}?\n\nThe user will be able to sign in with their chosen password.`)) return;

    try {
      setProcessingId(requestId);
      setError('');
      await approveUserRequest(requestId, user.email!);
      await loadRequests();
      alert(`User ${email} has been approved! They can now sign in with their chosen password.`);
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, email: string) => {
    if (!isAdmin) {
      setError('Only administrators can reject requests');
      return;
    }

    if (!confirm(`Reject access request for ${email}?`)) return;

    try {
      setProcessingId(requestId);
      setError('');
      await rejectUserRequest(requestId, user.email!);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (requestId: string, email: string) => {
    if (!isAdmin) {
      setError('Only administrators can delete requests');
      return;
    }

    if (!confirm(`Delete request for ${email}? This action cannot be undone.`)) return;

    try {
      setProcessingId(requestId);
      setError('');
      await deleteUserRequest(requestId);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to delete request');
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Rejected</span>;
      default:
        return null;
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <p className="text-red-600 dark:text-red-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          User Management
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* View Toggle */}
        <div className="mb-6 flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => setView('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'requests'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <UserCheck size={18} />
            Access Requests
          </button>
          <button
            onClick={() => setView('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'users'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users size={18} />
            Data Contributors
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email..."
              className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Status Filter (only for requests view) */}
        {view === 'requests' && (
          <div className="mb-6 flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading {view === 'requests' ? 'requests' : 'users'}...
            </p>
          </div>
        ) : view === 'requests' ? (
          filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No requests found matching your search.' : 'No user requests found.'}
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Requested
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Reviewed
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {request.email}
                        </span>
                        <button
                          onClick={() => copyToClipboard(request.email, `email-${request.id}`)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy email"
                        >
                          {copiedId === `email-${request.id}` ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'approved' && users.find(u => u.email === request.email) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Logged in
                          </span>
                        )}
                        {request.status === 'approved' && !users.find(u => u.email === request.email) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Not logged in yet
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(request.requestedAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {request.reviewedAt ? (
                        <div>
                          <div>{new Date(request.reviewedAt).toLocaleString()}</div>
                          {request.reviewedBy && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              by {request.reviewedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-end gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id, request.email)}
                              disabled={processingId === request.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              <UserCheck size={16} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(request.id, request.email)}
                              disabled={processingId === request.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              <UserX size={16} />
                              Reject
                            </button>
                          </>
                        )}
                        {request.status !== 'pending' && (
                          <button
                            onClick={() => handleDelete(request.id, request.email)}
                            disabled={processingId === request.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        ) : (
          filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Contributor Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Last Login
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {u.email}
                          </span>
                          <button
                            onClick={() => copyToClipboard(u.email, `user-email-${u.id}`)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Copy email"
                          >
                            {copiedId === `user-email-${u.id}` ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {u.isDataContributor ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Contributor
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                              Viewer
                            </span>
                          )}
                          {u.isPending && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Not logged in yet
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(u.lastLogin).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleContributor(u.id, u.isDataContributor)}
                            disabled={processingId === u.id}
                            className={`flex items-center gap-1 px-3 py-1.5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm ${
                              u.isDataContributor
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {u.isDataContributor ? 'Revoke Access' : 'Grant Access'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default UserRequestsView;
