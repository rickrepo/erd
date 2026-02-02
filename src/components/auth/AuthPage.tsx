import { useState, useCallback } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Database,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

type AuthView = 'login' | 'register' | 'forgot';

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
  confirmPassword?: string;
}

export function AuthPage() {
  const { login, register } = useAuthStore();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (view === 'register') {
      if (!name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, confirmPassword, name, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (view === 'login') {
        await login(email, password);
        setSuccessMessage('Login successful! Redirecting...');
      } else if (view === 'register') {
        await register(email, password, name);
        setSuccessMessage('Account created successfully!');
      }
    } catch (error) {
      setErrorMessage(
        view === 'login'
          ? 'Invalid email or password. Please try again.'
          : 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSuccessMessage('Password reset link sent to your email!');
    setIsLoading(false);
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setErrors({});
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Schema<span className="text-blue-400">Flow</span>
              </h1>
              <p className="text-sm text-slate-400">Database Design Made Simple</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-8">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Transform SQL into<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Beautiful ERD Diagrams
            </span>
          </h2>

          <div className="space-y-4">
            {[
              { icon: Zap, title: 'Instant Parsing', desc: 'Paste SQL and get instant ERD visualization' },
              { icon: Sparkles, title: 'AI-Powered', desc: 'Smart relationship detection with AI analysis' },
              { icon: Shield, title: 'Professional Export', desc: 'Export high-quality PNG/SVG diagrams' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} SchemaFlow. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Schema<span className="text-blue-400">Flow</span>
            </h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {view === 'login' && 'Welcome back'}
              {view === 'register' && 'Create your account'}
              {view === 'forgot' && 'Reset password'}
            </h2>
            <p className="text-slate-400">
              {view === 'login' && 'Sign in to continue to SchemaFlow'}
              {view === 'register' && 'Start designing professional database schemas'}
              {view === 'forgot' && "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={view === 'forgot' ? handleForgotPassword : handleSubmit} className="space-y-5">
            {/* Name Field (Register only) */}
            {view === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    className={`w-full pl-11 pr-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      errors.name ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            {view !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    className={`w-full pl-11 pr-12 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
                    }`}
                    placeholder={view === 'register' ? 'Create a password' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
                {view === 'register' && !errors.password && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    At least 8 characters required
                  </p>
                )}
              </div>
            )}

            {/* Confirm Password (Register only) */}
            {view === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                    }}
                    className={`w-full pl-11 pr-12 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                      errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Remember Me & Forgot Password (Login only) */}
            {view === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-400">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {view === 'login' && 'Sign In'}
                  {view === 'register' && 'Create Account'}
                  {view === 'forgot' && 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Terms (Register only) */}
            {view === 'register' && (
              <p className="text-xs text-slate-500 text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>
              </p>
            )}
          </form>

          {/* Switch View */}
          <div className="mt-8 text-center">
            {view === 'login' && (
              <p className="text-slate-400">
                Don't have an account?{' '}
                <button
                  onClick={() => switchView('register')}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Sign up for free
                </button>
              </p>
            )}
            {view === 'register' && (
              <p className="text-slate-400">
                Already have an account?{' '}
                <button
                  onClick={() => switchView('login')}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
            {view === 'forgot' && (
              <button
                onClick={() => switchView('login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
