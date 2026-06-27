# Instagram Latest Posts API Setup

This project now includes:

- `GET /api/instagram/latest`
- Optional query string: `?limit=6`

The route returns the latest Instagram media from the connected Instagram Business account.

## Required Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```txt
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id
INSTAGRAM_ACCESS_TOKEN=your_long_lived_meta_access_token
```

Aliases also supported:

```txt
META_INSTAGRAM_BUSINESS_ACCOUNT_ID=...
META_INSTAGRAM_ACCESS_TOKEN=...
```

## What the API returns

```json
{
  "ok": true,
  "posts": [
    {
      "id": "...",
      "caption": "...",
      "mediaType": "IMAGE | VIDEO | CAROUSEL_ALBUM",
      "mediaUrl": "...",
      "thumbnailUrl": "...",
      "permalink": "https://www.instagram.com/p/.../",
      "timestamp": "...",
      "username": "seattledesitv"
    }
  ]
}
```

## Meta setup checklist

1. Instagram account must be a Business account.
2. Instagram account must be connected to a Facebook Page.
3. Create or use a Meta app in Meta for Developers.
4. Add Instagram Graph API access.
5. Generate a Page access token with permissions that can read Instagram media.
6. Find the Instagram Business Account ID from the connected Facebook Page.
7. Add the token and ID to Vercel environment variables.
8. Redeploy.
9. Test: `/api/instagram/latest?limit=6`

## Important

Keep the token server-side only. Do not expose it as `NEXT_PUBLIC_*`.
