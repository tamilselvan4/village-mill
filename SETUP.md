# The Village Mill Ecommerce Setup

This is a lightweight static storefront with Vercel serverless APIs.

## 1. Supabase

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication > Providers, enable Google.
4. Add your Vercel domain and local dev URL to the Supabase auth redirect allow list.
5. Supabase Auth handles Google login and password hashing. This app does not store raw passwords in custom tables.

## 2. Razorpay

1. Create Razorpay API keys.
2. Keep `RAZORPAY_KEY_SECRET` only in Vercel environment variables.
3. Checkout creates a Razorpay order on the server and verifies the returned signature before marking an order paid.

## 3. Vercel Environment Variables

Add these in Vercel Project Settings > Environment Variables:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
ADMIN_EMAILS
```

`ADMIN_EMAILS` is a comma-separated list of Google account emails allowed to open `admin.html` actions.
