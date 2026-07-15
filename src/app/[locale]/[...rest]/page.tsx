import { notFound } from "next/navigation";

/** Catch unknown locale-prefixed routes so `[locale]/not-found.tsx` renders. */
export default function CatchAllPage() {
  notFound();
}
