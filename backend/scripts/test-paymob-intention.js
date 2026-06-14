/**
 * Quick Paymob smoke test using DB settings.
 *
 * Run from the backend folder (not project root):
 *   cd backend
 *   npm run test:paymob
 *
 * Or:
 *   node scripts/test-paymob-intention.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createPaymobCheckoutSession, loadPaymobConfig } = require('../src/integrations/paymob');

function printSetupHelp(cfg) {
  console.log('\nPaymob setup checklist:');
  console.log(`  enabled:          ${cfg.enabled}`);
  console.log(`  mode:             ${cfg.mode}`);
  console.log(`  public key:       ${cfg.publicKey ? 'set' : 'missing'}`);
  console.log(`  secret key:       ${cfg.secretKey ? 'set' : 'missing'}`);
  console.log(`  integration ID:   ${cfg.integrationId || 'MISSING — required'}`);
  console.log(`  HMAC secret:      ${cfg.hmacSecret ? 'set' : 'missing (needed for webhooks)'}`);
  console.log('\nGet Integration ID from Paymob:');
  console.log('  Dashboard → Developers → Payment Integrations → copy the Card integration ID');
  console.log('Then paste it in Admin → Settings → Paymob settings → Integration ID');
  console.log('\nNote: your Paymob account may still be "Pending Onboarding".');
  console.log('Complete onboarding in Paymob before live/test payments will work.\n');
}

async function main() {
  const cfg = await loadPaymobConfig();
  console.log('mode:', cfg.mode, 'configured:', cfg.configured, 'enabled:', cfg.enabled);

  if (!cfg.enabled) {
    printSetupHelp(cfg);
    throw new Error('Paymob is disabled. Enable it in Admin → Settings → Payment Methods.');
  }

  if (!cfg.configured) {
    printSetupHelp(cfg);
    throw new Error('Paymob credentials are incomplete.');
  }

  const order = {
    order_number: `TEST-${Date.now()}`,
    total: 100,
    currency: 'EGP',
    guest_email: 'test@example.com',
    shipping_address: {
      full_name: 'Test User',
      phone: '01000000000',
      email: 'test@example.com',
      city: 'Cairo',
      district: 'Cairo',
      street: 'Test St',
      country: 'EG',
    },
    items: [{
      name_en: 'Test product',
      quantity: 1,
      unit_price: 100,
      total_price: 100,
    }],
  };

  const session = await createPaymobCheckoutSession({
    order,
    billingEmail: 'test@example.com',
    redirectUrl: `http://127.0.0.1:${process.env.PORT || 5001}/api/orders/paymob/return?order_number=${order.order_number}`,
    notificationUrl: `http://127.0.0.1:${process.env.PORT || 5001}/api/orders/paymob/webhook`,
  });

  console.log('\nOK — open this URL in your browser to test payment:');
  console.log(session.iframe_url);
  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
