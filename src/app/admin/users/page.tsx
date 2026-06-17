'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AdminUsersTable,
  type AdminUserRow,
} from '@/components/admin/AdminUsersTable';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setUsers((current) => current.filter((user) => user.id !== userId));
      } else {
        toast.error('Failed to delete user');
      }
    } catch {
      toast.error('Error deleting user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Total users: {users.length}</p>
          </div>
          <Link href="/admin">
            <button className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300">
              Back to Admin
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <AdminUsersTable users={users} onDeleteUser={handleDeleteUser} />
        )}
      </div>
    </div>
  );
}
