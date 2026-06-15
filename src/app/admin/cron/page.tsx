'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';

interface CronJob {
  id: string;
  name: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  description: string;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cron/jobs');
      const data = await response.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteJob = async (jobId: string) => {
    try {
      setExecuting(jobId);
      const response = await fetch(`/api/admin/cron/jobs/${jobId}/execute`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        // Refresh jobs list
        await fetchJobs();
        alert('Job executed successfully');
      } else {
        alert('Failed to execute job');
      }
    } catch (error) {
      console.error('Execute failed:', error);
      alert('Error executing job');
    } finally {
      setExecuting(null);
    }
  };

  const handleToggleJob = async (jobId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/cron/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });

      const data = await response.json();
      if (data.success) {
        setJobs(
          jobs.map((j) => (j.id === jobId ? { ...j, enabled: !enabled } : j))
        );
      } else {
        alert('Failed to update job');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Error updating job');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Scheduled Jobs</h1>
            <p className="text-gray-600">Manage background cron jobs (mock service)</p>
          </div>
          <Link href="/admin">
            <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              ← Back to Admin
            </button>
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-blue-900">
            💡 This is a mock cron service for localhost development. In Phase 5, this will be
            connected to real cron jobs (node-cron, Bull, or serverless functions).
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading scheduled jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">No cron jobs configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{job.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{job.description}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      job.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {job.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-4 border-t">
                  <div>
                    <p className="text-gray-600 text-sm">Schedule</p>
                    <p className="text-lg font-medium text-gray-900 capitalize">
                      {job.schedule}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Last Run</p>
                    <p className="text-lg font-medium text-gray-900">
                      {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Next Run</p>
                    <p className="text-lg font-medium text-gray-900">
                      {new Date(job.nextRun).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleExecuteJob(job.id)}
                    disabled={executing === job.id || !job.enabled}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {executing === job.id ? 'Executing...' : 'Execute Now'}
                  </button>
                  <button
                    onClick={() => handleToggleJob(job.id, job.enabled)}
                    className={`px-4 py-2 rounded-lg ${
                      job.enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {job.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Testing Section */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Testing Cron Jobs</h2>
          <p className="text-gray-600 mb-4">
            Click &quot;Execute Now&quot; on any job to run it immediately and test the
            functionality:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>
              <strong>Daily Digest:</strong> Sends progress digest emails to all users
            </li>
            <li>
              <strong>Weekly Plan Reminder:</strong> Reminds users to check their action plans
            </li>
            <li>
              <strong>Application Follow-up:</strong> Prompts users to follow up on pending
              applications
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            💡 Check the Email Service page to see sent emails
          </p>
        </div>
      </div>
    </div>
  );
}
