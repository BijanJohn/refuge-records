import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
}

interface CheckoutRequest {
  priceId: string;
  discogsListingId: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const body: CheckoutRequest = await request.json();
    const { priceId, discogsListingId } = body;

    if (!priceId || !discogsListingId) {
      return new Response(
        JSON.stringify({ error: 'Missing priceId or discogsListingId' }),
        { status: 400, headers }
      );
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 500, // $5.00
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ],
      success_url: `${new URL(request.url).origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/records`,
      metadata: {
        discogs_listing_id: discogsListingId,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers }
    );
  } catch (error) {
    console.error('Checkout error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers }
    );
  }
};
