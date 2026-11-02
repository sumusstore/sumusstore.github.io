SUMUS STORE: PROJECT HANDOFF
Last updated: 2 November 2026

Items marked (confirm) were not verified in the build chat and should be checked first.

=====================================================================
1. PROJECT OVERVIEW
=====================================================================

What it is
Sumus is a Nigerian online store selling Electrical Building Materials, Laptop and Gaming Accessories, AC & Refrigerator repair and installation parts power and solar products, smart home devices, and accessories. Prices are in naira (NGN). It also runs a seller marketplace, where approved third-party sellers list their own products under their own shop pages.

Purpose
- Sell genuine products to customers across Nigeria, with Lagos and nationwide delivery and store pickup.
- Let approved sellers list products. Sumus approves each seller and each product before it goes live.
- Take payment by card, bank or USSD through Paystack, or by bank transfer confirmed manually.

Reference design
- Primary model: eBay.
- Marketplace layout: eBay seller pages and product cards.

Tech stack
- Framework: Next.js 15 (App Router), static export (output: "export", trailingSlash: true, images unoptimized). The original brief said 14+; the project is on 15.1.
- React 19. Language: TypeScript 5 (strict mode).
- Styling: Tailwind CSS 4 via @tailwindcss/postcss. Theme colours are set with @theme in app/globals.css. Shadcn/ui was in the brief but is not used; components are custom.
- State: Zustand 5 for cart, wishlist and compare, persisted to localStorage.
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron, pg_net), supabase-js 2.45+.
- Payments: Paystack (card, bank, USSD), with bank transfer as a manual option.
- Hosting: GitHub Pages, deployed by GitHub Actions on every push to main. Live site: https://sumusstore.github.io
- Build machine: Node 20 on ubuntu-latest.

=====================================================================
2. GITHUB REPO
=====================================================================

Repo name: not recorded (confirm). The site is served from the user site address, so the repo is probably named sumusstore.github.io.

File tree (important files only)

.github/
  workflows/deploy.yml        Build and deploy to GitHub Pages. Passes the three public env vars at build time.
  workflows /deploy.yml       DUPLICATE with a space in the folder name. Delete it (see Known Issues).
app/
  layout.tsx                  Root layout: header, footer, WishlistSync, CompareBar, metadata and title template.
  page.tsx                    Homepage: hero, category icons, Flash sales, Price drops, New arrivals, trust strip, newsletter.
  globals.css                 Tailwind import and @theme colour overrides.
  not-found.tsx               Gold-topped 404 page.
  sitemap.ts, robots.ts       SEO files.
  shop/page.tsx               All products (catalogue).
  category/[slug]/page.tsx    One static page per category (generateStaticParams from Supabase).
  product/[slug]/page.tsx     One static page per active product, with JSON-LD and metadata.
  search/page.tsx             Search results (q parameter).
  cart/page.tsx               Cart.
  checkout/page.tsx           Guest or signed-in checkout.
  order/page.tsx              Order confirmation (card polling, bank transfer details).
  wishlist/page.tsx           Wishlist.
  compare/page.tsx            Compare table (max 4 products).
  account/page.tsx            Customer dashboard: orders, addresses, wishlist, profile. Requires sign-in.
  login/, register/, forgot-password/, reset-password/   Auth pages.
  track/page.tsx              Track an order by order number and email.
  stores/page.tsx             Store locator.
  sell/page.tsx               Seller application (individual or business, with documents).
  my-shop/page.tsx            Seller dashboard. Requires an approved seller account.
  seller/[slug]/page.tsx      Public shop page per approved seller (static, built from public_sellers).
  sellers/page.tsx            Index of approved sellers.
  admin/page.tsx              Store admin (AdminGuard checks the admin role).
  faq/, about/, contact/, bulk/, shipping/, returns/, warranty/, privacy/, terms/   Information pages.
