# Japan car cycle — website

Static website for **Japan car cycle**, exporters of used vehicles from Japan to the UK.

White ground, black ink. Orange (`#f07832`) and lime (`#c5f542`) are used only as small accents, the same way the printed Vehicle Request Form uses them.

## Pages (one document, hash routes)

| Route        | Contents |
|--------------|----------|
| `#/`         | Hero (kinetic wordmark), key figures, featured stock (flip cards), how it works, request CTA, news |
| `#/stock`    | Stock list: body-type filters, search, sorting, GBP / JPY switch |
| `#/company`  | Message, business lines, photos, company profile |
| `#/request`  | Online version of the Vehicle Request Form (all 13 questions plus contact details) |

## Structure

```
index.html
css/style.css          design tokens + all components
js/data.js             sample stock + line-art car drawings
js/ink.js              ink-wash background (black / orange / lime blooms)
js/fx.js               scramble, kinetic letters, reveal, odometer, scroll rail
js/app.js              routing, stock, request form
assets/fonts/          Marcellus SC, Della Respira, Jost (OFL)
assets/img/            photos
assets/docs/           printable PDF request form
```

No build step. To preview locally, run `python3 -m http.server` in this folder and open http://localhost:8000. It works on GitHub Pages as-is.

## Before going live

- **Stock** in `js/data.js` is sample data. Replace it with real inventory.
- **Contact email**: `CONTACT_EMAIL` in `js/app.js` is a placeholder.
- **Company profile**: the established date, full address and dealer licence number are marked TBC in `index.html`.
- **Figures and news** on the home page are example copy. Check them before publishing.
- **Photos** in `assets/img/` come from the BE FORWARD corporate site and were used as reference material. Confirm usage rights or replace them with your own photos.
- **Request form**: the site is static, so the form builds a summary for the customer to send by email or copy. Connect a form backend (e.g. Formspree, Netlify Forms) to receive requests directly.
