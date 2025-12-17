import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CLOUDFLARE_DEPLOY_HOOK?: string;
  SOLD_ITEMS?: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  // Get the raw body and signature
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const discogsListingId = session.metadata?.discogs_listing_id;

      console.log('Checkout completed:', {
        sessionId: session.id,
        discogsListingId,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
      });

      if (discogsListingId) {
        // Store sold item in KV (if available)
        if (env.SOLD_ITEMS) {
          await env.SOLD_ITEMS.put(
            `sold:${discogsListingId}`,
            JSON.stringify({
              sold_at: new Date().toISOString(),
              session_id: session.id,
              customer_email: session.customer_details?.email,
              amount_total: session.amount_total,
            }),
            { expirationTtl: 60 * 60 * 24 * 365 } // 1 year TTL
          );
        }

        // Trigger site rebuild via deploy hook
        if (env.CLOUDFLARE_DEPLOY_HOOK) {
          try {
            const deployResponse = await fetch(env.CLOUDFLARE_DEPLOY_HOOK, {
              method: 'POST',
            });
            console.log('Deploy hook triggered:', deployResponse.status);
          } catch (error) {
            console.error('Failed to trigger deploy hook:', error);
          }
        }
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session expired:', session.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