components/
  site-header.tsx             Sticky header: top strip, logo, search, account, wishlist, cart, category mega menu.
  site-footer.tsx             Footer: four columns, gold top border, payment labels.
  mobile-menu.tsx             Slide-in menu for phones.
  product-card.tsx            Product card: discount badge, stock, Quick View, Compare, wishlist heart, Add to cart.
  product-detail-view.tsx     Product page: gallery, variants, quantity, buy buttons, tabs, related products, mobile buy bar.
  product-gallery.tsx         Photo gallery with thumbnails.
  product-row.tsx             Horizontal product row on the homepage.
  quick-view.tsx              Quick View modal with variant picker.
  catalogue-view.tsx          Shared listing: filters, sort, paging, empty and loading states.
  catalogue-filters.tsx       Sidebar filters: brand, price band, storage, colour, in stock.
  category-view.tsx           Category page with subcategory chips and breadcrumb.
  seller-view.tsx             Public shop page: seller header and live products.
  sellers-index.tsx           Seller cards on /sellers/.
  cart-view.tsx, checkout-view.tsx, order-confirmation.tsx, order-tracking.tsx
  account-view.tsx, account-addresses.tsx, wishlist-view.tsx, wishlist-sync.tsx
  compare-view.tsx, compare-bar.tsx
  countdown.tsx               Sale countdown timer.
  enquiry-form.tsx            Contact and bulk enquiry form (with hidden honeypot field).
  newsletter-form.tsx         Newsletter signup.
  store-locator.tsx           Branch list, state filter, Google map embed.
  policy-page.tsx             Renders the policy documents.
  auth-forms.tsx              Login, register, forgot and reset password forms.
  form-field.tsx              Field and Notice components, shared by forms.
  icons.tsx                   Inline SVG icons.
  require-auth.tsx, admin-guard.tsx   Route guards.
  admin-view.tsx              Admin tabs: Orders, Enquiries, Sellers, Products, Brands and categories, with unseen counts.
  admin-orders.tsx            Order list, status actions, bank transfer confirmation, refunds.
  admin-enquiries.tsx         Enquiries with reply status.
  admin-sellers.tsx           Approve, reject, suspend, view documents (signed URLs).
  admin-products.tsx          Product list: create, hide or restore, edit.
  admin-product-editor.tsx    Admin product details, variants and photos.
  admin-setup.tsx             Brands and categories: add, delete, and create, edit, delete categories.
  seller-dashboard.tsx        Seller product list and status.
  seller-product-editor.tsx   Seller product form: details, brand request, versions, photos, live checklist.
  (sell view and seller application form)   Seller application UI. Exact file name not recorded (confirm).
hooks/
  use-auth.ts                 Session state and safeNextPath().
  use-admin.ts                Admin role check.
  use-admin-alerts.ts         Polls unseen orders and enquiries every 60 seconds. Browser notifications.
  use-catalogue.ts            Loads all active variants for listings.
  use-home-products.ts        Homepage rows: flash sales, price drops, new arrivals.
  use-product-detail.ts       One product with images, variants and approved reviews.
  use-category-tree.ts        Category tree from flat rows.
  use-checkout-options.ts     Active delivery zones and pickup stores.
  use-hydrated.ts             True after the browser loads, to avoid server and browser mismatch.
stores/
  cart-store.ts               Cart (localStorage key store-cart-v1). Stock is re-checked on the server.
  wishlist-store.ts           Wishlist (store-wishlist-v1).
  compare-store.ts            Compare, max 4 (store-compare-v1).
lib/
  supabase.ts                 Supabase client, built from the two public env vars.
  format.ts                   formatNaira(kobo): divides by 100 and formats as en-NG NGN.
  site-config.ts              Business name, phone, WhatsApp, email, address, socials, delivery note.
  store-policies.ts           Policy numbers (delivery days, return window, pickup hold), support hours, last-updated date.
  policy-content.ts           Policy wording (DRAFT, needs lawyer review).
  faq.ts                      FAQ items.
  catalogue.ts                Filtering, sorting, facets, card building.
  admin-utils.ts              slugify, nairaToKobo, koboToNairaText, parseSpecs, shrinkImage, storage path helper.
  order-status.ts             Plain-language order status labels.
  bank-details.ts             Bank transfer account shown to customers (PLACEHOLDER, must be replaced).
