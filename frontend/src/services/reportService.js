import { apiClient } from './api';
import {
  mockPlatformKPIs,
  mockCategoryDistribution,
  mockCourseAnalytics
} from '../data/mockAnalyticsData';

export const reportService = {
  /**
   * Retrieves high-level platform KPI metrics.
   * Endpoint: GET /api/v1/admin/analytics/kpis or GET /api/v1/admin/overview
   */
  async getPlatformKPIs() {
    try {
      const data = await apiClient('/admin/overview');
      if (data && typeof data === 'object' && data.users) {
        return {
          totalUsers: data.users?.total ?? mockPlatformKPIs.totalUsers,
          activeUsers: data.users?.active ?? mockPlatformKPIs.activeUsers,
          publishedCourses: data.courses?.by_status?.published ?? mockPlatformKPIs.publishedCourses,
          totalEnrollments: data.enrollments?.total ?? mockPlatformKPIs.totalEnrollments,
          overallCompletionRate: data.completion_rate ?? mockPlatformKPIs.overallCompletionRate,
          averageCourseRating: data.average_rating ?? mockPlatformKPIs.averageCourseRating,
          certificatesIssued: data.certificates_issued ?? mockPlatformKPIs.certificatesIssued,
          activeLearningHours: data.active_learning_hours ?? mockPlatformKPIs.activeLearningHours,
          isSample: false
        };
      }
    } catch {
      // Backend not yet ready, fallback to deterministic mock KPIs
    }
    return { ...mockPlatformKPIs, isSample: true };
  },

  /**
   * Retrieves category distribution and completion metrics.
   * Endpoint: GET /api/v1/admin/analytics/categories
   */
  async getCategoryDistribution() {
    try {
      const data = await apiClient('/admin/analytics/categories');
      if (Array.isArray(data) && data.length > 0) {
        return { items: data, isSample: false };
      }
    } catch {
      // Fallback
    }
    return { items: mockCategoryDistribution, isSample: true };
  },

  /**
   * Retrieves detailed course performance analytics report list.
   * Endpoint: GET /api/v1/admin/analytics/courses
   */
  async getCourseAnalytics(params = {}) {
    try {
      const data = await apiClient('/admin/analytics/courses', { params });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : null;

      if (list && list.length > 0) {
        return { items: list, isSample: false, total: data?.total || list.length };
      }
    } catch {
      // Fallback
    }
    return { items: mockCourseAnalytics, isSample: true, total: mockCourseAnalytics.length };
  },

  /**
   * Content moderation report queue (for reported courses / comments).
   * Endpoint: GET /api/v1/reports
   */
  getReports: (params = {}) => apiClient('/reports', { params }),

  /**
   * Retrieves specific moderation report details.
   * Endpoint: GET /api/v1/reports/{id}
   */
  getReportById: (id) => apiClient(`/reports/${id}`),

  /**
   * Resolves or updates a moderation report.
   * Endpoint: PATCH /api/v1/reports/{id}
   */
  resolveReport: (id, resolutionData) =>
    apiClient(`/reports/${id}`, { method: 'PATCH', body: resolutionData }),

  /**
   * Files a content moderation report.
   * Endpoint: POST /api/v1/reports
   */
  createReport: (reportData) =>
    apiClient('/reports', { method: 'POST', body: reportData })
};

/**
 * Escapes and formats a value safely for RFC 4180 CSV export.
 */
function escapeCSVValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // If string contains comma, quote, or newline, escape double quotes and wrap in quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a date value cleanly as YYYY-MM-DD for consistent spreadsheet display.
 */
function formatCSVDate(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Generates and triggers browser download of filtered course analytics data as CSV.
 */
export function exportCourseAnalyticsToCSV(records, filename) {
  if (!Array.isArray(records) || records.length === 0) {
    return false;
  }

  const headers = [
    'Course ID',
    'Course Title',
    'Instructor',
    'Category',
    'Level',
    'Total Enrollments',
    'Active Learners',
    'Completions',
    'Completion Rate (%)',
    'Average Rating',
    'Rating Count',
    'Estimated Hours',
    'Last Activity'
  ];

  const rows = records.map(c => [
    escapeCSVValue(c.id),
    escapeCSVValue(c.title),
    escapeCSVValue(c.instructor),
    escapeCSVValue(c.category),
    escapeCSVValue(c.level),
    escapeCSVValue(Number(c.enrollments) || 0),
    escapeCSVValue(Number(c.activeLearners) || 0),
    escapeCSVValue(Number(c.completions) || 0),
    escapeCSVValue(typeof c.completionRate === 'number' ? c.completionRate : parseFloat(c.completionRate) || 0),
    escapeCSVValue(typeof c.rating === 'number' ? c.rating : parseFloat(c.rating) || 0),
    escapeCSVValue(Number(c.ratingCount) || 0),
    escapeCSVValue(typeof c.avgHoursToComplete === 'number' ? c.avgHoursToComplete : parseFloat(c.avgHoursToComplete) || 0),
    escapeCSVValue(formatCSVDate(c.lastActivity))
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const dateStr = new Date().toISOString().split('T')[0];
  const downloadName = filename || `learnspace-reports-analytics-${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', downloadName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
