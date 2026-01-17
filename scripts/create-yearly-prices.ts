// Script to create yearly prices in Stripe
// Run with: npx tsx scripts/create-yearly-prices.ts

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const YEARLY_PRICES = {
  basic: {
    name: 'TireOps Basic',
    monthlyPrice: 2900, // $29 in cents
    yearlyPrice: 29000, // $290 in cents (2 months free)
  },
  pro: {
    name: 'TireOps Professional',
    monthlyPrice: 5900, // $59 in cents
    yearlyPrice: 59000, // $590 in cents (2 months free)
  },
  enterprise: {
    name: 'TireOps Enterprise',
    monthlyPrice: 14900, // $149 in cents
    yearlyPrice: 149000, // $1490 in cents (2 months free)
  },
};

async function createYearlyPrices() {
  console.log('Creating yearly prices in Stripe...\n');

  const results: Record<string, string> = {};

  for (const [tier, config] of Object.entries(YEARLY_PRICES)) {
    try {
      // First, find or create the product
      const products = await stripe.products.search({
        query: `name~"${config.name}"`,
        limit: 1,
      });

      let productId: string;

      if (products.data.length > 0) {
        productId = products.data[0].id;
        console.log(`Found existing product for ${tier}: ${productId}`);
      } else {
        // Create the product
        const product = await stripe.products.create({
          name: config.name,
          description: `${config.name} subscription plan`,
          metadata: { tier },
        });
        productId = product.id;
        console.log(`Created new product for ${tier}: ${productId}`);
      }

      // Check if yearly price already exists
      const existingPrices = await stripe.prices.list({
        product: productId,
        type: 'recurring',
        limit: 10,
      });

      const existingYearlyPrice = existingPrices.data.find(
        (p) => p.recurring?.interval === 'year' && p.unit_amount === config.yearlyPrice
      );

      if (existingYearlyPrice) {
        console.log(`Yearly price already exists for ${tier}: ${existingYearlyPrice.id}`);
        results[tier] = existingYearlyPrice.id;
        continue;
      }

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: config.yearlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
        metadata: {
          tier,
          billing_cycle: 'yearly',
        },
      });

      console.log(`Created yearly price for ${tier}: ${yearlyPrice.id}`);
      results[tier] = yearlyPrice.id;
    } catch (error) {
      console.error(`Error creating price for ${tier}:`, error);
    }
  }

  console.log('\n========================================');
  console.log('Add these to your .env.local file:');
  console.log('========================================\n');

  if (results.basic) {
    console.log(`STRIPE_PRICE_BASIC_YEARLY=${results.basic}`);
  }
  if (results.pro) {
    console.log(`STRIPE_PRICE_PRO_YEARLY=${results.pro}`);
  }
  if (results.enterprise) {
    console.log(`STRIPE_PRICE_ENTERPRISE_YEARLY=${results.enterprise}`);
  }

  return results;
}

createYearlyPrices()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
