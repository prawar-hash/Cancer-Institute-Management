import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Lock, Mail, Chrome, Facebook } from 'lucide-react';

import axios from 'axios';
import api from '../../lib/api.ts';
import { setCredentials } from './authSlice.ts';
import Button from '../../components/ui/Button.tsx';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    console.log("Login Data:", data);
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/auth/login', data);
      const { access_token, user } = response.data;
      
      dispatch(setCredentials({ user, token: access_token }));
      localStorage.setItem("token", access_token);
      toast.success('Successfully signed in!');
      navigate('/');
    } catch (err: unknown) {
      let errorMsg = 'Failed to authenticate';
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.detail || errorMsg;
      }
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    try {
      const response = await api.post(`/api/v1/auth/oauth/${provider}`, {
        code: 'oauth_dummy_code',
        provider,
      });
      const { access_token, user } = response.data;
      
      dispatch(setCredentials({ user, token: access_token }));
      localStorage.setItem("token", access_token);
      toast.success(`Signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`);
      navigate('/');
    } catch {
      toast.error('Social login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-center text-lg font-bold text-gray-800">
        Sign in to your account
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Email Address
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="email"
              {...register('email')}
              placeholder="name@institute.org"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-[#0B63CE] focus:outline-none"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[#0B63CE] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-[#0B63CE] focus:outline-none"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full py-2.5 mt-2">
          Sign In
        </Button>
      </form>

      {/* Social Logins */}
      <div className="mt-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <span className="relative bg-white px-3 text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Or continue with
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            <Chrome className="h-4 w-4" />
            Google
          </button>
          <button
            onClick={() => handleOAuthLogin('facebook')}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </button>
        </div>
      </div>
    </div>
  );
}
