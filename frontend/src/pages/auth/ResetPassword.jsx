import React from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function ResetPassword() {
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-center mb-6">Set New Password</h2>
      <form className="space-y-4">
        <Input label="New Password" type="password" placeholder="••••••••" />
        <Input label="Confirm Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">Update Password</Button>
      </form>
    </div>
  );
}
