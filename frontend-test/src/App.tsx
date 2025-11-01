import { useEffect, useState } from 'react'
import './style.css'

declare global {
  interface Window {
    google: any;
  }
}

const BACKEND_URL = 'http://localhost:4000';
const GOOGLE_CLIENT_ID = '411040153605-lnq5ojresaob1qoomtapuaeprmahc2nc.apps.googleusercontent.com';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

function App() {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [result, setResult] = useState<AuthResponse | null>(null);
  const [backendUrl, setBackendUrl] = useState(BACKEND_URL);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        setIsGoogleLoaded(true);
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response: { credential: string }) => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Sending token to backend...' });
    setResult(null);

    try {
      const res = await fetch(`${backendUrl}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: response.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setStatus({ type: 'success', message: '✅ Sign-in successful!' });
      setResult(data);

      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('Full response:', data);
      console.log('Access Token:', data.tokens.accessToken);
      console.log('Refresh Token:', data.tokens.refreshToken);
    } catch (error: any) {
      console.error('Error:', error);
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRenderButton = (element: HTMLDivElement | null) => {
    if (element && isGoogleLoaded && window.google) {
      window.google.accounts.id.renderButton(element, {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'signin_with',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🧪 Test Google Sign-In
          </h1>
          <p className="text-gray-600">
            Test your Google OAuth authentication
          </p>
        </div>

        {/* Backend URL Configuration */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <label htmlFor="backend-url" className="block text-sm font-semibold text-yellow-800 mb-2">
            Backend URL:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="backend-url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:4000"
              className="flex-1 px-4 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center mb-6">
          {isGoogleLoaded ? (
            <div ref={handleRenderButton} id="google-signin-button"></div>
          ) : (
            <div className="px-6 py-3 bg-gray-200 rounded-lg text-gray-500">
              Loading Google Sign-In...
            </div>
          )}
        </div>

        {/* Status Messages */}
        {status && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              status.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : status.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {loading && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span className="font-medium">{status.message}</span>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Response:</h3>
            
            {/* User Info */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">User Information:</h4>
              <div className="bg-white p-4 rounded-lg">
                {result.user.avatar && (
                  <img
                    src={result.user.avatar}
                    alt={result.user.name}
                    className="w-16 h-16 rounded-full mx-auto mb-3"
                  />
                )}
                <p className="text-gray-800 font-medium">{result.user.name}</p>
                <p className="text-gray-600 text-sm">{result.user.email}</p>
                <p className="text-gray-500 text-xs mt-1">ID: {result.user.id}</p>
              </div>
            </div>

            {/* Tokens (Truncated) */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tokens (check console for full tokens):</h4>
              <div className="bg-white p-4 rounded-lg space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Access Token:</p>
                  <code className="text-xs text-gray-700 break-all">
                    {result.tokens.accessToken.substring(0, 50)}...
                  </code>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Refresh Token:</p>
                  <code className="text-xs text-gray-700 break-all">
                    {result.tokens.refreshToken.substring(0, 50)}...
                  </code>
                </div>
              </div>
            </div>

            {/* Stored in localStorage indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ✓ Tokens have been saved to localStorage
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold mb-2">Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Click the Google Sign-In button above</li>
            <li>Select your Google account</li>
            <li>Check the response below for user info and tokens</li>
            <li>Open browser console (F12) to see full token details</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;

