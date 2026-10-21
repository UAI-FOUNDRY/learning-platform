import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const { enterDevPreview } = useAuth();
  const navigate = useNavigate();

  const handleEnterDevPreview = () => {
    if (enterDevPreview) {
      enterDevPreview();
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border border-[#B6AA9A]">
      <h2 className="text-2xl font-bold text-center mb-6 text-[#211E1A]">Sign In</h2>
      <form className="space-y-4">
        <Input label="Email Address" type="email" placeholder="you@example.com" />
        <Input label="Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
      </div>

      {/* Development-only preview trigger (dead-code eliminated in production builds) */}
      {import.meta.env.DEV && (
        <div className="mt-6 pt-4 border-t border-amber-200 bg-amber-50/70 rounded-lg p-3 text-center">
          <p className="text-xs font-semibold text-amber-900 mb-1">⚡ Local Development Mode</p>
          <p className="text-[11px] text-amber-800/80 mb-3">Backend offline? Preview the Super Admin UI locally in dev mode.</p>
          <button
            type="button"
            onClick={handleEnterDevPreview}
            className="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
          >
            Launch Super Admin Preview
          </button>
        </div>
      )}
    </div>
  );
}
