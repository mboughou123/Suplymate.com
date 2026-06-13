"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";

type Props = {
  supplierId: string;
  supplierName: string;
  className?: string;
};

export default function FavoriteButton({
  supplierId,
  supplierName,
  className = "",
}: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((d) => {
        if (!active) return;
        setFavorited(
          (d.favorites ?? []).some(
            (f: { supplierId: string }) => f.supplierId === supplierId
          )
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [status, supplierId]);

  async function toggle() {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/suppliers");
      return;
    }
    if (busy) return;
    setBusy(true);
    setFavorited((v) => !v); // optimistic
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, supplierName }),
      });
      const data = await res.json();
      setFavorited(!!data.favorited);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={favorited ? "Remove from favorites" : "Save supplier"}
      title={favorited ? "Saved" : "Save supplier"}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${className}`}
    >
      <Heart
        className={`h-4 w-4 ${favorited ? "fill-rose-500 text-rose-500" : "text-ink-dim"}`}
        aria-hidden
      />
    </button>
  );
}
