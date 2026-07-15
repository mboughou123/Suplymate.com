"use client";

import Error from "next/error";

/** Fallback for requests that never enter the `[locale]` segment. */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <Error statusCode={404} />
      </body>
    </html>
  );
}
