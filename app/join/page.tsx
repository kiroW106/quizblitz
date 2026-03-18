import { Suspense } from "react";
import JoinClient from "./JoinClient";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center text-white/70 font-semibold">
          Loading…
        </main>
      }
    >
      <JoinClient />
    </Suspense>
  );
}

