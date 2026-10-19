# API Documentation

Interactive docs (always up to date): run the backend and open `http://localhost:8000/docs`.

## Base URL
`/api/v1`

## Logging in from /docs
Click **Authorize**, type your **email in the "username" field** and your password, leave
client_id / client_secret empty, and click Authorize. Every 🔒 endpoint then sends your token.
(The button uses `POST /auth/token`, a form version of the login. The frontend keeps using
`POST /auth/login` with a JSON body.)

## API Endpoints Overview
- **Authentication**: `/api/v1/auth`: register, login (JSON), token (form, for /docs), refresh, logout, password reset / change, email verification, me
- **Users**: `/api/v1/users`: profile, admin user management incl. `status` (active / inactive / suspended)
- **Organizations**: `/api/v1/organizations`: organizations, members, linked courses, stats
- **Courses**: `/api/v1/courses`: catalog, details, course management, submit for review, enroll
- **Sections / Lectures**: `/api/v1/courses/{id}/sections`, `/api/v1/sections/{id}/lectures`
- **Categories**: `/api/v1/categories`
- **Enrollments**: `/api/v1/enrollments`: my enrollments, enrol, staff-wide list
- **Progress**: `/api/v1/progress`: lecture completion, resume
- **Quizzes**: `/api/v1/quizzes`
- **Assignments**: `/api/v1/assignments`
- **Certificates**: `/api/v1/certificates`: issuing, public verification, PDF, revocation
- **Reviews**: `/api/v1/reviews`: ratings, reviews, moderation
- **Admin**: `/api/v1/admin`: dashboard overview, course approval workflow, audit log, login history
- **Settings**: `/api/v1/settings`: platform settings (public subset + Super Admin editing)
- **Notifications / Announcements**: `/api/v1/notifications`, `/api/v1/announcements`
- **Analytics**: `/api/v1/analytics`: platform, instructor and per-course reporting
- **Q&A**: `/api/v1/qa`: course discussions (questions, threaded answers, upvotes, moderation)
- **Reports**: `/api/v1/reports`: report content, Super Admin moderation queue

## Errors
Every error is JSON: `{ "message": "...", "detail": ..., "error_type": "..." }`.
`message` is always a readable string (show it in the UI). `detail` is the raw value
(a string, or a list of field errors for 422).

## Sessions and accounts
| Method & path | Who | What |
|---|---|---|
| `POST /auth/login` `{email, password}` | public | returns `access_token` (60 min), `refresh_token` (14 days), `expires_in` |
| `POST /auth/refresh` `{refresh_token}` | public | new access + refresh token. A refresh token works **once**; reusing an old one ends all sessions |
| `POST /auth/logout` `{refresh_token}` | public | revokes that refresh token |
| `POST /auth/logout-all` | logged in | revokes every refresh token (all devices) |
| `POST /auth/forgot-password` `{email}` | public | emails a reset link; the answer is identical whether or not the account exists |
| `POST /auth/reset-password` `{token, new_password}` | public | sets the password, signs out everywhere. Token is single use, valid 60 min |
| `POST /auth/change-password` `{current_password, new_password}` | logged in | signs out other devices |
| `POST /auth/resend-verification` `{email}` | public | new verification link |
| `POST /auth/verify-email` `{token}` | public | marks the email as verified |

* 5 wrong passwords in a row (setting `security.max_failed_logins`) lock the email for
  `security.lockout_minutes` (HTTP 429). A correct login resets the count.
* Every attempt is stored in `login_history`.
* If `users.require_email_verification` is on, unverified users (except Super Admin) cannot log in.
* `users.allow_public_registration` and `users.allow_instructor_self_signup` are enforced on `/auth/register`.
* Minimum length of new passwords: setting `security.password_min_length` (default 8).
* Email: `EMAIL_BACKEND=console` (default) prints the email, including the link, in the server log.
  Use `smtp` plus the `SMTP_*` variables for real delivery.
* Logout cannot cancel an access token that is already issued; it simply expires (60 min).

## Course catalog and editing rules
* `GET /courses` and `GET /courses/{id}` are **public**: visitors and learners only ever see
  `published` courses. Instructors and Super Admins (logged in) see more.
* A **published** course cannot be edited in place by its instructor (courses, sections,
  lectures, quizzes, assignments return 409). The instructor calls `POST /courses/{id}/reopen`:
  the course becomes `draft` and leaves the public catalog, **learners who are already enrolled
  keep access**; after editing, `POST /courses/{id}/submit` and a Super Admin approves again.
  Super Admins can edit published courses directly. Turn the rule off with setting
  `courses.reapproval_on_published_edit = false`.
* `GET /courses/{id}/approval-history`: every submit / approve / changes-requested / reject /
  reopen with who and when (Super Admin; instructor for own courses). `published_at` is set
  the first time a course is approved.

## Learning data that is recorded
* Quiz attempts: `attempt_number`, `correct_count`, `total_questions`, and one
  `quiz_attempt_answers` row per question (selected option, correct or not, points).
