// Editorial blog content. Adding an article = adding an object here; the
// /blog and /blog/[slug] routes, cards, related posts and sitemap all derive
// from this list.

export type BlogSection = {
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: "Sourcing" | "AI" | "Suppliers" | "Getting started";
  readingMinutes: number;
  /** ISO date. */
  publishedAt: string;
  author: { name: string; role: string };
  sections: BlogSection[];
  /** Related catalog / product links shown at the end. */
  cta?: { label: string; href: string };
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-sourcing-overseas-is-still-difficult-in-2026",
    title: "Why Sourcing Overseas Is Still Difficult in 2026",
    excerpt:
      "Search engines got better and marketplaces got bigger, yet finding a reliable overseas supplier still takes weeks. Here is why — and what actually reduces the risk.",
    category: "Sourcing",
    readingMinutes: 7,
    publishedAt: "2026-08-12",
    author: { name: "Suplymate Editorial", role: "Sourcing research" },
    sections: [
      {
        paragraphs: [
          "Every year someone predicts that global sourcing is about to become as easy as ordering office supplies. Every year procurement teams keep a spreadsheet of suppliers they are not sure they trust. The tools improved; the underlying problems did not go away.",
        ],
      },
      {
        heading: "Discovery is noisy, not scarce",
        paragraphs: [
          "The problem is no longer finding suppliers — a single search returns thousands. The problem is that listings are optimised for the platform's ranking, not for your requirement. Trading companies present as factories, a single product photo appears under fifty company names, and 'verified' can mean anything from an audited plant to a paid badge.",
        ],
      },
      {
        heading: "Communication compounds small misunderstandings",
        paragraphs: [
          "Time zones, language and different assumptions about what is 'standard' turn a two-line question into a week-long thread. A grade written as '304' in one country is read as a different finish in another. Without a shared, structured requirement, each round-trip re-opens the spec.",
        ],
      },
      {
        heading: "Trust is asserted, rarely evidenced",
        paragraphs: [
          "Certificates are screenshots. References are unverifiable. Reviews are thin. Buyers end up trusting a gut feeling from a video call, which is precisely the situation that produces expensive surprises after the deposit is paid.",
        ],
      },
      {
        heading: "Quality control, logistics, MOQ and price uncertainty",
        paragraphs: [
          "Even with a good supplier, the first order is a negotiation over minimum quantities you don't need, an Incoterm you don't fully understand, inspection you can't attend and a price that moves with the underlying commodity. Each of these is manageable; together they are why 'just import it' rarely works the first time.",
        ],
        bullets: [
          "Inspect before shipment — a paid third-party inspection is cheaper than a rejected container.",
          "Ask for the same Incoterm from every supplier so quotes are comparable.",
          "Track the underlying material price so you know whether a quote is high or the market moved.",
          "Negotiate MOQ with a sample order and a clear reorder plan.",
        ],
      },
      {
        heading: "What actually helps",
        paragraphs: [
          "Structure. A written requirement, comparable quotes, evidence-based trust signals and one place where the conversation, the RFQ and the quote live together. That is the gap Suplymate is built to close — not by promising that sourcing is easy, but by making the hard parts visible and comparable.",
        ],
      },
    ],
    cta: { label: "Explore listed suppliers", href: "/suppliers" },
  },
  {
    slug: "how-ai-is-changing-industrial-sourcing",
    title: "How AI Is Changing Industrial Sourcing",
    excerpt:
      "From supplier discovery to RFQ generation, AI is removing the manual steps between a requirement and a shortlist. What it does well today, and where it must stay grounded.",
    category: "AI",
    readingMinutes: 6,
    publishedAt: "2026-08-19",
    author: { name: "Suplymate Editorial", role: "AI & procurement" },
    sections: [
      {
        paragraphs: [
          "The most useful thing AI does for sourcing is not writing emails. It is translating a messy human requirement — '10 tons of steel to San Diego, ISO certified, by October' — into structured criteria and then doing the tedious comparison work at scale.",
        ],
      },
      {
        heading: "AI supplier discovery",
        paragraphs: [
          "Instead of keyword search, an assistant parses material, quantity, destination and certifications, then scans supplier profiles for the same concepts. It can read that a supplier listing 'HRC coil, S355' is relevant to 'structural steel' even when the words don't match.",
        ],
      },
      {
        heading: "AI supplier matching and explanation",
        paragraphs: [
          "Matching is scoring, not magic. Price, delivery, quality, location and trust are weighed against your requirement and — critically — the assistant explains why a supplier ranks where it does and which data is missing. A score without reasons is just another badge.",
        ],
      },
      {
        heading: "AI price comparison and material intelligence",
        paragraphs: [
          "Assistants can place a quote in context: what the underlying material has done over 30 days, whether an alternative grade would meet the spec at lower cost, and what questions to ask before switching. This is where beginners gain the most.",
        ],
      },
      {
        heading: "AI RFQs",
        paragraphs: [
          "Generating a complete request for quote — spec, quantity, destination, delivery date, supplier questions — from a conversation removes the single biggest source of incomparable quotes: incomplete requests.",
        ],
      },
      {
        heading: "Where it must stay grounded",
        paragraphs: [
          "An AI that invents a supplier, a certificate or a lead time is worse than no AI. Suplymate's assistant only names suppliers that exist in the platform's data, labels reference prices as reference, and defers to the supplier for anything it cannot verify. Grounding is not a limitation — it is the product.",
        ],
      },
    ],
    cta: { label: "Try the AI sourcing assistant", href: "/ai-assistant" },
  },
  {
    slug: "ai-plus-sourcing-the-future-of-procurement",
    title: "AI + Sourcing: The Future of Procurement",
    excerpt:
      "Procurement is moving from managing spreadsheets to managing decisions. A look at the workflow that emerges when discovery, comparison, negotiation and risk detection are AI-assisted.",
    category: "AI",
    readingMinutes: 6,
    publishedAt: "2026-08-26",
    author: { name: "Suplymate Editorial", role: "AI & procurement" },
    sections: [
      {
        paragraphs: [
          "Procurement software historically recorded what happened. The next generation participates in what happens: it proposes suppliers, drafts requests, flags risks and explains trade-offs, while the human keeps the decision.",
        ],
      },
      {
        heading: "The AI-assisted sourcing loop",
        paragraphs: ["A realistic near-term workflow looks like this:"],
        bullets: [
          "Requirement → the assistant structures it and asks the two questions you forgot.",
          "Material identification → properties, grades and substitutes, with price drivers.",
          "Supplier discovery → real, listed suppliers matched and explained.",
          "Price and delivery comparison → quotes normalised to the same Incoterm and unit.",
          "Negotiation → drafted messages that ask for the right concessions.",
          "Risk detection → missing certifications, unusual pricing, incomplete profiles.",
          "Selection → a decision record you can defend.",
        ],
      },
      {
        heading: "What changes for buyers",
        paragraphs: [
          "Less time on collection, more on judgement. Beginners get a guided path; experts get leverage. Both get a record of why a supplier was chosen — which is what auditors, finance and your future self ask for.",
        ],
      },
      {
        heading: "What changes for suppliers",
        paragraphs: [
          "Complete, evidenced profiles win. When matching is data-driven, a supplier with published MOQ, lead times, real photos and reviewed certifications is discoverable in a way that a paid banner never was.",
        ],
      },
      {
        heading: "The guardrails that make it trustworthy",
        paragraphs: [
          "Grounded data, visible sources, explicit uncertainty and human verification for anything marked 'verified'. The future of procurement is not autonomous purchasing; it is better-informed people making faster, defensible decisions.",
        ],
      },
    ],
    cta: { label: "See how Mate builds a sourcing plan", href: "/ai-assistant?q=I%27m%20starting%20a%20manufacturing%20company.%20What%20suppliers%20should%20I%20look%20for%3F" },
  },
  {
    slug: "how-to-find-the-right-industrial-supplier",
    title: "How to Find the Right Industrial Supplier",
    excerpt:
      "A practical, repeatable process for going from 'we need this' to a supplier you can rely on — with the questions to ask at each step.",
    category: "Suppliers",
    readingMinutes: 8,
    publishedAt: "2026-09-02",
    author: { name: "Suplymate Editorial", role: "Sourcing research" },
    sections: [
      {
        paragraphs: [
          "Finding the right supplier is a process, not a search. Buyers who treat it as a search end up with the supplier that ranked highest that day. Buyers who treat it as a process end up with one that fits.",
        ],
      },
      {
        heading: "1. Write the requirement before you look",
        paragraphs: [
          "Material or product, grade or standard, quantity and reorder pattern, destination, delivery date, required certifications, packaging. If you cannot write it down, you are not ready to compare quotes.",
        ],
      },
      {
        heading: "2. Shortlist from evidence, not adjectives",
        paragraphs: [
          "Prefer profiles with real factory photos, product lists, stated MOQ and lead times, and certifications you can trace. 'Leading manufacturer' means nothing; 'ISO 9001 certificate number, issued 2024' means something.",
        ],
      },
      {
        heading: "3. Ask the same questions of everyone",
        paragraphs: ["A short, identical questionnaire makes answers comparable:"],
        bullets: [
          "Are you the manufacturer or a trading company? Which plant would produce this?",
          "What is your MOQ for this item, and what changes it?",
          "Typical lead time after deposit, and after approval of samples?",
          "Which Incoterm do you quote, and can you quote FOB and CIF?",
          "Who performs quality inspection and can we appoint a third party?",
          "Payment terms for a first order versus repeat orders?",
        ],
      },
      {
        heading: "4. Order a paid sample",
        paragraphs: [
          "A sample is the cheapest due diligence available. Inspect it against the spec, not against your expectations. Note communication quality during the sample — it predicts how problems will be handled later.",
        ],
      },
      {
        heading: "5. Compare on total cost and risk",
        paragraphs: [
          "Unit price, plus freight, duties, inspection, payment risk and the cost of a late delivery. The lowest quote is frequently not the lowest cost.",
        ],
      },
      {
        heading: "6. Start small, document everything",
        paragraphs: [
          "First order at a size you can afford to get wrong. Agree specifications, tolerances, packaging and remedies in writing. Then scale.",
        ],
      },
    ],
    cta: { label: "Browse supplier profiles", href: "/suppliers" },
  },
  {
    slug: "what-makes-a-good-supplier",
    title: "What Makes a Good Supplier?",
    excerpt:
      "Reliability is a set of observable behaviours, not a feeling. The signals that separate suppliers who deliver from suppliers who promise.",
    category: "Suppliers",
    readingMinutes: 5,
    publishedAt: "2026-09-04",
    author: { name: "Suplymate Editorial", role: "Sourcing research" },
    sections: [
      {
        paragraphs: [
          "Ask ten procurement managers what makes a good supplier and you will hear 'reliable' ten times. Push further and the answers become specific — and testable.",
        ],
      },
      {
        heading: "They tell you what they cannot do",
        paragraphs: [
          "Good suppliers say no. 'We don't hold that grade', 'that tolerance needs a different process', 'we can't hit October'. A supplier who agrees to everything is either not listening or planning to renegotiate later.",
        ],
      },
      {
        heading: "Their information is complete and consistent",
        paragraphs: [
          "Website, email domain, phone and address agree with each other. Certifications carry numbers and dates. Product lists are specific. On Suplymate this is what the trust score measures: how much verifiable, self-consistent information a supplier has put on the table.",
        ],
      },
      {
        heading: "They quote precisely",
        paragraphs: [
          "Unit, currency, Incoterm, validity date, MOQ and lead time on every quote. Precision in a quote predicts precision in production.",
        ],
      },
      {
        heading: "They communicate before problems become visible",
        paragraphs: [
          "A raw-material delay announced two weeks early is a planning input. The same delay discovered at the port is a crisis. Watch how a supplier handles the sample stage; it is the best preview you will get.",
        ],
      },
      {
        heading: "They have customers like you",
        paragraphs: [
          "A supplier built for 10,000-ton orders will not love your 20-ton order, and vice versa. Fit matters as much as quality.",
        ],
      },
    ],
    cta: { label: "See supplier trust scores", href: "/suppliers" },
  },
  {
    slug: "why-price-isnt-the-only-thing-that-matters",
    title: "Why Price Isn't the Only Thing That Matters When Choosing a Supplier",
    excerpt:
      "The cheapest quote often costs the most. How to compare offers on total cost, delivery, quality evidence and trust — and explain the decision to your CFO.",
    category: "Sourcing",
    readingMinutes: 6,
    publishedAt: "2026-09-04",
    author: { name: "Suplymate Editorial", role: "Sourcing research" },
    sections: [
      {
        paragraphs: [
          "Price is the easiest number to compare, which is why it gets compared first and most. It is also the number most likely to mislead, because it hides everything that happens after the purchase order.",
        ],
      },
      {
        heading: "Total landed cost",
        paragraphs: [
          "Freight, insurance, duties, inspection, financing of deposits and the working capital tied up in a long lead time. Two quotes that differ by 8% on unit price can be equal — or reversed — once landed.",
        ],
      },
      {
        heading: "The cost of time",
        paragraphs: [
          "A 12-week lead time means larger safety stock, more cash locked in inventory and slower reaction to demand changes. Put a number on a week of delay for your business; it is usually larger than the price gap between suppliers.",
        ],
      },
      {
        heading: "The cost of quality",
        paragraphs: [
          "Rework, scrap, warranty claims and the customer you lose. Quality evidence — certificates, inspection reports, samples — is the only way to price this risk before it happens.",
        ],
      },
      {
        heading: "The cost of trust",
        paragraphs: [
          "Deposit risk, communication overhead, and the management attention a difficult supplier consumes. Verified profiles, consistent information and responsive behaviour reduce this cost even when they do not show up on the quote.",
        ],
      },
      {
        heading: "A simple scorecard",
        paragraphs: ["Weight what matters to you and score each shortlisted supplier on the same five axes:"],
        bullets: ["Price (landed)", "Delivery (lead time and reliability)", "Quality (evidence, not adjectives)", "Location (freight, time zone, regulation)", "Trust (verification, consistency, responsiveness)"],
      },
      {
        paragraphs: [
          "This is exactly how Suplymate's supplier matching scores suppliers — and why it shows the breakdown and the reasons, not just a number.",
        ],
      },
    ],
    cta: { label: "Compare suppliers side by side", href: "/suppliers/compare" },
  },
  {
    slug: "how-to-compare-suppliers-without-getting-lost-in-spreadsheets",
    title: "How to Compare Suppliers Without Getting Lost in Spreadsheets",
    excerpt:
      "Spreadsheets fail at supplier comparison for predictable reasons. A lighter method that keeps the comparison honest and the decision explainable.",
    category: "Sourcing",
    readingMinutes: 5,
    publishedAt: "2026-09-03",
    author: { name: "Suplymate Editorial", role: "Sourcing research" },
    sections: [
      {
        paragraphs: [
          "The supplier comparison spreadsheet starts clean. By the third round of quotes it has merged cells, three currencies, two units and a column called 'notes' that holds the real decision. Nobody trusts it, so the decision is made in a meeting instead.",
        ],
      },
      {
        heading: "Why spreadsheets fail here",
        paragraphs: [],
        bullets: [
          "Quotes arrive in different units, currencies and Incoterms; the sheet does not normalise them.",
          "Qualitative evidence (photos, certificates, responsiveness) has no cell.",
          "Every update is a manual copy — the sheet is stale the moment a supplier replies.",
          "There is no record of why a number changed.",
        ],
      },
      {
        heading: "Normalise before you compare",
        paragraphs: [
          "Ask for the same Incoterm and unit from every supplier. Convert to one currency at one rate. Only then compare price.",
        ],
      },
      {
        heading: "Score, don't just list",
        paragraphs: [
          "Five axes — price, delivery, quality, location, trust — scored 0–100 with an explicit 'no data' when you don't know. A blank is more honest than a guess, and it tells you which question to ask next.",
        ],
      },
      {
        heading: "Keep the conversation next to the comparison",
        paragraphs: [
          "The reason a supplier's lead time is 8 weeks lives in a message. When the comparison and the messages are in the same place, the decision explains itself.",
        ],
      },
      {
        heading: "Decide with a record",
        paragraphs: [
          "Write one paragraph: which supplier, why, and what would change the decision. Six months later this paragraph is worth more than the spreadsheet.",
        ],
      },
    ],
    cta: { label: "Ask Mate to compare suppliers", href: "/ai-assistant" },
  },
  {
    slug: "starting-an-industrial-business-how-to-approach-sourcing",
    title: "Starting an Industrial Business? Here's How to Approach Sourcing",
    excerpt:
      "You don't need a procurement department to source well. A beginner's path from 'I have an idea' to a first supplier order, without the expensive mistakes.",
    category: "Getting started",
    readingMinutes: 8,
    publishedAt: "2026-09-01",
    author: { name: "Suplymate Editorial", role: "Getting started" },
    sections: [
      {
        paragraphs: [
          "Most first-time founders approach sourcing backwards: they find a supplier, then work out what they need. Reverse the order and the process becomes manageable.",
        ],
      },
      {
        heading: "Start from the product, not the supplier",
        paragraphs: [
          "Write what the product must do, in what environment, at what volume and at what target cost. Only then ask which materials and components meet that. Suplymate's material intelligence exists for exactly this step: properties, alternatives and price drivers without the jargon.",
        ],
      },
      {
        heading: "Learn the vocabulary that changes the quote",
        paragraphs: ["A handful of terms determine most of what you pay and when you receive it:"],
        bullets: [
          "Grade / standard — the exact material spec (e.g. 6061-T6, S355, 304).",
          "MOQ — minimum order quantity; negotiable more often than beginners assume.",
          "Lead time — from deposit or from sample approval? Ask.",
          "Incoterm — FOB, CIF, DDP: who pays for and is responsible for what, where.",
          "Tolerance — how much variation is acceptable; tighter is more expensive.",
        ],
      },
      {
        heading: "Shortlist locally and globally",
        paragraphs: [
          "Local suppliers cost more per unit and less in time, freight and risk. For a first product, that trade is often worth it. Compare both; let landed cost and lead time decide.",
        ],
      },
      {
        heading: "Sample, then a small first order",
        paragraphs: [
          "Pay for samples. Inspect against your written spec. Place a first order you can afford to get wrong. Document what you learned — it becomes your reorder spec.",
        ],
      },
      {
        heading: "Use the workflow",
        paragraphs: [
          "Requirement → material → discovery → price → delivery → matching → contact. It is the same path experienced buyers follow; you just follow it deliberately. Ask Mate to build the plan for your product and it will walk you through each step with real suppliers and materials.",
        ],
      },
    ],
    cta: { label: "Build my sourcing plan", href: "/ai-assistant?q=I%20want%20to%20start%20an%20industrial%20business.%20Help%20me%20plan%20my%20sourcing." },
  },
];

export const BLOG_CATEGORIES = Array.from(new Set(BLOG_POSTS.map((p) => p.category)));

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function sortedPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function relatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return sortedPosts()
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, limit);
}
