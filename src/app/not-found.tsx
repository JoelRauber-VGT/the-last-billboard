import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted/50 p-6">
            <AlertCircle className="size-16 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold">404</h1>
          <h2 className="text-xl md:text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">Back to Home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
