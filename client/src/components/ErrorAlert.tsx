import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: "default" | "destructive";
}

export function ErrorAlert({
  title = "Error",
  message,
  onRetry,
  onDismiss,
  variant = "destructive",
}: ErrorAlertProps) {
  return (
    <Alert variant={variant} className="relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 pr-8">
        {message}
      </AlertDescription>

      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="gap-2"
          >
            <X className="h-3 w-3" />
            Dismiss
          </Button>
        )}
      </div>
    </Alert>
  );
}
