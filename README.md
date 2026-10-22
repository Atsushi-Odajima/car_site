# Samurai Auto Export — website

Static website for **Samurai Auto Export** (the service name; the operating company is still TBC on the Company page), exporters of used vehicles from Japan to the UK.

White ground, black ink, black header bar. Orange (`#f07832`) and lime (`#c5f542`) are used only as small accents, the same way the printed Vehicle Request Form uses them. On lettering only the wordmark carries colour: the S and the E in Union-flag blue (`#1a3fcf`), the A in Union-flag red (`#c8102e`); lime appears only on bars, dots and ticks. The ink-wash scenery shows behind the home hero only; from WHY JAPAN down the home page sits on a black wall (`.home-dark` flips the colour tokens), and the other pages are plain white.

## Publishing on GitHub Pages

The site needs no build step. In the repository on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**. A minute or two later it is live at

https://atsushi-odajima.github.io/car_site/

(`.nojekyll` is included so Pages serves the files exactly as they are.)

## Pages (one document, hash routes)

| Route        | Contents |
|--------------|----------|
| `#/`         | Hero (kinetic wordmark), key figures, featured stock (flip cards), how it works, request CTA, news |
| `#/stock`    | Stock list: body-type filters, search, sorting, GBP / JPY switch |
| `#/catalog`  | Catalogue (dark UI): 30 Japanese dealer listings mirrored in English from public search results on 221616.com — make chips, search, sort; each card opens `#/catalog/<id>` with gallery, price block, key facts, dealer condition scores, equipment and specification, plus hand-offs to the calculator (price and size pre-filled) and the request form |
| `#/calculator` | Import cost calculator for UK dealers: Japanese dealer price → estimated landed cost at the dealership, GBP with JPY alongside, import VAT shown separately |
| `#/process`  | How it works in four steps (find the vehicle → confirm & pay → export & shipping → collect in the UK), each with its detail chips; "More details" leads on |
| `#/process/details` | The 16-step transaction flow in four phases with the two end-to-end partner checklists; a line-art car follows the scroll down the rail |
| `#/company`  | Message, business lines, photos, company profile |
| `#/request`  | Online version of the Vehicle Request Form (all 13 questions plus contact details) |

## Structure

```
index.html
css/style.css          design tokens + all components
js/data.js             sample stock + line-art car drawings
js/ink.js              ink-wash background (black / orange / lime blooms)
js/fx.js               scramble, kinetic letters, reveal, odometer, scroll rail
js/app.js              routing, stock, request form, process-page car marker
js/calc-config.js      ALL calculator figures: exchange-rate default, fee rate and minimum,
                       pre-shipment lump sum, freight bands by vehicle size, duty options,
                       UK local costs, VAT rate — edit here, nothing is hard-coded elsewhere
js/catalog-data.js     catalogue sample data (30 listings) — regenerate with the scraper notes below
js/catalog.js          catalogue list + detail rendering
js/calc.js             calculator arithmetic (JccCalc.compute) and the page behaviour:
                       on "Start Price Estimate" the line-art car drives across a veil over
                       the page (Yokohama → Southampton) and the figures appear when it
                       arrives; editing an input afterwards dims them until the next press
assets/fonts/          Marcellus SC, Della Respira (OFL)
assets/img/            photos (cars/ = stock photos, bg/ = road, yard, highway)
assets/docs/           printable PDF request form
```

To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000.

## Before going live

- **Stock** in `js/data.js` is sample data. Replace it with real inventory.
- **Calculator figures** in `js/calc-config.js` are the agreed initial values (£1 = ¥209, 10% / min £500 fee, ¥85,000 pre-shipment, freight £1,603–£2,103 by size, £700 UK local costs, 10% / 0% duty, 20% VAT). The stock list's indicative JPY rate reads the same default. Review them whenever rates change; the page itself says the rate is an editable estimate, not a live one.
- **Contact email**: `CONTACT_EMAIL` in `js/app.js` is a placeholder.
- **Company profile**: the established date, full address and dealer licence number are marked TBC in `index.html`.
- **Figures and news** on the home page are example copy. Check them before publishing.
- **Photos**: `assets/img/ship.jpg`, `office.jpg` and `handshake.jpg` come from the BE FORWARD corporate site. The car photos in `assets/img/cars/` were supplied by the client and look like manufacturer press images. Confirm usage rights for both or replace them.
- **Background photos** in `assets/img/bg/` are from Wikimedia Commons and free to use:
  - `yard.jpg`: "New cars ready for shipment out of Dundalk Marine Terminal" (NARA 546813), public domain
  - `road.jpg`: "Highway drone shot (Unsplash)", CC0
  - `trails.jpg`: "Car trails on dual highway (Unsplash)", CC0
  - `tokyo-expressway.jpg`: "Highway intersection at night-time (Unsplash)", CC0
  - `forest-road.jpg`: "Driving on winding forest highway in California (Unsplash)", CC0
  - `valley-road.jpg`: "Zigzagging mountain road (Unsplash)", CC0
  - `aqualine.jpg`: "Tokyo Bay Aqua-Line Highway" by Kakidai, CC BY 2.0 — attribution is in the footer; keep it if the photo stays
- **Background blooms** use only these scenery photos (the `-ink.jpg` grayscale copies); the client's car photos appear on the stock cards only.
- **Catalogue data** (`js/catalog-data.js`) was extracted from public listing pages on 221616.com (Gulliver) for a private portfolio demonstration: specs, prices and equipment flags translated into English, photos hot-linked from the source (not copied into the repo). The listings, prices and photos belong to the selling dealer; the page says so. Do not publish this catalogue as a live sales channel without the source's permission, and refresh or remove it before any commercial use. To regenerate: fetch the search page's JSON-LD ItemList, fetch each detail page, read the Product JSON-LD plus the labelled text fields and `aria-label="…:あり/なし"` equipment flags, translate with a term table.
- **Request form**: the site is static, so the form builds a summary for the customer to send by email or copy. Connect a form backend (e.g. Formspree, Netlify Forms) to receive requests directly.