next.config.ts                output: "export", trailingSlash, unoptimized images.
package.json                  Dependencies and scripts (dev, build, start).
tsconfig.json                 Strict TypeScript, path alias @/*.
postcss.config.mjs            Tailwind 4 PostCSS plugin.
README.md                     Placeholder text only.

Supabase Edge Function source is not in the repo as far as recorded. Check whether it is also committed (confirm).

=====================================================================
3. SUPABASE SETUP
=====================================================================

Project
- Project name: Store
- Project URL: <SUPABASE_URL>
- Project ref: <PROJECT_REF>
- Plan: Free for now. Upgrade to Pro before launch.

Tables (key columns; types from the schema. Verify exact names in Table Editor)

products
  id uuid PK, name text, slug text UNIQUE, description text, specifications jsonb,
  brand_id uuid FK brands, category_id uuid FK categories, seller_id uuid FK sellers (null for Sumus stock),
  is_active boolean, moderation text ('live' | 'hidden'), warranty_period text, created_at timestamptz
product_variants
  id uuid PK, product_id uuid FK products, storage text, colour text, sku text UNIQUE,
  price_kobo integer, compare_at_kobo integer null, stock_qty integer, sale_ends_at timestamptz null,
  is_active boolean
product_images
  id uuid PK, product_id uuid FK, variant_id uuid null, image_url text, position integer
brands
  id uuid PK, name text UNIQUE, slug text UNIQUE
categories
  id uuid PK, name text, slug text UNIQUE, parent_id uuid null FK categories, sort_order integer
profiles
  id uuid PK = auth.users.id, full_name text, phone text, role text ('customer' | 'admin')
addresses
  id uuid PK, user_id uuid FK, label text null, full_name text, phone text, state text,
  area text null, street text, is_default boolean
wishlist_items
  id uuid PK, user_id uuid FK, variant_id uuid FK, UNIQUE(user_id, variant_id)
reviews
  id uuid PK, product_id uuid FK, user_id uuid FK, rating integer, comment text null,
  status text ('pending' | approved), verified_purchase boolean, created_at timestamptz
delivery_zones
  id uuid PK, name text ('Lagos', 'Outside Lagos', 'Store Pickup'), fee_kobo integer,
  min_days integer, max_days integer, is_active boolean
stores
  id uuid PK, name text, address text, state text, phone text null, latitude numeric null,
  longitude numeric null, opening_hours text null, is_active boolean
orders
  id uuid PK, order_number text UNIQUE (format SS-XXXXXXXX-XXXX), user_id uuid null FK,
  status text (pending_payment | awaiting_transfer | paid | processing | shipped | delivered | cancelled | refunded),
  payment_method text ('paystack' | 'bank_transfer'), email text, phone text,
  subtotal_kobo integer, delivery_fee_kobo integer, total_kobo integer,
  shipping_address jsonb, delivery_zone_id uuid FK, store_id uuid null FK,
  admin_note text null, seen_by_admin boolean, created_at timestamptz
order_items
  id uuid PK, order_id uuid FK, variant_id uuid FK, product_name text, variant_label text,
  quantity integer, unit_price_kobo integer
payments
  id uuid PK, order_id uuid FK, reference text, amount_kobo integer, currency text, payload jsonb (confirm columns)
newsletter_subscribers
  id uuid PK, email text UNIQUE
enquiries
  id uuid PK, kind text ('contact' | 'bulk'), name text, email text, phone text null,
  company text null, message text, replied boolean, created_at timestamptz
rebuild_queue
  id bigint PK, reason text (e.g. 'product <slug>', 'category <slug>', 'seller <slug>'),
  created_at timestamptz, done boolean
sellers
  id uuid PK, user_id uuid UNIQUE FK auth.users, display_name text, slug text UNIQUE,
  kind text ('individual' | 'business'), state text, status text ('pending' | 'approved' | 'suspended' | 'rejected'),
  paystack_subaccount_code text null, created_at timestamptz,
  PRIVATE columns (never readable by visitors): account_number, bank_name, owner_phone, address, registration_number
seller_documents
  id uuid PK, seller_id uuid FK sellers, kind text ('owner_id' | 'registration' | 'genuine_proof'), storage path text, created_at timestamptz

View
public_sellers (security_invoker = true)
  Columns: slug, display_name, kind, state, created_at. Approved sellers only.

Functions (plpgsql, most SECURITY DEFINER with search_path = public)
- is_admin(): true when profiles.role = 'admin' for auth.uid().
- current_seller_id(): the approved seller id for auth.uid(), or null.
- seller_product_ready(product_id): true when the product has name (3+ characters), brand, category, description (20+), warranty, a photo, and an active variant priced above zero.
- guard_product_changes(): trigger. Sellers cannot change seller_id or moderation, and cannot show a product Sumus has hidden.
- check_seller_publish(): trigger. Blocks a seller from showing an incomplete product.
- pause_seller_products(): trigger. Hides all products when a seller leaves 'approved'.
- queue_site_rebuild(): trigger on products and categories. Writes to rebuild_queue only for changes that affect public pages. Fixed version checks the table name before reading table-specific columns.
- queue_seller_rebuild(): trigger on sellers. Queues a rebuild on approval, rename, slug, state, kind or status change.
- can_manage_product_photo(path text): true when the first folder of the path equals an approved seller's product id for auth.uid().
- mark_order_paid(reference, amount_kobo, currency, payload): marks an order paid, reduces stock, logs overpayment in admin_note.
- admin_confirm_bank_transfer(order_id), admin_set_order_status(order_id, status): admin only. Restocks on cancel or refund.
- handle_new_user(): creates a profiles row on sign-up.
- notify_site_rebuild(): OLD. Replaced by the queue approach. Can be removed.

Row-level security (policy names as created)
- profiles: "Users read own profile" (select where id = (select auth.uid())); "Users update own name and phone".
- addresses: "Customers manage own addresses" (all, owner only).
- wishlist_items: "Customers manage own wishlist" (all, owner only).
- orders: "Customers read own orders"; order_items: "Customers read own order items". Writes happen through Edge Functions.
- reviews: "Customers read own reviews"; "Customers write own reviews" (insert only, pending, not verified). Public read of approved reviews (confirm policy name).
- Public catalogue reads: categories "Public read categories" (select, public); brands "Public read brands" (select, public); products and variants and images public read for active rows (confirm names).
- Admin: "Admins manage ..." replaced for categories and brands by separate insert, update and delete rules, all checking is_admin(). Brands also allow inserts from approved sellers ("Admins and approved sellers add brands").
- sellers: "Sellers read own application"; "Sellers apply once as pending" (insert, status pending, no subaccount); "Public read approved sellers" (select for anon and authenticated where status = 'approved'). Column privileges limit anon to: id, slug, display_name, kind, state, created_at, status.
- Seller product rules: "Sellers read own products", "Sellers add products", "Sellers edit own products", "Sellers manage own versions", "Sellers manage own photos".
- seller_documents: "Sellers add own documents"; "Sellers read own documents".
- Admin reads on sellers and documents exist (confirm names).

Storage
- Bucket product-images: PUBLIC. Path convention: <product_id>/<timestamp>-<random>.jpg.
  Policies: "Admins upload product images", "Admins delete product images", "Sellers upload photos for own products" (insert, uses can_manage_product_photo), "Sellers remove photos for own products" (delete, same check).
- Bucket seller-documents: PRIVATE. Accessed through 5-minute signed URLs. Policies: "Sellers upload own documents" (insert), "Sellers and admins read documents" (select).

Auth settings
- Email and password sign-in.
- Email confirmation: currently off. Turn ON before launch.
- Password minimum 8 characters (enforced in the UI).
- Redirect URLs: <SITE_URL>/account/ and <SITE_URL>/reset-password/. Confirm both are on the allow list.
- 2FA: turn on for the Supabase account before launch.

How the client connects
- lib/supabase.ts calls createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) and throws if either is missing.
- The anon key is safe in the browser. Row-level security protects the data.
- The browser reads tables directly with the anon key, and uses supabase.functions.invoke for Edge Functions.
- Admin actions run as the signed-in admin, and the database checks is_admin() every time.

Edge Functions (Supabase)
- create-order: validates the cart on the server, creates the order, starts Paystack or records bank transfer. Attaches user_id when signed in.
- verify-payment: checks a Paystack reference, then calls mark_order_paid.
- paystack-webhook: verifies the HMAC-SHA512 signature, then calls mark_order_paid. JWT verification OFF.
- track-order: guest lookup by order number and email.
- rebuild-site: checks rebuild_queue. If rows are waiting, it starts the GitHub Actions deploy workflow. JWT verification OFF. Called by pg_cron.

Scheduled job
- pg_cron runs every 5 minutes and calls rebuild-site through pg_net. Recent runs show succeeded and 200 responses.

Edge Function secrets (set in Supabase, never in code)
- PAYSTACK_SECRET_KEY
- GITHUB_REBUILD_TOKEN (needs repository workflow permission)
- REBUILD_WEBHOOK_SECRET

Paystack webhook URL (set in Paystack dashboard)
- https://<PROJECT_REF>.supabase.co/functions/v1/paystack-webhook

=====================================================================
4. ENVIRONMENT VARIABLES (names only)
=====================================================================

Next.js build and browser (set in GitHub Actions secrets, mapped in deploy.yml)
- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL. GitHub secret name: SUPABASE_URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: public anon key. GitHub secret name: SUPABASE_ANON_KEY.
- NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: Paystack public key, used in the browser. GitHub secret name: PAYSTACK_PUBLIC_KEY.

Local development
- Same three NEXT_PUBLIC_ names in .env.local. Never commit this file. .gitignore covers .env*.local.

Server-side secrets (Supabase Edge Functions only)
- PAYSTACK_SECRET_KEY: Paystack secret, for creating and verifying payments.
- GITHUB_REBUILD_TOKEN: GitHub token that starts the deploy workflow.
- REBUILD_WEBHOOK_SECRET: shared secret for the rebuild call.

Note: Paystack is currently on TEST keys. Switch the public and secret keys to LIVE keys before launch, in both GitHub and Supabase.

=====================================================================
5. DESIGN DECISIONS
=====================================================================

Colours (defined in app/globals.css with @theme; the blue-* utility classes are overridden to teal)
- Primary teal: #0F5C5A (buttons, header band, links, focus)
- Gold accent: #C9A227 (logo underline, card top borders, tab underlines, badges)
- Paper background: #FAF7F0 (page background, top strip)
- Ink text: #1F2937 (headings and body)
- Supporting: slate greys for secondary text, green-700 for in stock, amber-600 for low stock, red-600 for sold out and errors, light red fill for error notices, light teal fill for success notices.

Typography
- Font family: not set in code. The site uses the Tailwind default sans-serif stack (confirm if a web font was added).
- Headings bold. Page titles text-3xl (md:text-4xl for hero bands). Body text-sm to base.

Spacing and layout
- Containers: max-w-6xl (max-w-5xl for seller pages), horizontal padding px-4.
- Section vertical padding: py-8 to py-10 inside pages, py-12 to py-14 for hero bands.
- Mobile first, then md and lg breakpoints. Product grids: 2 columns on phones, 3 to 4 on desktop.
- Homepage rows scroll sideways on phones and become a 4-column grid on desktop.

Component style
- Cards: rounded-xl, 1px slate border, most with a 4px gold top border (border-t-4 border-t-gold).
- Primary buttons: rounded-full in the newer admin, seller and product screens (older screens use rounded-lg). Keep new work on rounded-full.
- Info page header band: teal background, white text, short gold bar underneath (h-1 w-16).
- Floating compare bar sits above the mobile bottom bar (bottom-20 on phones, bottom-4 on desktop).
- Product page on phones: fixed bottom buy bar with price and Add to cart.
- Desktop product page: photo left, sticky buying panel right.
- Sticky header with top strip (delivery promise, store locator, WhatsApp, phone), main row (menu, logo, search, account, wishlist, cart), and a desktop category bar with mega menu.

Money and time
- All prices stored in kobo (integers). Display with formatNaira (en-NG, NGN, no decimals unless needed).
- Dates shown as en-NG locale (e.g. "2 Nov 2026"). Working days Monday to Friday.

Delivery promise (copy used across the site)
- Lagos: 1 to 3 working days. Outside Lagos: 2 to 7 working days. Store pickup free.
- Return window: 7 days. Pickup hold: 7 days.
- Support hours: Monday to Saturday, 9am to 6pm.
- These numbers live in lib/store-policies.ts and in the delivery_zones table. Keep both in step.

Reference design
- Slot.ng for the storefront (trust strip, category icons, deal rows, strong CTAs).
- eBay and Jumia style for the marketplace (seller cards, shop pages, "Sold by" on products).

=====================================================================
6. STATUS
=====================================================================

FINISHED AND VERIFIED ON A PHONE
- GitHub Pages deploy pipeline with build-time env vars.
- Supabase schema, RLS, storage buckets and Edge Functions (create-order, verify-payment, paystack-webhook, track-order, rebuild-site).
- Automatic rebuild queue: pg_cron every 5 minutes, triggers on products, categories and sellers.
- Storefront: homepage, shop, categories, search, product pages, quick view, compare, wishlist, cart, checkout (card and bank transfer), order confirmation with card polling, order tracking.
- Accounts: sign up, log in, forgot and reset password, account dashboard with orders, addresses, wishlist and profile.
- Information pages: about, contact, bulk sales, store locator, FAQ, shipping, returns, warranty, privacy, terms, 404.
- Admin: Orders (confirm transfer, status changes, refunds that restock), Enquiries, Sellers (approve, reject, suspend, view documents), Products (create, hide and restore, edit variants and photos), Brands and categories (add and delete brands, create, edit and delete categories, with in-use checks).
- Seller marketplace: application with documents, seller dashboard, products with a live checklist, brand request from sellers, photo upload (fixed), public sellers index at /sellers/, public shop page at /seller/[slug]/ (verified end to end, including a rebuild after a name change).
- Security: seller data hidden from visitors by column privileges. Public view uses security_invoker. Seller document bucket is private.
- Supabase Advisor: performance warnings cleared for profiles, sellers, seller_documents, brands and categories. Critical view warning fixed.

IN PROGRESS
- Product page batch: replace "Sold by Sumus" with the seller's name on product cards and the product page, linking to /seller/[slug]/. Show the warranty period on the product page. Add a Sellers link to the footer and mobile menu. Waiting for the current versions of the product files before writing the batch.

LEFT TO DO, IN PRIORITY ORDER
1. Product page batch (above).
2. Seller payouts and orders: Paystack subaccount on approval, split payment (default 90 percent to seller, 10 percent to Sumus, delivery fee to seller, confirm these terms with the owner), and a seller order view in My shop.
3. Admin error messages: the category form still shows only "The category couldn't be added." Show the real error text, as the seller editor and photos already do.
4. Decide and build the seller pause button (sellers pausing their own products). Asked, not yet answered.
5. Brand merge tool (merge two brands into one and move products) for duplicates created by sellers. Optional.
6. Reviews: moderation screen for admins, and a verified-purchase review form for customers.
7. Coupons and discount codes.
8. Best sellers and frequently bought together (needs order history).
9. Recently viewed (device only).
10. Newsletter sending.
11. Emails and SMS: order confirmation (Resend, needs sending domain), order status SMS (Termii), admin new-order email alert.
12. Live chat widget (optional).
13. Seller ratings: only after reviews exist for sellers.
14. Launch checklist:
    - Replace bank details in lib/bank-details.ts.
    - Replace contact placeholders in lib/site-config.ts (phone, email, address, social links currently "#").
    - Update real store branches in the Supabase stores table (addresses, phones, coordinates).
    - Lawyer review of policy wording, seller agreement, commission terms and payout terms.
    - Update POLICY_LAST_UPDATED in lib/store-policies.ts.
    - Switch Paystack to live keys (GitHub and Supabase). Add the webhook URL in the Paystack dashboard.
    - Set Paystack fee bearer to the store, not the customer.
    - Delete test orders, test products and test categories (including any "test-category" or "computers" rows created during testing).
    - Turn on email confirmation in Supabase Auth.
    - Upgrade Supabase to Pro.
    - Add the own domain and update the site URL and redirect URLs.
    - Turn on 2FA for Supabase, GitHub and Paystack.
    - Delete the duplicate workflow file (see Known Issues).

=====================================================================
7. KNOWN ISSUES AND FRAGILE AREAS
=====================================================================

Build and deploy
- Duplicate workflow file: .github/workflows /deploy.yml (folder name contains a space) sits beside the correct .github/workflows/deploy.yml. Delete the spaced copy.
- Static export: product, category and seller pages are generated at build time. If Supabase is unreachable during a build, the build fails. The build reads the public env vars from GitHub secrets.
- Rebuild lag: a change to a product, category or seller takes up to 5 minutes to queue, plus the build time before the public page changes. Listing pages (shop, search, homepage) read live from Supabase and update at once.
- Rebuild queue flag: queue rows stayed done = false after a build during testing. The build itself worked, so the done flag may not update reliably. Check before relying on it.
- Deleted categories and products keep their old static page until the next rebuild.

Database and security
- Public seller data relies on column privileges. Any new sellers column is hidden from visitors by default. Any future query from visitors must use the public_sellers view or only the seven granted columns. A plain select of the sellers table as a visitor will error.
- New RLS policies must use (select auth.uid()) and avoid repeating checks that already exist. Supabase Advisor flags the slower pattern.
- Storage seller rule: an earlier version compared the wrong value (storage.foldername on the product name), which blocked every seller upload. Fixed with can_manage_product_photo(path). Keep this helper when editing storage rules.
- Permissive policies: brands and categories previously had combined admin and public rules, which Advisor flagged. Now split. Keep insert, update and delete rules separate from public read rules.
- Overpayment: when Paystack adds fees to a payment, mark_order_paid logs the difference in admin_note for a manual refund. Set the Paystack fee bearer to the store.
- Bank transfers are confirmed by an admin and only then marked paid. Customers see the placeholder account until bank-details.ts is replaced.

Marketplace
- Seller orders and payouts are not built. Sellers can list products, but orders still arrive at Sumus. The seller dashboard says orders appear after payouts are set up.
- Sellers can request brands, so near-duplicates ("Hisense" and "Hisense Ltd") can appear. Exact duplicates are caught, but there is no merge tool yet.
- A seller cannot pause their own products. Only Sumus can hide them.
- Suspending a seller hides their products at once. They stay hidden after reactivation until the seller saves them again.
- Products show "Sold by Sumus" until the product page batch is applied.
- Warranty period is checked on seller products but not displayed on product pages yet.

Admin
- Category form errors are generic. The real database error is hidden. Fix pending (see Status, item 3).
- Admin alerts use polling every 60 seconds and need browser notification permission.
- Brand renaming is not in the admin screen. Use Table Editor.

Mobile and photos
- Photo upload converts images in the browser (createImageBitmap). Some phone formats, such as HEIC, may fail on certain browsers. The error box shows the file type. Use JPG if a photo fails.
- Huawei and other Android browsers sometimes show "no file selected" after a failed upload. Refresh and retry.
- The product photo folder must match the product id. The dashboard creates the product first, then uploads.

Content and copy
- All policy pages are DRAFT wording.
- Footer and About text is generic until the launch checklist is done.
- The hero copy and trust strip claim genuine products and warranty on every item. Check these are true before launch.

Other
- Wishlist and cart are stored on the device. Wishlist syncs to the account when signed in. Cart does not sync.
- Reviews must be approved before they show. No moderation screen exists yet.
- Seller ratings are not built and the shop page shows no rating.
- Email confirmation is off, so new accounts are signed in at once.
- Next.js is version 15. Earlier notes said 14, so check any version-specific advice.

=====================================================================
8. NEXT STEPS (FIRST THREE WHEN YOU CONTINUE)
=====================================================================

1. Send the current product files, either as the repo zip (leave out node_modules and .next) or pasted as text: components/product-card.tsx, components/product-detail-view.tsx, hooks/use-home-products.ts, hooks/use-catalogue.ts, lib/catalogue.ts, components/site-footer.tsx, and components/mobile-menu.tsx. Then write the product page batch as complete files: seller name and link on cards and product pages, warranty display, and Sellers links in the footer and mobile menu.

2. Test the product page batch on a phone: a Sumus product shows "Sold by Sumus", a seller product links to its shop, the warranty shows, and the footer and mobile menu link to /sellers/. Delete the duplicate workflow file in .github/workflows /.

3. Decide the seller money model with the owner before building payouts: commission percentage, who pays delivery, when sellers are paid, and whether sellers can pause their own products. Then build the Paystack subaccount on approval, the split payment in create-order, and the seller order view in My shop.

Also note for the next chat: the admin category error text fix is still owed, so include it in the next admin update.
