import React from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ForgotPassword() {
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-center mb-4">Reset Password</h2>
      <p className="text-sm text-gray-600 mb-6 text-center">Enter your email address to receive password reset instructions.</p>
      <form className="space-y-4">
        <Input label="Email Address" type="email" placeholder="you@example.com" />
        <Button type="submit" className="w-full">Send Reset Link</Button>
      </form>
    </div>
  );
}
