import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div
      className="flex h-full min-h-[400px] w-full items-center justify-center p-6"
      role="main"
      aria-labelledby="error-title"
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"
            aria-hidden="true"
          >
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 id="error-title" className="text-xl font-semibold">
            Page Not Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Error code: 404
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Back
            </Button>
            <Button asChild aria-label="Return to dashboard">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
