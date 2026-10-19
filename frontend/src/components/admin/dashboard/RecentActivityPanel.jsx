import React from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../common/EmptyState';

/**
 * StatusBadge
 * Renders consistent semantic status badge with adequate contrast.
 */
function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'active' || normalized === 'published') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100/70 text-emerald-900 border border-emerald-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  if (normalized === 'pending' || normalized === 'pending review') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100/70 text-amber-900 border border-amber-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 mr-1 rounded-full bg-amber-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] whitespace-nowrap">
      <span className="w-1.5 h-1.5 mr-1 rounded-full bg-stone-500" aria-hidden="true" />
      {status || 'Draft'}
    </span>
  );
}

/**
 * RoleBadge
 */
function RoleBadge({ role }) {
  const isInstructor = (role || '').toLowerCase() === 'instructor';
  const isAdmin = (role || '').toLowerCase() === 'admin';

  let classes = 'bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]';
  if (isInstructor) {
    classes = 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] font-semibold';
  } else if (isAdmin) {
    classes = 'bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] font-bold';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${classes}`}>
      {role}
    </span>
  );
}

/**
 * RecentActivityPanel
 * Side-by-side on wide screens (Recent Users & Recent Courses), stacked on smaller screens.
 */
export default function RecentActivityPanel({ users = [], courses = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Recent Users Section */}
      <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-[#B6AA9A]">
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-[#211E1A] leading-tight">
                Recent Users
              </h2>
              <p className="text-[13px] text-[#514940] mt-1 leading-relaxed">
                Latest learners and instructors registered on the platform
              </p>
            </div>
            <Link
              to="/admin/users"
              className="text-[12px] sm:text-[13px] font-semibold text-[#D92D2D] hover:text-[#B91C1C] focus:outline-none focus-visible:underline shrink-0 ml-3"
            >
              View all →
            </Link>
          </div>

          {users.length === 0 ? (
            <div className="py-8">
              <EmptyState title="No recent users" description="No new user accounts recorded in this period." />
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full table-fixed divide-y divide-[#B6AA9A] text-[13px] min-w-[320px] sm:min-w-0">
                <colgroup>
                  <col className="w-[45%]" />
                  <col className="w-[19%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[#71675D] font-semibold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="py-2.5 pr-2">User</th>
                    <th scope="col" className="px-2 py-2.5">Role</th>
                    <th scope="col" className="px-2 py-2.5">Joined</th>
                    <th scope="col" className="pl-2 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A]">
                  {users.map(user => {
                    const initials = user.name
                      ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'U';
                    const formattedDate = user.joinedAt
                      ? new Date(user.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : 'Recently';

                    return (
                      <tr key={user.id} className="hover:bg-[#EAE3DA]/60 transition-colors">
                        <td className="py-2.5 pr-2 overflow-hidden">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] flex items-center justify-center font-bold text-[11px] shrink-0" aria-hidden="true">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[13px] sm:text-[14px] text-[#211E1A] truncate leading-tight" title={user.name}>
                                {user.name}
                              </p>
                              <p className="text-[11px] text-[#71675D] truncate" title={user.email}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 overflow-hidden">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-[#71675D] font-mono text-[11px] sm:text-[12px]">
                          {formattedDate}
                        </td>
                        <td className="pl-2 py-2.5 whitespace-nowrap text-right">
                          <StatusBadge status={user.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-3.5 mt-2 border-t border-[#B6AA9A] text-[12px] sm:text-[13px]">
          <Link
            to="/admin/users"
            className="text-[#D92D2D] hover:text-[#B91C1C] font-medium inline-flex items-center"
          >
            Manage all platform users →
          </Link>
        </div>
      </div>

      {/* Recent Courses Section */}
      <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-[#B6AA9A]">
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-[#211E1A] leading-tight">
                Recent Courses
              </h2>
              <p className="text-[13px] text-[#514940] mt-1 leading-relaxed">
                Latest course additions, submissions, and publications
              </p>
            </div>
            <Link
              to="/admin/approvals"
              className="text-[12px] sm:text-[13px] font-semibold text-[#D92D2D] hover:text-[#B91C1C] focus:outline-none focus-visible:underline shrink-0 ml-3"
            >
              Approvals Queue →
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="py-8">
              <EmptyState title="No recent courses" description="No course activity has been registered yet." />
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full table-fixed divide-y divide-[#B6AA9A] text-[13px] min-w-[320px] sm:min-w-0">
                <colgroup>
                  <col className="w-[45%]" />
                  <col className="w-[21%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[#71675D] font-semibold uppercase tracking-wider text-[11px]">
                    <th scope="col" className="py-2.5 pr-2">Course</th>
                    <th scope="col" className="px-2 py-2.5">Category</th>
                    <th scope="col" className="px-2 py-2.5">Enrolled</th>
                    <th scope="col" className="pl-2 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A]">
                  {courses.map(course => {
                    const formattedDate = course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : 'Recent';

                    return (
                      <tr key={course.id} className="hover:bg-[#EAE3DA]/60 transition-colors">
                        <td className="py-2.5 pr-2 overflow-hidden">
                          <div className="min-w-0">
                            <p className="font-semibold text-[13px] sm:text-[14px] text-[#211E1A] truncate leading-tight" title={course.title}>
                              {course.title}
                            </p>
                            <p className="text-[11px] text-[#71675D] truncate" title={`Instructor: ${course.instructor} • ${formattedDate}`}>
                              {course.instructor} • {formattedDate}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-[#514940] text-[12px] sm:text-[13px] truncate" title={course.category}>
                          {course.category}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap font-mono text-[11px] sm:text-[12px] text-[#514940]">
                          {course.enrolledCount ? course.enrolledCount.toLocaleString() : '0'}
                        </td>
                        <td className="pl-2 py-2.5 whitespace-nowrap text-right">
                          <StatusBadge status={course.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-3.5 mt-2 border-t border-[#B6AA9A] text-[12px] sm:text-[13px]">
          <Link
            to="/admin/approvals"
            className="text-[#D92D2D] hover:text-[#B91C1C] font-medium inline-flex items-center"
          >
            Review pending courses in queue →
          </Link>
        </div>
      </div>
    </div>
  );
}
