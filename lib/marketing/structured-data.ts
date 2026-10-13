import { publicEnv } from "@/lib/config/env";
import { PLANS, PLAN_ORDER } from "@/lib/subscriptions/plans";

/**
 * schema.org JSON-LD builders for the marketing site. Rendered through
 * MarketingPage's `jsonLd` prop. Everything here describes what's actually
 * on the page -- no ratings or reviews until real ones exist.
 */

const absolute = (path: string) => `${publicEnv.appUrl}${path}`;

const ORGANIZATION = {
  "@type": "Organization",
  name: "LayerFlow",
  url: publicEnv.appUrl,
  logo: absolute("/icons/layerflow-logo.png"),
};

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LayerFlow",
    url: publicEnv.appUrl,
    publisher: ORGANIZATION,
  };
}

export function organizationSchema() {
  return { "@context": "https://schema.org", ...ORGANIZATION };
}

/** The product and its three plans, priced from lib/subscriptions/plans.ts. */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LayerFlow",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Poultry farm management",
    operatingSystem: "Web, Android, iOS",
    url: publicEnv.appUrl,
    description:
      "Poultry layer farm management software for the Philippines: egg production, feed, expenses, sales, and estimated operating profit in one place.",
    offers: PLAN_ORDER.map((id) => ({
      "@type": "Offer",
      name: PLANS[id].name,
      price: (PLANS[id].priceCentavosMonthly / 100).toFixed(2),
      priceCurrency: "PHP",
      description: PLANS[id].tagline,
      url: absolute("/pricing"),
    })),
    publisher: ORGANIZATION,
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    mainEntityOfPage: absolute(article.path),
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    image: absolute(article.image ?? "/opengraph-image.png"),
    author: ORGANIZATION,
    publisher: ORGANIZATION,
    inLanguage: "en-PH",
  };
}
