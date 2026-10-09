import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import LearnerLayout from '../layouts/LearnerLayout';
import InstructorLayout from '../layouts/InstructorLayout';
import AdminLayout from '../layouts/AdminLayout';

// Public Pages
import Home from '../pages/public/Home';
import CourseCatalog from '../pages/public/CourseCatalog';
import CourseDetails from '../pages/public/CourseDetails';
import About from '../pages/public/About';
import Contact from '../pages/public/Contact';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import VerifyEmail from '../pages/auth/VerifyEmail';

// Learner Pages
import LearnerDashboard from '../pages/learner/Dashboard';
import MyLearning from '../pages/learner/MyLearning';
import CoursePlayer from '../pages/learner/CoursePlayer';
import Quiz from '../pages/learner/Quiz';
import Assignment from '../pages/learner/Assignment';
import Certificates from '../pages/learner/Certificates';
import Wishlist from '../pages/learner/Wishlist';
import LearnerProfile from '../pages/learner/Profile';

// Instructor Pages
import InstructorDashboard from '../pages/instructor/Dashboard';
import CreateCourse from '../pages/instructor/CreateCourse';
import CourseEditor from '../pages/instructor/CourseEditor';
import Curriculum from '../pages/instructor/Curriculum';
import ContentUpload from '../pages/instructor/ContentUpload';
import QuizBuilder from '../pages/instructor/QuizBuilder';
import AssignmentBuilder from '../pages/instructor/AssignmentBuilder';
import CoursePreview from '../pages/instructor/CoursePreview';
import Submissions from '../pages/instructor/Submissions';
import InstructorAnalytics from '../pages/instructor/Analytics';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import CourseApprovals from '../pages/admin/CourseApprovals';
import CourseReview from '../pages/admin/CourseReview';
import Users from '../pages/admin/Users';
import Instructors from '../pages/admin/Instructors';
import Organizations from '../pages/admin/Organizations';
import Categories from '../pages/admin/Categories';
import Reports from '../pages/admin/Reports';

// Navigation Guard
import NotFound from '../components/navigation/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<CourseCatalog />} />
        <Route path="/courses/:id" element={<CourseDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Learner Routes */}
      <Route path="/learner" element={<LearnerLayout />}>
        <Route path="dashboard" element={<LearnerDashboard />} />
        <Route path="my-learning" element={<MyLearning />} />
        <Route path="player/:courseId" element={<CoursePlayer />} />
        <Route path="quiz/:quizId" element={<Quiz />} />
        <Route path="assignment/:assignmentId" element={<Assignment />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="profile" element={<LearnerProfile />} />
      </Route>

      {/* Instructor Routes */}
      <Route path="/instructor" element={<InstructorLayout />}>
        <Route path="dashboard" element={<InstructorDashboard />} />
        <Route path="courses/new" element={<CreateCourse />} />
        <Route path="courses/:id/edit" element={<CourseEditor />} />
        <Route path="courses/:id/curriculum" element={<Curriculum />} />
        <Route path="courses/:id/content" element={<ContentUpload />} />
        <Route path="courses/:id/quiz-builder" element={<QuizBuilder />} />
        <Route path="courses/:id/assignment-builder" element={<AssignmentBuilder />} />
        <Route path="courses/:id/preview" element={<CoursePreview />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="analytics" element={<InstructorAnalytics />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="approvals" element={<CourseApprovals />} />
        <Route path="review/:id" element={<CourseReview />} />
        <Route path="users" element={<Users />} />
        <Route path="instructors" element={<Instructors />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="categories" element={<Categories />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
