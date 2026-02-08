# SitSwap Mobile (Expo)

This is the standalone React Native app for SitSwap. It is intentionally separate from the Next.js web app.

## Quick Start

Node 20.9+ is required (Expo uses modern JS APIs like `toReversed`).

```bash
cd mobile
cp .env.example .env
npm install
npm run ios
```

For Android:

```bash
npm run android
```

## Environment

Set the following in `mobile/.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_URL` (optional; used for deep links / web fallback)

## Structure

- `App.tsx`: entry point
- `src/screens`: app screens
- `src/theme`: design tokens for the mobile palette

## Included Screens

- Explore feed + featured listings
- Search with listing-type filters
- Swipe deck (likes + matches)
- Inbox (messages + matches)
- Sits status list
- Listing detail + conversation
- Profile + My Listings shortcut
