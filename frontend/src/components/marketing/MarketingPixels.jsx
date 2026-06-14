import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { consumePurchaseForPixels } from '../../utils/marketingClient';

function injectScript(src, datasetKey) {
  if (document.querySelector(`script[data-misk-pixel="${datasetKey}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    s.dataset.miskPixel = datasetKey;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`script ${src}`));
    document.head.appendChild(s);
  });
}

/** Browser pixels + gtag — mirrors server CAPI when `event_id` is aligned (future: pass through API). */
export default function MarketingPixels() {
  const location = useLocation();
  const bootRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let json;
      try {
        const res = await fetch('/api/marketing/public-config', { credentials: 'omit' });
        if (!res.ok) return;
        json = await res.json();
      } catch {
        return;
      }
      if (cancelled || !json?.success) return;

      const cfg = json.data || {};
      if (cfg.google?.adsConversionSendTo) {
        window.__MISK_ADS_SEND_TO__ = cfg.google.adsConversionSendTo;
      }

      /** Meta */
      if (cfg.meta?.pixelId) {
        if (!window.fbq) {
          const n = window.fbq || function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
          window.fbq = n;
          window._fbq = n;
          n.push = n;
          n.loaded = true;
          n.version = '2.0';
          n.queue = [];
          await injectScript('https://connect.facebook.net/en_US/fbevents.js', 'fb').catch(() => {});
        }
        if (!window.__MISK_META_PIXEL_INIT__) {
          window.fbq?.('init', cfg.meta.pixelId);
          window.__MISK_META_PIXEL_INIT__ = true;
        }
        window.fbq?.('track', 'PageView');
      }

      /** Snapchat */
      if (cfg.snapchat?.pixelId) {
        if (!window.snaptr) {
          await injectScript('https://sc-static.net/scevent.min.js', 'snap').catch(() => {});
        }
        if (window.snaptr && !window.__MISK_SNAP_PIXEL_INIT__) {
          window.snaptr('init', cfg.snapchat.pixelId, { integration: 'manual' });
          window.__MISK_SNAP_PIXEL_INIT__ = true;
        }
        window.snaptr?.('track', 'PAGE_VIEW');
      }

      /** GA4 / gtag base */
      if (cfg.google?.measurementId) {
        window.dataLayer = window.dataLayer || [];
        if (!window.gtag) {
          window.gtag = function gtagStub() { window.dataLayer.push(arguments); };
        }
        const mid = cfg.google.measurementId;
        if (!bootRef.current) {
          await injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(mid)}`, 'gtag').catch(() => {});
          window.gtag('js', new Date());
          window.gtag('config', mid);
          const sendTo = cfg.google.adsConversionSendTo;
          const aw = sendTo ? String(sendTo).split('/')[0] : '';
          if (aw?.startsWith?.('AW-')) {
            window.gtag('config', aw);
          }
          bootRef.current = true;
        } else {
          window.gtag?.('event', 'page_view');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname]);

  useEffect(() => {
    const data = consumePurchaseForPixels();
    if (!data) return;
    const { total, currency = 'EGP', orderId, productIds = [] } = data;

    window.fbq?.('track', 'Purchase', {
      value: Number(total),
      currency,
      content_ids: productIds.map(String),
    });

    window.snaptr?.('track', 'PURCHASE', {
      currency,
      price: String(Number(total).toFixed(2)),
      transaction_id: orderId,
      item_ids: productIds.map(String),
    });

    window.gtag?.('event', 'purchase', {
      transaction_id: orderId,
      value: Number(total),
      currency,
      items: productIds.map((id) => ({ item_id: String(id), quantity: 1 })),
    });

    const sendTo = window.__MISK_ADS_SEND_TO__;
    if (window.gtag && sendTo) {
      window.gtag('event', 'conversion', {
        send_to: sendTo,
        value: Number(total),
        currency,
        transaction_id: orderId,
      });
    }
  }, [location.pathname]);

  return null;
}
