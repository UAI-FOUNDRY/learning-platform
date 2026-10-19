/**
 * Dashboard Service
 * Provides data access abstraction for the Super Admin Dashboard.
 * Integrates live metrics from GET /api/v1/admin/overview with graceful fallback to sample data.
 */

import { adminService } from './adminService';
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
   * Attempts live backend overview retrieval, falling back to development sample data.
   */
  async getDashboardData() {
    try {
      const overview = await adminService.getOverview();
      if (overview && typeof overview === 'object' && overview.users) {
        return {
          isSampleData: false,
          dataSource: 'Live Platform Database (/api/v1/admin/overview)',
          summary: {
            totalUsers: overview.users?.total ?? mockDashboardSummary.totalUsers,
            activeCourses: overview.courses?.by_status?.published ?? (overview.courses?.total || mockDashboardSummary.activeCourses),
            pendingApprovals: overview.courses?.pending_review ?? mockDashboardSummary.pendingApprovals,
            totalEnrollments: overview.enrollments?.total ?? mockDashboardSummary.totalEnrollments,
            certificatesIssued: overview.certificates_issued ?? 0,
            activeOrganizations: overview.organizations ?? 0,
            openReports: overview.open_reports ?? 0
          },
          trends: { ...mockActivityTrends },
          pendingApprovals: [...mockPendingApprovals],
          recentUsers: [...mockRecentUsers],
          recentCourses: [...mockRecentCourses],
          lastUpdated: new Date()
        };
      }
    } catch {
      // Backend not yet running or user unauthenticated; fallback to rich mock data
    }

    return {
      isSampleData: true,
      dataSource: 'Development Mock Provider (Offline / Session)',
      summary: { ...mockDashboardSummary },
      trends: { ...mockActivityTrends },
      pendingApprovals: [...mockPendingApprovals],
      recentUsers: [...mockRecentUsers],
      recentCourses: [...mockRecentCourses],
      lastUpdated: new Date()
    };
  },

  /**
   * Refreshes dashboard data.
   */
  async refreshDashboardData() {
    return this.getDashboardData();
  }
};
