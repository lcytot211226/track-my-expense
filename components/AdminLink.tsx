"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminLink({ onClick }: { onClick?: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => {});
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      onClick={onClick}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      管理員
    </Link>
  );
}
