/**
 * Dashboard Service
 * Provides data access abstraction for the Super Admin Dashboard.
 * Currently serves development sample data with clear indicators.
 * When backend endpoint /api/v1/admin/dashboard is implemented, this service
 * can be seamlessly pointed to the real API client.
 */

import {
  mockDashboardSummary,
  mockActivityTrends,
  mockPendingApprovals,
  mockRecentUsers,
  mockRecentCourses
} from '../data/mockDashboardData';

export const dashboardService = {
  /**
   * Fetches current dashboard snapshot.
   * Returns clearly labeled development sample data.
   */
  async getDashboardData() {
    // Simulate brief asynchronous data retrieval (e.g., local storage or cache)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isSampleData: true,
          dataSource: 'Development Mock Provider (Offline)',
          summary: { ...mockDashboardSummary },
          trends: { ...mockActivityTrends },
          pendingApprovals: [...mockPendingApprovals],
          recentUsers: [...mockRecentUsers],
          recentCourses: [...mockRecentCourses],
          lastUpdated: new Date()
        });
      }, 150);
    });
  },

  /**
   * Refreshes dashboard data.
   * Explicitly signals sample data mode.
   */
  async refreshDashboardData() {
    return new Promise((resolve) => {
      // Simulate realistic network roundtrip
      setTimeout(() => {
        resolve({
          isSampleData: true,
          dataSource: 'Development Mock Provider (Refreshed Sample)',
          summary: { ...mockDashboardSummary },
          trends: { ...mockActivityTrends },
          pendingApprovals: [...mockPendingApprovals],
          recentUsers: [...mockRecentUsers],
          recentCourses: [...mockRecentCourses],
          lastUpdated: new Date()
        });
      }, 450);
    });
  }
};
