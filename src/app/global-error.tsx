'use client';

import NextError from 'next/error';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <NextError statusCode={0} />
        <button onClick={reset} style={{ marginTop: 16 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
