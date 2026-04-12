"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return (
    <div className="error-page">
      <div className="error-card">
        <p className="error-card-title">Something went wrong</p>
        <p className="error-card-message">
          An unexpected error occurred. This has been logged.
        </p>
        <button className="error-card-btn" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
