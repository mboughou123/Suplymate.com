import { Suspense } from "react";
import MessagesClient from "./MessagesClient";

export const metadata = {
  title: "Messages · Suplymate",
};

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesClient />
    </Suspense>
  );
}
