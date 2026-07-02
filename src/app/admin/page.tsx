'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';

interface DashboardStats {
  totalUsers: number;
  totalAssessments: number;
  totalApplications: number;
  emailsSent: number;
  clusterDistribution: Array<{
    cluster: string;
    count: number;
    share: number;
  }>;
  feedbackStats: {
    responses: number;
    rate: number;
    breakdown: {
      yes: number;
      somewhat: number;
      no: number;
    };
  };
  cronJobsStatus: Array<{
    id: string;
    name: string;
    status: 'enabled' | 'disabled';
    lastRun?: string;
  }>;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatClusterLabel(cluster: string) {
  return cluster
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage system operations and user data</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Assessments Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalAssessments}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Applications Tracked</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalApplications}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Emails Sent</p>
                <p className="text-3xl font-bold text-orange-600">{stats.emailsSent}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Feedback Response Rate</p>
                <p className="text-3xl font-bold text-amber-600">
                  {formatPercent(stats.feedbackStats.rate)}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {stats.feedbackStats.responses} of {stats.totalAssessments} completed assessments
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Assessment Clusters</h2>
                    <p className="text-sm text-gray-500">Distribution of completed fit checks</p>
                  </div>
                  <span className="text-sm text-gray-500">{stats.totalAssessments} total</span>
                </div>

                {stats.clusterDistribution.length ? (
                  <div className="space-y-4">
                    {stats.clusterDistribution.map((item) => (
                      <div key={item.cluster}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-gray-800">
                            {formatClusterLabel(item.cluster)}
                          </span>
                          <span className="text-gray-500">
                            {item.count} ({formatPercent(item.share)})
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: formatPercent(item.share) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No completed assessments yet.</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Feedback Capture</h2>
                  <p className="text-sm text-gray-500">
                    Coverage of saved assessment feedback across completed fit checks
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-green-700">Yes</p>
                    <p className="mt-2 text-2xl font-bold text-green-800">
                      {stats.feedbackStats.breakdown.yes}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-yellow-700">Somewhat</p>
                    <p className="mt-2 text-2xl font-bold text-yellow-800">
                      {stats.feedbackStats.breakdown.somewhat}
                    </p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-rose-700">No</p>
                    <p className="mt-2 text-2xl font-bold text-rose-800">
                      {stats.feedbackStats.breakdown.no}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Response coverage</span>
                    <span className="font-medium text-gray-900">
                      {stats.feedbackStats.responses} / {stats.totalAssessments}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: formatPercent(stats.feedbackStats.rate) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Management */}
              <Link href="/admin/users">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">👥 User Management</h2>
                  <p className="text-gray-600 text-sm mb-4">View and manage all users</p>
                  <button className="btn-primary text-sm">View Users</button>
                </div>
              </Link>

              {/* Email Service */}
              <Link href="/admin/email">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">📧 Email Service</h2>
                  <p className="text-gray-600 text-sm mb-4">Monitor email logs and templates</p>
                  <button className="btn-primary text-sm">View Emails</button>
                </div>
              </Link>

              {/* Cron Jobs */}
              <Link href="/admin/cron">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">⏰ Cron Jobs</h2>
                  <p className="text-gray-600 text-sm mb-4">Schedule and monitor background jobs</p>
                  <button className="btn-primary text-sm">Manage Jobs</button>
                </div>
              </Link>

              {/* System Settings */}
              <Link href="/admin/settings">
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">⚙️ System Settings</h2>
                  <p className="text-gray-600 text-sm mb-4">Configure system parameters</p>
                  <button className="btn-primary text-sm">Settings</button>
                </div>
              </Link>
            </div>

            {/* Cron Jobs Status */}
            {stats.cronJobsStatus.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Scheduled Jobs</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Job Name</th>
                        <th className="text-left py-2 px-4">Status</th>
                        <th className="text-left py-2 px-4">Last Run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.cronJobsStatus.map((job) => (
                        <tr key={job.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">{job.name}</td>
                          <td className="py-2 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              job.status === 'enabled'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-gray-600">
                            {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Failed to load admin dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}
