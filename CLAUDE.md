# Project Overview & AI Operating Rules

## Project Context
- **Project Name:** Sumus Marketplace (eBay-style e-commerce site)
- **Tech Stack:** Next.js (App Router), Tailwind CSS, TypeScript, Supabase, GitHub Pages

## Token-Saving & Workflow Rules
1. **Full File Replacement Mode:** I am a non-technical creator. **Never give me small code snippets, partial diffs, or instructions to change lines individually.** When I ask for a fix or feature, always output the **complete, full code** for that single file so I can delete the old file and paste the new one.
2. **One File at a Time:** Focus only on the specific file requested (e.g., `components/cart-view.tsx` or `app/shop/page.tsx`). Never rewrite or output multiple files or the whole project at once.
3. **Database Awareness:** Refer strictly to the database tables and columns defined in `database-schema.md`. Use accurate table and column names (`products`, `profiles`, `orders`, `cart_items`).
4. **No Conversational Fluff:** Skip long greetings or repetitive explanations. Give the complete file code directly, followed by a short 1-sentence summary of what was updated.
5. **Security:** Never expose Supabase `service_role` (secret) keys in client-side code. Use public `anon` keys only.

## Key Commands
- Dev Server: `npm run dev`
- Build Project: `npm run build`
