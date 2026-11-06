# Marketplace Database Schema (`supabase`)

This file contains the structural overview of the Supabase tables, columns, and relationships used across the marketplace project. Use this as context for fresh AI sessions when making database or feature edits.

---

## 1. Core User & Seller Tables

### `profiles`
Stores user profile information for buyers, sellers, and administrators.
- `id` (uuid, primary key, references `auth.users.id`)
- `email` (text)
- `full_name` (text)
- `avatar_url` (text)
- `role` (text) — e.g., `'buyer'`, `'seller'`, `'admin'`
- `phone` (text)
- `created_at` (timestamp)

### `sellers` / `seller_profiles`
Stores additional seller details, store setup, and verification statuses.
- `id` (uuid, primary key, references `profiles.id`)
- `store_name` (text)
- `store_slug` (text, unique)
- `bio` (text)
- `logo_url` (text)
- `banner_url` (text)
- `status` (text) — e.g., `'pending'`, `'active'`, `'suspended'`
- `verified` (boolean)
- `rating` (numeric)
- `created_at` (timestamp)

---

## 2. Catalog & Products Tables

### `categories`
Organizes products into main categories and subcategories.
- `id` (uuid or int, primary key)
- `name` (text)
- `slug` (text, unique)
- `parent_id` (uuid or int, nullable, self-referencing for hierarchical categories)
- `icon` (text)

### `products`
Stores all product listings on the marketplace.
- `id` (uuid, primary key)
- `seller_id` (uuid, references `sellers.id`)
- `category_id` (uuid/int, references `categories.id`)
- `title` (text)
- `slug` (text, unique)
- `description` (text)
- `price` (numeric)
- `sale_price` (numeric, nullable)
- `stock` (integer)
- `images` (array/jsonb) — array of image URLs
- `featured` (boolean)
- `status` (text) — e.g., `'draft'`, `'published'`, `'out_of_stock'`
- `created_at` (timestamp)

### `product_variants` (Optional/Extended)
Product attributes like size, color, or specifications.
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `name` (text) — e.g., `'Size'`, `'Color'`
- `options` (jsonb/array) — e.g., `['S', 'M', 'L']`

---

## 3. Transactions & Cart Tables

### `cart_items`
Stores items added to user shopping carts.
- `id` (uuid, primary key)
- `user_id` (uuid, references `profiles.id`)
- `product_id` (uuid, references `products.id`)
- `quantity` (integer)
- `created_at` (timestamp)

### `orders`
Header table for customer orders.
- `id` (uuid, primary key)
- `user_id` (uuid, references `profiles.id`)
- `status` (text) — e.g., `'pending'`, `'processing'`, `'shipped'`, `'delivered'`, `'cancelled'`
- `total_amount` (numeric)
- `shipping_address` (jsonb)
- `payment_status` (text) — e.g., `'unpaid'`, `'paid'`, `'refunded'`
- `created_at` (timestamp)

### `order_items`
Individual line items within a customer order.
- `id` (uuid, primary key)
- `order_id` (uuid, references `orders.id`)
- `product_id` (uuid, references `products.id`)
- `seller_id` (uuid, references `sellers.id`)
- `quantity` (integer)
- `unit_price` (numeric)

---

## 4. User Interaction Tables

### `reviews`
Product reviews and ratings left by users.
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `user_id` (uuid, references `profiles.id`)
- `rating` (integer) — 1 to 5
- `comment` (text)
- `created_at` (timestamp)

### `wishlists` / `wishlist_items`
User saved/favorite items.
- `id` (uuid, primary key)
- `user_id` (uuid, references `profiles.id`)
- `product_id` (uuid, references `products.id`)

### `conversations` & `messages` (Buyer-Seller Messaging)
Handles messaging between buyers, sellers, and support.
- `conversations`: `id`, `buyer_id`, `seller_id`, `created_at`
- `messages`: `id`, `conversation_id`, `sender_id`, `text`, `created_at`