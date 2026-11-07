# Marketplace Database Schema (`supabase`)

This file contains the structural overview of the Supabase database schema, tables, RLS policies, views, functions, and scheduled cron jobs used across the Sumus marketplace project.

---

## 1. Core User & Marketplace Tables

### `profiles`
Stores profile details for buyers, sellers, and administrators.
- `id` (uuid, primary key, references `auth.users.id`)
- `full_name` (text)
- `phone` (text)
- `role` (text) — `'customer'` | `'admin'`

### `sellers`
Stores vendor registrations, business details, and approval statuses.
- `id` (uuid, primary key)
- `user_id` (uuid, unique, references `auth.users.id`)
- `display_name` (text)
- `slug` (text, unique)
- `kind` (text) — `'individual'` | `'business'`
- `state` (text)
- `status` (text) — `'pending'` | `'approved'` | `'suspended'` | `'rejected'`
- `paystack_subaccount_code` (text, nullable)
- `created_at` (timestamptz)
- *Private Columns (restricted from public/visitor read):* `account_number`, `bank_name`, `owner_phone`, `address`, `registration_number`

### `seller_documents`
Verification documents uploaded by vendors (accessed via 5-minute signed URLs).
- `id` (uuid, primary key)
- `seller_id` (uuid, references `sellers.id`)
- `kind` (text) — `'owner_id'` | `'registration'` | `'genuine_proof'`
- `storage_path` (text)
- `created_at` (timestamptz)

---

## 2. Catalog & Products Tables

### `categories`
Hierarchical product categories.
- `id` (uuid, primary key)
- `name` (text)
- `slug` (text, unique)
- `parent_id` (uuid, nullable, self-referencing)
- `sort_order` (integer)

### `brands`
Product brands.
- `id` (uuid, primary key)
- `name` (text, unique)
- `slug` (text, unique)

### `category_fields`
Custom detail specification fields configured per subcategory by admins.
- `id` (uuid, primary key)
- `category_id` (uuid, references `categories.id`)
- `label` (text)
- `field_type` (text) — `'text'` | `'number'` | `'choice'`
- `unit` (text, nullable)
- `options` (text array, nullable) — for choice fields
- `is_required` (boolean)
- `is_filter` (boolean)
- `sort_order` (integer)

### `products`
Catalog products listed by Sumus or third-party sellers.
- `id` (uuid, primary key)
- `name` (text)
- `slug` (text, unique)
- `description` (text)
- `specifications` (jsonb) — stores values keyed by `category_fields` label
- `brand_id` (uuid, references `brands.id`)
- `category_id` (uuid, references `categories.id`)
- `seller_id` (uuid, nullable, references `sellers.id` — `null` for Sumus stock)
- `is_active` (boolean)
- `moderation` (text) — `'live'` | `'hidden'`
- `warranty_period` (text)
- `seller_paused` (boolean, default `false`)
- `seller_paused_at` (timestamptz, nullable)
- `accepts_offers` (boolean, default `false`)
- `created_at` (timestamptz)

### `product_variants`
SKUs, storage/colour options, pricing, and stock.
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `storage` (text, nullable)
- `colour` (text, nullable)
- `sku` (text, unique)
- `price_kobo` (integer) — stored in kobo
- `compare_at_kobo` (integer, nullable)
- `stock_qty` (integer)
- `sale_ends_at` (timestamptz, nullable)
- `is_active` (boolean)

### `product_images`
Product photo gallery references.
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `variant_id` (uuid, nullable, references `product_variants.id`)
- `image_url` (text)
- `position` (integer)

---

## 3. Orders & Transactions Tables

### `orders`
Header table for customer orders.
- `id` (uuid, primary key)
- `order_number` (text, unique) — format `SS-XXXXXXXX-XXXX`
- `user_id` (uuid, nullable, references `auth.users.id`)
- `status` (text) — `'pending_payment'` | `'awaiting_transfer'` | `'paid'` | `'processing'` | `'shipped'` | `'delivered'` | `'cancelled'` | `'refunded'`
- `payment_method` (text) — `'paystack'` | `'bank_transfer'`
- `email` (text)
- `phone` (text)
- `subtotal_kobo` (integer)
- `delivery_fee_kobo` (integer)
- `total_kobo` (integer)
- `shipping_address` (jsonb)
- `delivery_zone_id` (uuid, references `delivery_zones.id`)
- `store_id` (uuid, nullable, references `stores.id`)
- `admin_note` (text, nullable)
- `seen_by_admin` (boolean)
- `created_at` (timestamptz)

### `order_items`
Line items attached to an order.
- `id` (uuid, primary key)
- `order_id` (uuid, references `orders.id`)
- `variant_id` (uuid, references `product_variants.id`)
- `product_name` (text)
- `variant_label` (text)
- `quantity` (integer)
- `unit_price_kobo` (integer)

### `payments`
Payment gateway logs.
- `id` (uuid, primary key)
- `order_id` (uuid, references `orders.id`)
- `reference` (text)
- `amount_kobo` (integer)
- `currency` (text)
- `payload` (jsonb)