* Assignments: grading accepts `{grade, feedback}` and stores `status=graded`, `graded_by`,
  `graded_at`; resubmitting resets it to `submitted` and increments `resubmission_count`.
* Progress: `POST /progress/lecture/{id}` accepts `{is_completed?, last_position_seconds?}`.
  A position-only body saves the resume point without completing the lecture; an empty body still
  means "completed". `completed_at` and the enrollment's `last_lecture_id` / `last_accessed_at` are kept.

## Platform settings
| Method & path | Who | What |
|---|---|---|
| `GET /settings/public` | **public** | settings flagged public (platform name, logo, languages, registration open...) |
| `GET /settings?category=` | Super Admin | all settings (`general, users, courses, certificates, notifications, security, content`) |
| `PUT /settings/{key}` `{value}` | Super Admin | change one |
| `PUT /settings` `{values: {key: value, ...}}` | Super Admin | change several, all or nothing |

A value must keep the type of its default (switch stays true/false, number stays a whole number,
list stays a list) and numbers have sensible ranges (e.g. `security.password_min_length` 6-128).
Errors are `422` with the key named in `message`. Changes are written to the audit log.

## Audit log and login history (Super Admin)
* `GET /admin/audit-logs?action=&actor_id=&entity_type=&entity_id=`: who changed what, with
  `changes: {field: [old, new]}`. `action` is a prefix match. Recorded: `user.updated`,
  `user.status_changed`, `user.deleted`, `course.approved / rejected / changes_requested / reopened`,
  `review.moderated`, `certificate.revoked`, `settings.updated`.
* `GET /admin/login-history?email=&success=`: every login attempt with reason and IP.

## Notifications and announcements
Notifications are created automatically: `welcome`, `course_enrollment`, `quiz_result`,
`assignment_graded`, `course_completed`, `certificate_issued`, `course_approved`,
`changes_requested`, `course_rejected`, and announcements.

| Method & path | What |
|---|---|
| `GET /notifications?unread_only=&page=&limit=` | my notifications, newest first |
| `GET /notifications/unread-count` | `{unread: n}` for the bell icon |
| `POST /notifications/{id}/read`, `POST /notifications/read-all`, `DELETE /notifications/{id}` | manage |
| `GET/PUT /notifications/preferences` | per type: `in_app_enabled`, `email_enabled` (default on) |
| `POST /announcements` `{title, body, audience, course_id?}` | instructor: `audience: "course"` for own course. Super Admin also `all`, `learners`, `instructors` |
| `GET /announcements?course_id=` | announcements I can see |
| `DELETE /announcements/{id}` | author or Super Admin |

Email is sent only if the setting `notifications.email_enabled` is on, the user has not turned
email off for that type, and an email backend is configured. Announcements are in-app only.

## Course Q&A (`/qa`)
Open to learners enrolled in the course (active or completed), the course instructor and Super Admins.

| Method & path | Who | What |
|---|---|---|
| `POST /qa/courses/{course_id}/questions` `{title, body, lecture_id?}` | participants | ask (author auto-follows, instructor is notified) |
| `GET /qa/courses/{course_id}/questions?lecture_id=&resolved=&search=&mine=&sort=recent\|popular\|unanswered&status=` | participants | list (`status` hidden/removed: staff only) |
| `GET /qa/my/questions` | logged in | my questions |
| `GET /qa/questions/{id}` | participants | question + answers; replies nested; highlighted, instructor, most upvoted first |
| `PUT /qa/questions/{id}`, `DELETE /qa/questions/{id}` | author (delete: also instructor, Super Admin) | edit / delete |
| `POST /qa/questions/{id}/resolve` `{is_resolved}` | author, instructor, Super Admin | mark resolved |
| `POST` / `DELETE /qa/questions/{id}/follow` | participants | follow for reply notifications |
| `POST /qa/questions/{id}/answers` `{body, parent_answer_id?}` | participants | answer or reply (one level deep). Instructor answers are flagged `is_instructor_answer`. Returns the whole thread |
| `PUT /qa/answers/{id}`, `DELETE /qa/answers/{id}` | author (delete: also instructor, Super Admin) | edit / delete |
| `POST /qa/answers/{id}/upvote` | participants | toggle; not your own |
| `POST /qa/answers/{id}/highlight` `{highlighted}` | instructor, Super Admin | pin the useful answer |
| `PATCH /qa/questions/{id}/moderate`, `PATCH /qa/answers/{id}/moderate` `{status: visible\|hidden\|removed}` | instructor, Super Admin | moderate. Hidden content is invisible to learners |

Replies notify the question author, followers and the parent answer's author (`qa_reply`).

