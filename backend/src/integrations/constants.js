/** Canonical ecommerce event keys used app-wide */

exports.PROVIDERS = Object.freeze(['meta', 'snapchat', 'google']);

/** @typedef {'PageView'|'ViewContent'|'Search'|'AddToCart'|'AddToWishlist'|'InitiateCheckout'|'AddPaymentInfo'|'Purchase'|'Lead'|'CompleteRegistration'} StandardEvent */

exports.STANDARD_EVENTS = Object.freeze([
  'PageView',
  'ViewContent',
  'Search',
  'AddToCart',
  'AddToWishlist',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
  'Lead',
  'CompleteRegistration',
]);

/** Maps standard event names to Snapchat CAPI names */
exports.toSnapchatEventName = (standard) => {
  const m = {
    PageView: 'PAGE_VIEW',
    ViewContent: 'VIEW_CONTENT',
    Search: 'SEARCH',
    AddToCart: 'ADD_CART',
    AddToWishlist: 'LIST_VIEW',
    InitiateCheckout: 'START_CHECKOUT',
    AddPaymentInfo: 'ADD_BILLING',
    Purchase: 'PURCHASE',
    Lead: 'SUBSCRIBE',
    CompleteRegistration: 'SIGN_UP',
  };
  return m[standard] || 'CUSTOM_EVENT_1';
};

/** Maps standard event names to GA4 Measurement Protocol names */
exports.toGa4EventName = (standard) => {
  const m = {
    PageView: 'page_view',
    ViewContent: 'view_item',
    Search: 'search',
    AddToCart: 'add_to_cart',
    AddToWishlist: 'add_to_wishlist',
    InitiateCheckout: 'begin_checkout',
    AddPaymentInfo: 'add_payment_info',
    Purchase: 'purchase',
    Lead: 'generate_lead',
    CompleteRegistration: 'sign_up',
  };
  return m[standard] || 'custom_event';
};

/** Meta Conversion API expects standard event names matching pixel */
exports.toMetaEventName = (standard) => standard;

exports.META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';

const { resolveStorefrontBaseUrl } = require('../utils/storefrontUrl');

exports.defaultEventSourceUrl = () => resolveStorefrontBaseUrl() || process.env.APP_PUBLIC_URL || 'https://localhost:5173';
