import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME || "SaaS App",
    short_name: process.env.NEXT_PUBLIC_APP_NAME || "SaaS App",
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      "A production-ready SaaS boilerplate",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4338CA",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
