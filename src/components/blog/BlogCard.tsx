import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Clock } from "lucide-react";
import type { BlogPost } from "@/data/blog";

const CATEGORY_TONE: Record<BlogPost["category"], string> = {
  Sourcing: "bg-cyan-soft text-cyan",
  AI: "bg-navy text-white",
  Suppliers: "bg-emerald-50 text-emerald-700",
  "Getting started": "bg-amber-50 text-amber-800",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-cardHover ${
        featured ? "lg:p-8" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${CATEGORY_TONE[post.category]}`}>{post.category}</span>
        <span className="text-ink-dim">{formatDate(post.publishedAt)}</span>
      </div>
      <h3 className={`mt-4 font-display font-bold tracking-tight text-ink text-balance ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}>
        {post.title}
      </h3>
      <p className={`mt-3 flex-1 leading-relaxed text-ink-muted ${featured ? "text-base" : "text-sm"}`}>{post.excerpt}</p>
      <div className="mt-5 flex items-center justify-between text-xs text-ink-dim">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden /> {post.readingMinutes} min read
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-cyan transition group-hover:gap-1.5">
          Read <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
