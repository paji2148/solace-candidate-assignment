// src/app/advocates/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Advocate } from "../../types/advocate";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  const fromEnv = process.env.SERVER_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const h = headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host");
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export default async function AdvocatePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const res = await fetch(`${getBaseUrl()}/api/advocates/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Failed to load advocate (${res.status})`);

  const a = (await res.json()) as Advocate;

  const specialties = Array.isArray(a.specialties) ? a.specialties : [];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to list
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {a.firstName} {a.lastName}
        </h1>
        {a.city && <p className="text-gray-600">{a.city}</p>}
      </header>

      <section className="grid gap-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Profile
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-gray-500">Degree</dt>
              <dd className="text-gray-800">{a.degree || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">
                Years of Experience
              </dt>
              <dd className="text-gray-800">
                {a.yearsOfExperience ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Phone</dt>
              <dd className="text-gray-800">
                {a.phoneNumber ? (
                  <a
                    href={`tel:+1${String(a.phoneNumber)}`}
                    className="hover:underline"
                  >
                    +1{String(a.phoneNumber)}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Specialties
          </h2>
          {specialties.length === 0 ? (
            <p className="text-gray-600">—</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {specialties.map((s, i) => (
                <li
                  key={`${s}-${i}`}
                  className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-800"
                  title={s}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
