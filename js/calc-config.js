/* =========================================================================
   js/calc-config.js — Import cost calculator settings
   Every number the calculator uses lives here. Edit this file to change a
   rate, a fee or a freight band; js/calc.js reads these values and never
   hard-codes any of them. Amounts are in the currency named by the key.
   ========================================================================= */
window.JCC_CALC_CONFIG = {

  /* JPY per £1. An editable estimate shown to the user — not a live rate. */
  exchangeRate: { "default": 209, min: 1, step: 0.01 },

  /* A. Our sourcing & export fee: the higher of (rate × vehicle price)
        and the minimum, per vehicle. */
  sourcingFee: { rate: 0.10, minimumGBP: 500 },

  /* B. Japan pre-shipment costs — one lump estimate covering domestic
        transport, export deregistration and documents, port / yard charges
        and Japanese export customs clearance. */
  japanPreShipmentJPY: 85000,

  /* C. Ocean freight & insurance by vehicle size. Each figure already
        includes the marine insurance budget below — never add it twice. */
  insuranceIncludedGBP: 103,
  vehicleSizes: [
    { key: "small",   label: "Small / Compact",                       gbp: 1603 },
    { key: "sedan",   label: "Sedan",                                 gbp: 1753 },
    { key: "sports",  label: "Sports / Coupe",                        gbp: 1853 },
    { key: "minivan", label: "MPV / Minivan — e.g. Toyota Alphard",  gbp: 2003 },
    { key: "suv",     label: "SUV / Large 4WD",                       gbp: 2103 }
  ],

  /* UK import duty options. 0% is for verified preferential origin only. */
  dutyOptions: [
    { key: "standard",     rate: 0.10, label: "10% — Standard estimate" },
    { key: "preferential", rate: 0,    label: "0% — Verified preferential-origin eligibility only" }
  ],

  /* D. UK local costs — port charges, customs clearance service and inland
        delivery to the dealership. Paid by the buyer to UK providers. */
  ukLocalCostsGBP: 700,

  /* E. UK import VAT, shown separately as a reference figure. */
  vatRate: 0.20,

  defaults: { currency: "JPY", size: "minivan", duty: "standard" }
};
