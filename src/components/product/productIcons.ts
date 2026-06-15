import {
  Shield,
  Truck,
  Award,
  Factory,
  Leaf,
  Ruler,
  Package,
  Globe,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/product-detail";

export const PRODUCT_ICONS: Record<IconKey, LucideIcon> = {
  shield: Shield,
  truck: Truck,
  award: Award,
  factory: Factory,
  leaf: Leaf,
  ruler: Ruler,
  package: Package,
  globe: Globe,
  sparkles: Sparkles,
};
