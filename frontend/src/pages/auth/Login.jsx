import React from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function Login() {
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      <form className="space-y-4">
        <Input label="Email Address" type="email" placeholder="you@example.com" />
        <Input label="Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
      </div>
    </div>
  );
}
