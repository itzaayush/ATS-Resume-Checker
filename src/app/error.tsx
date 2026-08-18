"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-lg place-items-center px-5 py-28 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Something broke on our side</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Nothing you uploaded was stored. Retry the action, and if it happens again quote the reference below.
      </p>
      {error.digest ? <p className="mt-3 font-mono text-[12px] text-subtle">reference {error.digest}</p> : null}
      <Button className="mt-7" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
