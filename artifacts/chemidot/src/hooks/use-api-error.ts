import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

const HTTP_MESSAGES: Record<number, string> = {
  400: "The request was invalid. Please check your input.",
  401: "Your session has expired. Please log in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "A conflict occurred. This may already exist.",
  422: "Validation failed. Please check your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "A server error occurred. Please try again later.",
  503: "Service temporarily unavailable. Please try again shortly.",
};

export function useApiError() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: unknown, fallbackMessage = "Something went wrong. Please try again.") => {
      if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status: number }).status;
        const message = HTTP_MESSAGES[status] ?? fallbackMessage;
        toast({ title: "Error", description: message, variant: "destructive" });
        return;
      }
      if (error instanceof Error) {
        toast({ title: "Error", description: error.message || fallbackMessage, variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: fallbackMessage, variant: "destructive" });
    },
    [toast]
  );

  return { handleError };
}
