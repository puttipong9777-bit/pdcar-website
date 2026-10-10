export function BusinessJsonLd({phone}: {phone:string}) {
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AutoDealer",
        "@id": "https://www.pdcarcenter.com/#business",
        name: "PD Car Center",
        alternateName: "พีดี คาร์เซ็นเตอร์",
        url: "https://www.pdcarcenter.com/",
        logo: "https://www.pdcarcenter.com/images/pd-logo.jpg",
        image: "https://www.pdcarcenter.com/images/storefront.jpg",
        telephone: phone,
        description: "ร้านรถมือสองและรับซื้อรถมือสองในจังหวัดนครปฐม",
        address: {
          "@type": "PostalAddress",
          streetAddress: "23/2 หมู่ 13 ตำบลโพรงมะเดื่อ",
          addressLocality: "เมืองนครปฐม",
          addressRegion: "นครปฐม",
          postalCode: "73000",
          addressCountry: "TH"
        },
        areaServed: { "@type": "AdministrativeArea", name: "นครปฐมและพื้นที่ใกล้เคียง" }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.pdcarcenter.com/#website",
        url: "https://www.pdcarcenter.com/",
        name: "PD Car Center",
        alternateName: "พีดี คาร์เซ็นเตอร์",
        inLanguage: "th-TH",
        publisher: { "@id": "https://www.pdcarcenter.com/#business" }
      }
    ]
  };

return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(businessJsonLd).replace(/</g, "\\u003c")}} />;
}
