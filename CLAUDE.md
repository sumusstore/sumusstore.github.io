# Project Overview & AI Operating Rules

## Project Context
- **Project Name:** Sumus Marketplace (Nigerian multi-vendor e-commerce store for electricals, gadgets, power/solar, appliances, and third-party seller shops)[span_0](start_span)[span_0](end_span).
- **Tech Stack:** Next.js 15 (App Router, static export), React 19, TypeScript 5, Tailwind CSS 4, Zustand 5, Supabase, Paystack, GitHub Pages[span_1](start_span)[span_1](end_span).

## Token-Saving & Workflow Rules
1. **Full File Replacement Mode:** I am a non-technical creator. **Never give me small code snippets, partial diffs, or instructions to change lines individually.** When I ask for a fix or feature, always output the **complete, full code** for that single file so I can delete the old file and paste the new one.
2. **One File at a Time:** Focus only on the specific file requested (e.g., `components/product-card.tsx`). Never rewrite or output multiple files or the whole project at once.
3. **Database Awareness:** Refer strictly to the tables and views defined in `database-schema.md` (`products`, `product_variants`, `sellers`, `public_sellers`, `orders`, `profiles`, etc.)[span_2](start_span)[span_2](end_span).
4. **No Conversational Fluff:** Skip long greetings or repetitive explanations. Give the complete file code directly, followed by a short 1-sentence summary of what was updated.
5. **Security:** Never expose Supabase `service_role` keys or Paystack secret keys in client-side code[span_3](start_span)[span_3](end_span).

## Core Architecture & Design Reminders
- **Multi-Vendor Model:** Products belong to Sumus (`seller_id` is null) or approved third-party sellers (`seller_id` linked to `sellers`). Approved public sellers are fetched via the `public_sellers` view (`security_invoker = true`)[span_4](start_span)[span_4](end_span).
- **Money Handling:** Prices are stored as integers in **kobo** and formatted using `formatNaira(kobo)` (`lib/format.ts`)[span_5](start_span)[span_5](end_span).
- **Static Export Constraints:** Built with `output: "export"` and `trailingSlash: true` for GitHub Pages. Dynamic pages rely on `generateStaticParams`[span_6](start_span)[span_6](end_span).

## Active Priority Task
- **Product Page Batch (In Progress):** Replacing "Sold by Sumus" with the seller's name/link on product cards and product pages (`/seller/[slug]`), displaying warranty periods, and ensuring "Sellers" links appear in the footer and mobile menu[span_7](start_span)[span_7](end_span).

## Key Commands
- Dev Server: `npm run dev`[span_8](start_span)[span_8](end_span)
- Build Project: `npm run build`[span_9](start_span)[span_9](end_span)
