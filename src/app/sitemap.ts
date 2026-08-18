import type { MetadataRoute } from "next";

const ROUTES = ["", "/analyze", "/how-it-works", "/scoring", "/pricing", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `https://atsense.app${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/analyze" ? 0.9 : 0.6,
  }));
}
