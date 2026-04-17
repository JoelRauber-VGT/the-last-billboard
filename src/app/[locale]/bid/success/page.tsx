'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BidSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get user email from session or use placeholder
    const fetchUserEmail = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      }
    };
    fetchUserEmail();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Terminal-style card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden font-mono">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
            <span className="text-blue-400 text-sm">$ payment</span>
            <span className="text-zinc-600 text-xs">[esc]</span>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Processing steps */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">&gt; processing...</span>
                <span className="text-blue-400">[ok]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">&gt; verifying transaction...</span>
                <span className="text-blue-400">[ok]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">&gt; allocating 400px...</span>
                <span className="text-blue-400">[ok]</span>
              </div>
              <div className="text-blue-400">&gt; bid confirmed</div>
            </div>

            {/* Success messages */}
            <div className="space-y-1 text-sm text-zinc-400 pt-4">
              <div>&gt; your slot is now live on the billboard</div>
              <div>&gt; confirmation sent to {userEmail || 'your email'}</div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="px-4 py-2 text-sm text-blue-400 border border-blue-400/30 rounded hover:bg-blue-400/10 transition-colors"
              >
                [view on billboard]
              </button>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="px-4 py-2 text-sm text-zinc-500 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
              >
                [close]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
