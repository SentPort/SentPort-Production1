import { Link, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Header from '../../components/Header';

export default function SignInRequired() {
  const location = useLocation();
  const redirectUrl = `/signin?redirect=${encodeURIComponent(location.pathname)}`;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            You need to be signed in to access HuBook. Please sign in with your SentPort account to continue.
          </p>

          <Link
            to={redirectUrl}
            className="inline-block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In to SentPort
          </Link>

          <p className="mt-6 text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
