// src/app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Advocate, AdvocatesResponse } from "./types/advocate";
import { formatListPreview } from "./helpers/format";

/* ---------- small presentational helpers ---------- */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-3 align-top text-gray-800 ${className}`}>
      {children}
    </td>
  );
}

/* ---------- cells ---------- */
function SpecialtiesCell({ specialties }: { specialties: unknown }) {
  const list = Array.isArray(specialties) ? (specialties as string[]) : [];
  if (list.length === 0) return <Td>—</Td>;

  const { display } = formatListPreview(list, { maxItems: 3, maxChars: 60 });

  return (
    <Td className="group relative max-w-64">
      {/* Make it keyboard focusable so tooltip also appears on focus */}
      <span tabIndex={0} className="block truncate outline-none">
        {display}
      </span>
    </Td>
  );
}

/* ---------- page ---------- */
const PAGE_SIZES = [5, 10, 20, 50, 100] as const;

export default function Home() {
  const [rows, setRows] = useState<Advocate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // debounce search (150ms)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(rawSearch.trim()), 150);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [rawSearch]);

  // reset to page 1 when search or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  // fetch from API (server-side pagination)
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          q: search,
        }).toString();

        const res = await fetch(`/api/advocates?${qs}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }

        const json = (await res.json()) as AdvocatesResponse;

        // normalize createdAt to Date | null
        const parsed: Advocate[] = json.data.map((a) => ({
          ...a,
          createdAt: a.createdAt ? new Date(a.createdAt) : null,
        }));

        setRows(parsed);
        setTotal(json.meta.total);
        setTotalPages(json.meta.totalPages);
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string };
        if (err?.name !== "AbortError") {
          setError(err?.message || "Failed to load advocates.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, pageSize, search]);

  // derived
  const { startIdx, endIdx } = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return { startIdx: start, endIdx: end };
  }, [page, pageSize, total]);

  // pagination actions
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  const onReset = () => setRawSearch("");

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Solace Advocates</h1>

      {/* Controls */}
      <section className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="search" className="font-medium">
          Search
        </label>
        <input
          id="search"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          placeholder="Try a name, city, or specialty…"
          className="w-72 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
        />

        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 active:scale-[0.99]"
        >
          Reset
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="pagesize" className="text-sm text-gray-700">
            Rows per page
          </label>
          <select
            id="pagesize"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {search && (
          <span className="w-full text-sm text-gray-600">
            Searching for: <span className="font-medium">{search}</span>
          </span>
        )}
      </section>

      {/* States */}
      {loading && (
        <div className="mt-6 space-y-2" aria-live="polite">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-40 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
        >
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {total === 0 ? (
            <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
              No advocates found{search ? ` for “${search}”` : ""}.
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-[800px] w-full border-collapse text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <Th>First Name</Th>
                      <Th>Last Name</Th>
                      <Th>City</Th>
                      <Th>Degree</Th>
                      <Th>Specialties</Th>
                      <Th>Years of Experience</Th>
                      <Th>Phone Number</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((a, idx) => {
                      const key =
                        a.id ?? a.phoneNumber ?? `${a.firstName}-${a.lastName}-${idx}`;
                      const rowBg =
                        idx % 2 ? "bg-white" : "bg-gray-50/40 hover:bg-gray-50";

                      return (
                        <tr key={key} className={rowBg}>
                          <Td>
                            <Link
                              href={`/advocates/${a.id}`}
                              className="text-blue-600 hover:underline"
                              aria-label={`Open ${a.firstName} ${a.lastName}`}
                            >
                              {a.firstName}
                            </Link>
                          </Td>
                          <Td>
                            <Link
                              href={`/advocates/${a.id}`}
                              className="text-blue-600 hover:underline"
                              aria-label={`Open ${a.firstName} ${a.lastName}`}
                            >
                              {a.lastName}
                            </Link>
                          </Td>
                          <Td>{a.city}</Td>
                          <Td>{a.degree}</Td>
                          <SpecialtiesCell specialties={a.specialties} />
                          <Td>{a.yearsOfExperience}</Td>
                          <Td className="font-medium">+1{String(a.phoneNumber)}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer: results + pagination */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                <span>
                  Showing <span className="font-medium">{startIdx}</span>–
                  <span className="font-medium">{endIdx}</span> of{" "}
                  <span className="font-medium">{total}</span>
                </span>

                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={goFirst}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40"
                    aria-label="First page"
                  >
                    « First
                  </button>
                  <button
                    onClick={goPrev}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    ‹ Prev
                  </button>
                  <span className="px-2">
                    Page <span className="font-medium">{page}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </span>
                  <button
                    onClick={goNext}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    Next ›
                  </button>
                  <button
                    onClick={goLast}
                    disabled={page === totalPages}
                    className="rounded-lg border border-gray-300 px-2 py-1 disabled:opacity-40"
                    aria-label="Last page"
                  >
                    Last »
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
