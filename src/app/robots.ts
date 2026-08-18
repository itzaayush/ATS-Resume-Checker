import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Shared reports and API responses must never be indexed.
        disallow: ["/api/", "/share/"],
      },
    ],
    sitemap: "https://atsense.app/sitemap.xml",
  };
}