## Content reports (`/reports`)
| Method & path | Who | What |
|---|---|---|
| `POST /reports` `{target_type, target_id, reason, details?}` | logged in | `target_type`: course, review, qa_question, qa_answer, user. `reason`: spam, abuse, inappropriate, copyright, other. Not your own content; no duplicate while open |
| `GET /reports/my` | logged in | what I reported |
| `GET /reports?status=&target_type=&reason=` | Super Admin | moderation queue with a preview of the content |
| `GET /reports/{id}` | Super Admin | one report |
| `PATCH /reports/{id}` `{status: reviewing\|resolved\|dismissed, resolution_note?, action: none\|hide\|remove\|restore}` | Super Admin | decide. `action` changes the reported review / question / answer; other open reports on the same content close with it |

When a question, answer or review gets `content.auto_hide_report_threshold` open reports from different
people (default 5) it is hidden automatically and logged as `content.auto_hidden`. `GET /admin/overview`
includes `open_reports`.

## Analytics
All three accept `days` (7-365, default 30) and return a `series` with one row per day.

| Endpoint | Who | Contents |
|---|---|---|
| `GET /analytics/platform` | Super Admin | daily `new_users / enrollments / completions / certificates`, period totals, top courses, categories, top instructors |
| `GET /analytics/instructor` | Instructor (own); Super Admin with `instructor_id` | totals (courses, enrollments, completion rate, rating, certificates), daily series, per-course rows |
| `GET /analytics/courses/{id}` | course owner, Super Admin | summary (completion, average progress, rating), daily series, per-lecture completion, per-quiz and per-question results, assignment grading status, rating distribution |

## Admin and enrollments
| Method & path | Who | What |
|---|---|---|
| `GET /admin/overview` | Super Admin | users (by role / status), courses (by status, pending review), enrollments, certificates, reviews, organizations |
| `GET /enrollments?course_id=&user_id=&status=&page=&limit=` | Super Admin; Instructor (own courses) | enrollments with learner and course |

## Certificates
| Method & path | Who | What |
|---|---|---|
| `GET /certificates/my` | logged in | my certificates |
| `POST /certificates/courses/{course_id}/claim` | learner | issue mine for a completed course (idempotent) |
| `GET /certificates/verify/{code}` | **public** | verify a code, shows name, course, dates, valid / revoked |
| `GET /certificates/{id}` | owner, course instructor, Super Admin | details |
| `GET /certificates/{id}/pdf` | owner, course instructor, Super Admin | PDF download |
| `GET /certificates?course_id=&user_id=&status=` | Super Admin; instructors with own `course_id` | list |
| `POST /certificates/{id}/revoke` `{reason}` | Super Admin | revoke |

Certificates are issued **automatically** when a learner completes the last lecture
(setting `certificates.auto_issue_on_completion`). If `certificates.require_all_quizzes_passed`
is on, every graded quiz must also be passed. One certificate per learner per course; a
revoked certificate is never re-issued automatically.

## Reviews
| Method & path | Who | What |
|---|---|---|
| `POST /reviews` `{course_id, rating 1-5, review_text?}` | enrolled learner | one review per course |
| `GET /reviews/courses/{course_id}?rating=` | **public** | visible reviews, newest first |
| `GET /reviews/courses/{course_id}/summary` | **public** | average, count, 5→1 star breakdown |
| `GET /reviews/my` | logged in | my reviews |
| `PUT /reviews/{id}` | author | edit (not after removal) |
| `DELETE /reviews/{id}` | author or Super Admin | delete |
| `GET /reviews?status=&course_id=` | Super Admin | moderation list |
| `PATCH /reviews/{id}/moderate` `{status: visible\|hidden\|removed}` | Super Admin | moderate |

Only `visible` reviews appear publicly and count toward the rating.

## Organizations
| Method & path | Who | What |
|---|---|---|
| `POST /organizations` | Super Admin | create (slug generated from name if omitted) |
| `GET /organizations?search=&org_type=&status=` | Super Admin | list with member / course counts |
| `GET /organizations/my` | logged in | my organizations + my role in each |
| `GET /organizations/{id}` | Super Admin, members | details |
| `PUT /organizations/{id}` | Super Admin, org admin | edit (`status` is Super Admin only) |
| `DELETE /organizations/{id}` | Super Admin | delete (courses stay, unlinked) |
| `GET /organizations/{id}/stats` | Super Admin, org admin | members, courses, enrollments, certificates |
| `GET /organizations/{id}/members?member_role=` | Super Admin, org admin | members |
| `POST /organizations/{id}/members` `{email or user_id, member_role, designation}` | Super Admin, org admin | add an existing user |
| `PUT /organizations/{id}/members/{member_id}` | Super Admin, org admin | change role / designation |
| `DELETE /organizations/{id}/members/{member_id}` | Super Admin, org admin | remove (org admins can't remove the last admin) |
| `GET /organizations/{id}/courses` | members (published only), org admin / Super Admin (all) | courses |
| `PUT /organizations/{id}/courses/{course_id}` | Super Admin; org admin if the instructor is a member | link course |
| `DELETE /organizations/{id}/courses/{course_id}` | Super Admin, org admin | unlink course |

Organization roles (`member_role`): `admin`, `instructor`, `learner`, `member`. These are
separate from the platform role (`users.role`).
