import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "個人記帳",
    short_name: "記帳本",
    description: "個人記帳 Web App",
    start_url: "/",
    display: "standalone",
    background_color: "#799ef6",
    theme_color: "#799ef6",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
