"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  MessageCircle,
  TrendingUp,
  Truck,
  Factory,
} from "lucide-react";
import type { ActivityItem } from "./types";

const ICONS = {
  ai: Sparkles,
  quote: MessageCircle,
  price: TrendingUp,
  shipping: Truck,
  supplier: Factory,
};

const STATUS_COLORS = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-cyan",
};

type Props = {
  items: ActivityItem[];
};

export default function ActivityFeed({ items }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-white/8 bg-white/4 p-5"
    >
      <h2 className="text-sm font-bold text-white">Procurement activity</h2>
      <p className="text-[11px] text-white/40">Live feed · updates & AI signals</p>

      <ul className="mt-4 space-y-0">
        {items.map((item, i) => {
          const Icon = ICONS[item.type];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
              className="relative flex gap-3 border-l border-white/8 py-3 pl-5 last:pb-0"
            >
              <span
                className={`absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full ${
                  item.status ? STATUS_COLORS[item.status] : "bg-white/20"
                } ring-4 ring-[#0F172A]`}
              />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <Icon className="h-4 w-4 text-gold/70" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <span className="shrink-0 text-[10px] text-white/30">{item.time}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
                  {item.detail}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
