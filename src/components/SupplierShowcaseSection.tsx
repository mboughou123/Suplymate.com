import Reveal from "@/components/Reveal";
import HomeSupplierCard, {
  type HomeSupplierCardProps,
} from "@/components/HomeSupplierCard";

const showcaseSuppliers: HomeSupplierCardProps[] = [
  {
    logoText: "AS",
    companyName: "Atlas Steel Co.",
    category: "Metal suppliers",
    description:
      "Structural steel, sheet metal, and alloy stock for construction and fabrication with mill-direct sourcing and traceable certifications.",
    location: "Pittsburgh, PA · USA",
    reliabilityScore: 94,
    verified: true,
  },
  {
    logoText: "BC",
    companyName: "BuildCore Materials",
    category: "Construction materials",
    description:
      "Aggregates, cement, and bulk building supplies for commercial projects with regional logistics and volume pricing.",
    location: "Frankfurt · Germany",
    reliabilityScore: 91,
    verified: true,
  },
  {
    logoText: "PN",
    companyName: "PackNova Manufacturing",
    category: "Packaging manufacturers",
    description:
      "Custom corrugated boxes, flexible films, and sustainable packaging solutions for FMCG and industrial distribution.",
    location: "Ho Chi Minh City · Vietnam",
    reliabilityScore: 89,
    verified: true,
  },
  {
    logoText: "ES",
    companyName: "ElectroSource Global",
    category: "Electronics suppliers",
    description:
      "PCB assemblies, connectors, and industrial electronics with ISO-certified production and global component sourcing.",
    location: "Shenzhen · China",
    reliabilityScore: 92,
    verified: true,
  },
  {
    logoText: "TX",
    companyName: "Texora Fabrics",
    category: "Textile manufacturers",
    description:
      "Technical textiles, woven and knit fabrics for apparel and upholstery with OEKO-TEX compliant dyeing processes.",
    location: "Istanbul · Turkey",
    reliabilityScore: 88,
    verified: true,
  },
  {
    logoText: "IP",
    companyName: "Industrium Parts",
    category: "Industrial equipment suppliers",
    description:
      "Hydraulic components, bearings, and MRO parts for heavy industry with same-day dispatch from European warehouses.",
    location: "Rotterdam · Netherlands",
    reliabilityScore: 93,
    verified: true,
  },
];

export default function SupplierShowcaseSection() {
  return (
    <section className="container-page py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Verified Suppliers Across Key Industries
        </h2>
        <p className="mt-3 text-ink-muted">
          Explore vetted manufacturers and distributors — scored for reliability,
          compliance, and delivery performance.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {showcaseSuppliers.map((supplier, i) => (
          <Reveal key={supplier.companyName} delay={i * 80}>
            <HomeSupplierCard {...supplier} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
