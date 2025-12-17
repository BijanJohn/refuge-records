# Record Refuge

A vinyl record shop website built with Astro, powered by Discogs inventory and Stripe payments.

## Features

- Automatic daily sync from Discogs seller inventory
- Stripe Checkout for secure payments
- Cloudflare Pages deployment
- Sold items automatically removed via webhooks

## Setup

### Prerequisites

- Node.js 20+
- Discogs Personal Access Token
- Stripe account (test or live keys)
- Cloudflare account

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Sync inventory from Discogs:
   ```bash
   npm run sync
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCOGS_TOKEN` | Discogs Personal Access Token |
| `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key (frontend) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret |
| `CLOUDFLARE_DEPLOY_HOOK` | Cloudflare deploy hook URL (optional) |

### Getting API Keys

#### Discogs
1. Go to https://www.discogs.com/settings/developers
2. Click "Generate new token"
3. Copy the token to `DISCOGS_TOKEN`

#### Stripe
1. Go to https://dashboard.stripe.com/apikeys
2. Copy the publishable and secret keys
3. For webhooks, create an endpoint at `/api/webhook` and copy the signing secret

## Deployment

### Cloudflare Pages

1. Connect your GitHub repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables in the Cloudflare dashboard
5. Create a deploy hook for webhook-triggered rebuilds

### GitHub Actions

The repository includes a workflow that syncs inventory daily at 6 AM UTC.

Add these secrets to your GitHub repo:
- `DISCOGS_TOKEN`
- `STRIPE_SECRET_KEY`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run sync` | Sync inventory from Discogs |

## Architecture

```
Discogs API → GitHub Action (daily) → inventory.json → Astro Build → Cloudflare Pages
                                                              ↓
                                      Stripe Checkout ← CF Functions
                                              ↓
                                      Webhook → Deploy Hook → Rebuild
```

## License

MIT
