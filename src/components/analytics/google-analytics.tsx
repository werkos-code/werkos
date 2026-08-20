"use client";

import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Same GA4 property as werkos.nl — cross-domain linker for journey continuity.
 * Page views are sent explicitly so SPA navigations stay accurate.
 */
export function GoogleAnalytics() {
  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            linker: {
              domains: ['werkos.nl', 'app.werkos.nl']
            }
          });
        `}
      </Script>
    </>
  );
}
