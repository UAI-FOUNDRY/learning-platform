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
import {
  getStoredReviews,
  getPendingCourses,
  applyCourseReviews
} from '../utils/courseReviews';

export const dashboardService = {
  /**
   * Fetches current dashboard snapshot.
   * Integrates live backend metrics if available, falling back to development sample data.
   * Both pathways apply the canonical pending review status and stored session decisions.
   */
  async getDashboardData() {
    const reviews = getStoredReviews();
    const pending = getPendingCourses(mockPendingApprovals, reviews);
    const updatedRecentCourses = applyCourseReviews(mockRecentCourses, reviews);

    try {
      const overview = await adminService.getOverview();
      if (overview && typeof overview === 'object' && overview.users) {
        return {
          isSampleData: false,
          dataSource: 'Live Platform Database (/api/v1/admin/overview)',
          summary: {
            totalUsers: overview.users?.total ?? mockDashboardSummary.totalUsers,
            activeCourses: overview.courses?.by_status?.published ?? (overview.courses?.total || mockDashboardSummary.activeCourses),
            pendingApprovals: overview.courses?.pending_review ?? pending.length,
            totalEnrollments: overview.enrollments?.total ?? mockDashboardSummary.totalEnrollments,
            certificatesIssued: overview.certificates_issued ?? 0,
            activeOrganizations: overview.organizations ?? 0,
            openReports: overview.open_reports ?? 0
          },
          trends: { ...mockActivityTrends },
          pendingApprovals: pending,
          recentUsers: [...mockRecentUsers],
          recentCourses: updatedRecentCourses,
          lastUpdated: new Date()
        };
      }
    } catch {
      // Backend not yet running or user unauthenticated; fallback to rich mock data
    }

    return {
      isSampleData: true,
      dataSource: 'Development Mock Provider (Offline / Session)',
      summary: {
        ...mockDashboardSummary,
        pendingApprovals: pending.length
      },
      trends: { ...mockActivityTrends },
      pendingApprovals: pending,
      recentUsers: [...mockRecentUsers],
      recentCourses: updatedRecentCourses,
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
