import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button.tsx';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      // Mock API call to forgot password endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSent(true);
      toast.success('Reset link dispatched successfully.');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/login" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">
          Reset password
        </h2>
      </div>

      {!isSent ? (
        <>
          <p className="text-xs leading-relaxed text-gray-500 mb-6">
            Enter the email address associated with your account, and we will email you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <Button type="submit" isLoading={isLoading} className="w-full py-2.5">
              Send Reset Link
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-[#0E1116] mb-2">Check your email</p>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            We have sent password reset instructions to your email address. Please follow the instructions to reset your password.
          </p>
          <Link to="/login">
            <Button variant="secondary" className="w-full py-2.5">
              Back to Sign In
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
