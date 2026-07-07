'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';

interface DashboardStats {
  totalUsers: number;
  totalAssessments: number;
  totalApplications: number;
  emailsSent: number;
  funnel: {
    totalEvents: number;
    eventsByName: Record<string, number>;
    assessmentStarts: number;
    assessmentCompletes: number;
    resultsViewed: number;
    questionsAnsweredByIndex: Record<string, number>;
    completionRate: number;
    ctaSplit: {
      resume: number;
      practice: number;
    };
    feedback: {
      helpful: number;
      unhelpful: number;
      total: number;
    };
    waitlist: {
      total: number;
      consented: number;
    };
  };
  share: {
    totalShares: number;
    totalVisits: number;
    visitRate: number;
  };
  cronJobsStatus: Array<{
    id: string;
    name: string;
    status: 'enabled' | 'disabled';
    lastRun?: string;
  }>;
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <p className="text-gray-600 text-sm">Assessment Completion</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {Math.round(stats.funnel.completionRate * 100)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Results Viewed</p>
                <p className="text-3xl font-bold text-slate-800">{stats.funnel.resultsViewed}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Resume Clicks</p>
                <p className="text-3xl font-bold text-sky-700">{stats.funnel.ctaSplit.resume}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Practice Clicks</p>
                <p className="text-3xl font-bold text-fuchsia-700">{stats.funnel.ctaSplit.practice}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Waitlist Rows</p>
                <p className="text-3xl font-bold text-amber-700">{stats.funnel.waitlist.total}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Question Answer Flow</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Question #</th>
                      <th className="text-left py-2 px-4">Answered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.funnel.questionsAnsweredByIndex).map(([index, count]) => (
                      <tr className="border-b hover:bg-gray-50" key={index}>
                        <td className="py-2 px-4">{index}</td>
                        <td className="py-2 px-4 font-semibold">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Helpful Feedback</p>
                <p className="text-3xl font-bold text-green-700">{stats.funnel.feedback.helpful}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Unhelpful Feedback</p>
                <p className="text-3xl font-bold text-red-700">{stats.funnel.feedback.unhelpful}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Tracked Events</p>
                <p className="text-3xl font-bold text-indigo-700">{stats.funnel.totalEvents}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Shares Created</p>
                <p className="text-3xl font-bold text-amber-700">{stats.share.totalShares}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Share Visits</p>
                <p className="text-3xl font-bold text-emerald-700">{stats.share.totalVisits}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm">Share Visit Rate</p>
                <p className="text-3xl font-bold text-slate-800">
                  {Math.round(stats.share.visitRate * 100)}%
                </p>
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
