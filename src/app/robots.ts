import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/transactional areas will be added as noindex when they exist.
      disallow: ["/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
