"use client";

import { motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  Factory,
  Users,
  Boxes,
  FlaskConical,
  Globe2,
  Languages,
  PackageCheck,
  Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";

export default function CompanyProfileSection({ profile }: { profile: SupplierProfile }) {
  const { company } = profile;

  const metrics: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: CalendarDays, label: "Registered", value: company.registrationDate },
    { icon: Building2, label: "Business type", value: company.businessType },
    { icon: Factory, label: "Factory size", value: company.factorySize },
    { icon: Users, label: "Employees", value: `${company.employeeCount} staff` },
    { icon: Boxes, label: "Production lines", value: `${company.productionLines} lines` },
    { icon: FlaskConical, label: "R&D engineers", value: `${company.rdEngineers}` },
    { icon: Gauge, label: "Production capacity", value: company.productionCapacity },
    { icon: PackageCheck, label: "Minimum order", value: company.moq },
  ];

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Company"
        title="Company profile"
        description="Verified manufacturing footprint, capacity and global reach."
        icon={<Building2 className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.45 }}
            className="glass-card glass-hover flex items-start gap-3 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
              <m.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
                {m.label}
              </p>
              <p className="truncate text-sm font-bold text-ink" title={m.value}>
                {m.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Globe2 className="h-4 w-4 text-cyan" aria-hidden /> Export markets
          </div>
          <div className="flex flex-wrap gap-2">
            {company.exportMarkets.map((m) => (
              <span
                key={m}
                className="rounded-full bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Languages className="h-4 w-4 text-teal" aria-hidden /> Languages spoken
          </div>
          <div className="flex flex-wrap gap-2">
            {company.languages.map((l) => (
              <span
                key={l}
                className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
