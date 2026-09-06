"use client";

import { useTranslations } from "next-intl";
import { Building2, Factory, Check } from "lucide-react";
import type { AccountRole } from "@/lib/roles";

type SelectableRole = Exclude<AccountRole, "admin">;

type Props = {
  value: SelectableRole;
  onChange: (role: SelectableRole) => void;
  disabled?: boolean;
};

export default function RoleSelector({ value, onChange, disabled }: Props) {
  const t = useTranslations("authentication");

  const options: {
    id: SelectableRole;
    label: string;
    desc: string;
    Icon: typeof Building2;
  }[] = [
    { id: "buyer", label: t("roleBuyer"), desc: t("roleBuyerDesc"), Icon: Building2 },
    { id: "supplier", label: t("roleSupplier"), desc: t("roleSupplierDesc"), Icon: Factory },
  ];

  return (
    <fieldset disabled={disabled}>
      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-dim">
        {t("whoAreYou")}
      </legend>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2" role="radiogroup">
        {options.map(({ id, label, desc, Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(id)}
              className={`group flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                active
                  ? "border-cyan bg-cyan-soft shadow-[0_0_0_1px_rgba(3,105,161,0.35),0_8px_24px_-12px_rgba(3,105,161,0.45)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {/* Icon and check badge share a row so the label below can use the full card width. */}
              <span className="flex w-full items-center justify-between gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active ? "bg-cyan text-white" : "bg-slate-100 text-ink-muted group-hover:text-ink"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                    active ? "border-cyan bg-cyan text-white" : "border-slate-300 bg-white text-transparent"
                  }`}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug text-ink">{label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
