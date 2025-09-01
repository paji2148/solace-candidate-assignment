// src/app/advocates/[id]/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Advocate not found</h1>
      <p className="mt-2 text-gray-600">
        The advocate you’re looking for doesn’t exist.
      </p>
      <div className="mt-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to list
        </Link>
      </div>
    </main>
  );
}
