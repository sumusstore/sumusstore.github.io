// app/robots.ts
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account/",
        "/cart/",
        "/checkout/",
        "/order/",
        "/messages/",
        "/my-shop/",
        "/wishlist/",
        "/compare/",
        "/login/",
        "/register/",
        "/reset-password/",
        "/forgot-password/",
      ],
    },
  };
}
