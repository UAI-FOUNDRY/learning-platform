import React from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function Register() {
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
      <form className="space-y-4">
        <Input label="Full Name" type="text" placeholder="John Doe" />
        <Input label="Email Address" type="email" placeholder="you@example.com" />
        <Input label="Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">Register</Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <Link to="/login" className="text-blue-600 hover:underline">Sign In</Link>
      </div>
    </div>
  );
}