### `delivery_zones` & `stores`
- `delivery_zones`: `id`, `name` ('Lagos', 'Outside Lagos', 'Store Pickup'), `fee_kobo`, `min_days`, `max_days`, `is_active`
- `stores`: `id`, `name`, `address`, `state`, `phone`, `latitude`, `longitude`, `opening_hours`, `is_active`

---

## 4. Messaging & Offer System Tables

### `conversations`
In-site buyer-seller messaging threads.
- `id` (uuid, primary key)
- `buyer_id` (uuid, references `auth.users.id`)
- `seller_id` (uuid, references `sellers.id`)
- `product_id` (uuid, nullable, references `products.id` on delete set null)
- `product_name` (text)
- `buyer_name` (text) — first name snapshot
- `last_message_at` (timestamptz)
- `last_sender_id` (uuid, nullable)
- `buyer_last_read_at` (timestamptz, nullable)
- `seller_last_read_at` (timestamptz, nullable)
- `hidden_by_admin` (boolean, default `false`)
- `created_at` (timestamptz)
- *Unique Constraint:* `(buyer_id, seller_id, product_id)`

### `messages`
Individual text messages inside a conversation thread.
- `id` (uuid, primary key)
- `conversation_id` (uuid, references `conversations.id` on delete cascade)
- `sender_id` (uuid, references `auth.users.id`)
- `body` (text) — 1 to 2000 characters
- `created_at` (timestamptz)

### `offers`
Price negotiation records created within conversations.
- `id` (uuid, primary key)
- `conversation_id` (uuid, references `conversations.id` on delete cascade)
- `variant_id` (uuid, references `product_variants.id` on delete cascade)
- `buyer_id` (uuid, references `auth.users.id` on delete cascade)
- `seller_id` (uuid, references `sellers.id` on delete cascade)
- `amount_kobo` (integer, check > 0)
- `listed_price_kobo` (integer, check > 0)
- `made_by` (text) — `'buyer'` | `'seller'`
- `parent_offer_id` (uuid, nullable, references `offers.id` on delete set null)
- `status` (text) — `'pending'` | `'accepted'` | `'declined'` | `'countered'` | `'withdrawn'` | `'expired'` | `'used'`
- `expires_at` (timestamptz)
- `responded_at` (timestamptz, nullable)
- `order_id` (uuid, nullable, references `orders.id` on delete set null) — links to order upon checkout
- `created_at` (timestamptz)

---

## 5. Auxiliary & User Interaction Tables

### `reviews`
- `id` (uuid, primary key), `product_id` (uuid), `user_id` (uuid), `rating` (integer 1-5), `comment` (text), `status` ('pending' | 'approved'), `verified_purchase` (boolean), `created_at` (timestamptz)

### `addresses` & `wishlist_items`
- `addresses`: `id`, `user_id`, `label`, `full_name`, `phone`, `state`, `area`, `street`, `is_default`
- `wishlist_items`: `id`, `user_id`, `variant_id`, UNIQUE(`user_id`, `variant_id`)

### `enquiries` & `newsletter_subscribers`
- `enquiries`: `id`, `kind` ('contact' | 'bulk'), `name`, `email`, `phone`, `company`, `message`, `replied`, `created_at`
- `newsletter_subscribers`: `id`, `email` (unique)

### `rebuild_queue`
Deploy queue for GitHub Pages static site generation.
- `id` (bigint, primary key), `reason` (text), `created_at` (timestamptz), `done` (boolean)

---

## 6. Views, Stored Functions & Cron Jobs

### Security Views
- **`public_sellers`** (`security_invoker = true`): Exposes non-sensitive metadata for approved sellers (`slug`, `display_name`, `kind`, `state`, `created_at`).

### Core Database Functions
- **`is_admin()`**: Returns `true` if `profiles.role = 'admin'` for `auth.uid()`.
- **`current_seller_id()`**: Returns approved `sellers.id` for `auth.uid()`.
- **`offer_window()`**: Returns `interval '48 hours'`.
- **`max_buyer_offers()`**: Returns integer `3`.
- **`offer_payment_grace()`**: Returns `interval '1 hour'`.
- **`make_offer(p_conversation_id, p_variant_id, p_amount_kobo)`**: Creates a pending buyer offer after validating stock, listing price, open offers, and buyer offer limits.
- **`respond_to_offer(p_offer_id, p_action, p_amount_kobo)`**: Handles `'accept'`, `'decline'`, or `'counter'` actions and resets offer expiration window or inserts counter offer.
- **`withdraw_offer(p_offer_id)`**: Withdraws pending offer made by sender.
- **`release_offer_on_cancel()`**: Trigger function on `orders` status update to `'cancelled'`; resets attached used offer back to `'accepted'` (or `'expired'`).
- **`release_unpaid_offers()`**: Releases offers linked to unpaid Paystack card orders past the 1-hour grace period.
- **`seller_set_pause(p_product_id, p_paused)`**: Toggles `seller_paused` state on vendor products.

### Scheduled Cron Jobs (`pg_cron`)
- **`expire-offers`** (Every 15 mins): Sets pending/accepted offers past `expires_at` to `'expired'`.
- **`release-unpaid-offers`** (Every 15 mins): Calls `public.release_unpaid_offers()`.
- **`rebuild-site`** (Every 5 mins): Invokes Edge Function `rebuild-site` if `rebuild_queue` has pending items.
