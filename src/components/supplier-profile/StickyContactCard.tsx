"use client";

import {
  MessageCircle,
  FileText,
  PackageOpen,
  Receipt,
  Sparkles,
  Handshake,
  Clock,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { getSupplierMeta } from "@/lib/supplier-meta";
import ProfileActionButton from "./ProfileActionButton";

export default function StickyContactCard({
  profile,
  variant = "sidebar",
}: {
  profile: SupplierProfile;
  variant?: "sidebar" | "mobile";
}) {
  const { base } = profile;
  const meta = getSupplierMeta(base.id);
  const firstProduct = base.products[0]?.name;

  if (variant === "mobile") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundImage: base.logoGradient }}>
            {base.logoText}
            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${meta.online ? "bg-emerald-500" : "bg-slate-300"}`} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink">{base.name}</p>
            <p className="text-[10px] text-ink-dim">{meta.lastActive} · {meta.responseTime}</p>
          </div>
        </div>
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="rfq"
          label="RFQ"
          icon={FileText}
          productName={firstProduct}
          className="btn-secondary !px-3 !py-2 text-xs"
        />
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="contact"
          label="Contact"
          icon={MessageCircle}
          className="btn-primary !px-4 !py-2 text-xs"
        />
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white" style={{ backgroundImage: base.logoGradient }}>
            {base.logoText}
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${meta.online ? "bg-emerald-500" : "bg-slate-300"}`} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{base.name}</p>
            <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <span className={`h-1.5 w-1.5 rounded-full ${meta.online ? "bg-emerald-500" : "bg-slate-300"}`} />
              {meta.lastActive}
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-xs">
          <Row icon={Clock} label="Avg. reply time" value={meta.responseTime} />
          <Row icon={ShieldCheck} label="Response rate" value={`${meta.responseRate}%`} />
          <Row icon={CalendarClock} label="Business hours" value="Mon–Fri 8:00–18:00" />
        </dl>
      </div>

      {/* Actions */}
      <div className="space-y-2 p-5">
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="contact"
          label="Contact Supplier"
          icon={MessageCircle}
          className="btn-primary w-full justify-center"
        />
        <div className="grid grid-cols-2 gap-2">
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="negotiate"
            label="Live chat"
            icon={Handshake}
            className="btn-secondary justify-center !px-3 text-xs"
          />
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="rfq"
            label="Send RFQ"
            icon={FileText}
            productName={firstProduct}
            className="btn-secondary justify-center !px-3 text-xs"
          />
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="samples"
            label="Samples"
            icon={PackageOpen}
            productName={firstProduct}
            className="btn-secondary justify-center !px-3 text-xs"
          />
          <ProfileActionButton
            supplierId={base.id}
            supplierName={base.name}
            intent="quote"
            label="Quotation"
            icon={Receipt}
            productName={firstProduct}
            className="btn-secondary justify-center !px-3 text-xs"
          />
        </div>
        <ProfileActionButton
          supplierId={base.id}
          supplierName={base.name}
          intent="ai-sourcing"
          label="AI sourcing assistant"
          icon={Sparkles}
          productName={firstProduct}
          className="w-full justify-center rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 to-ai-mist px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:border-gold/50"
        />
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        <Icon className="h-3.5 w-3.5 text-cyan" aria-hidden /> {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
