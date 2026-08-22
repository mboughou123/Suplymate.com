import {
  Award,
  Factory,
  Ruler,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/product-detail";

export const PRODUCT_ICONS: Record<IconKey, LucideIcon> = {
  award: Award,
  factory: Factory,
  ruler: Ruler,
  package: Package,
  sparkles: Sparkles,
};
