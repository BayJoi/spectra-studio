import React from "react";

const UNRECOVERABLE_MESSAGES = [
  "WebGL2 is not available",
  "WebGL2 is not available in this browser",
  "Shader failed to compile",
  "Program failed to link",
];

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; unrecoverable: boolean }
> {
  state = { hasError: false, error: null as Error | null, unrecoverable: false };

  static getDerivedStateFromError(error: Error) {
    const msg = error.message ?? "";
    const unrecoverable = UNRECOVERABLE_MESSAGES.some((m) => msg.includes(m));
    return { hasError: true, error, unrecoverable };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="w-full h-full flex items-center justify-center p-8 text-center">
          <div className="max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl p-8">
            <div className="i-lucide-alert-triangle w-8 h-8 text-orange-500 mx-auto mb-4" />
            <p className="text-neutral-100 font-medium mb-2">Something went wrong</p>
            <p className="text-neutral-400 text-sm mb-6">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            {this.state.unrecoverable ? (
              <p className="text-neutral-600 text-xs">This error cannot be recovered from. Try refreshing the page.</p>
            ) : (
              <button
                onClick={() => this.setState({ hasError: false, error: null, unrecoverable: false })}
                className="px-5 py-2 text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 hover:shadow-[0_0_10px_rgba(253,154,62,0.3)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer rounded-md"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
