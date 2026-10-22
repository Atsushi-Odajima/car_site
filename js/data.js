/* =========================================================================
   js/data.js — Samurai Auto Export sample stock + line-art car drawings
   Exposes: window.JCC = { vehicles, bodies, carSVG(body), money(gbp, ccy) }
   Stock below is SAMPLE DATA for layout — replace with live inventory.
   Prices are indicative CIF Southampton, excluding UK duty, VAT and
   registration.
   ========================================================================= */
(function () {
  "use strict";

  /* indicative display rate for stock prices; kept equal to the calculator's
     default in js/calc-config.js so the site quotes one rate */
  var GBP_TO_JPY = (window.JCC_CALC_CONFIG && window.JCC_CALC_CONFIG.exchangeRate["default"]) || 209;

  var vehicles = [
    { id: "SAE-2401", make: "Toyota", model: "Alphard", grade: "2.5 S C Package", body: "minivan", year: 2019, km: 48000, engine: "2.5 Petrol", fuel: "Petrol", seats: 7, score: "4.5", gbp: 24950, featured: true, img: "assets/img/cars/alphard.jpg", fit: "cover" },
    { id: "SAE-2402", make: "Toyota", model: "Vellfire", grade: "2.5 Z G Edition", body: "minivan", year: 2018, km: 62000, engine: "2.5 Petrol", fuel: "Petrol", seats: 7, score: "4", gbp: 19850, img: "assets/img/cars/vellfire.jpg", fit: "cover" },
    { id: "SAE-2403", make: "Nissan", model: "Elgrand", grade: "3.5 Highway Star", body: "minivan", year: 2017, km: 71000, engine: "3.5 V6", fuel: "Petrol", seats: 8, score: "4", gbp: 12450 },
    { id: "SAE-2404", make: "Mitsubishi", model: "Delica D:5", grade: "2.2D Jasper 4WD", body: "minivan", year: 2020, km: 38000, engine: "2.2 Diesel", fuel: "Diesel", seats: 8, score: "4.5", gbp: 23500 },
    { id: "SAE-2405", make: "Toyota", model: "Land Cruiser Prado", grade: "2.8D TX L Package", body: "suv", year: 2018, km: 59000, engine: "2.8 Diesel", fuel: "Diesel", seats: 7, score: "4", gbp: 27900, featured: true, img: "assets/img/cars/prado.jpg", fit: "cover" },
    { id: "SAE-2408", make: "Toyota", model: "Prius", grade: "1.8 S Touring", body: "hatch", year: 2019, km: 54000, engine: "1.8 Hybrid", fuel: "Hybrid", seats: 5, score: "4", gbp: 9450, img: "assets/img/cars/prius.jpg", fit: "cover" },
    { id: "SAE-2409", make: "Nissan", model: "Skyline", grade: "400R", body: "sedan", year: 2020, km: 29000, engine: "3.0 V6 Twin Turbo", fuel: "Petrol", seats: 5, score: "4.5", gbp: 26800, featured: true, img: "assets/img/cars/skyline.jpg", fit: "cover" },
    { id: "SAE-2410", make: "Mazda", model: "Roadster RF", grade: "VS", body: "sports", year: 2019, km: 24000, engine: "2.0 Petrol", fuel: "Petrol", seats: 2, score: "4.5", gbp: 16900, img: "assets/img/cars/roadster.jpg", fit: "cover" },
    { id: "SAE-2411", make: "Toyota", model: "Crown", grade: "2.5 RS Advance", body: "sedan", year: 2019, km: 45000, engine: "2.5 Hybrid", fuel: "Hybrid", seats: 5, score: "4", gbp: 17600, img: "assets/img/cars/crown.jpg", fit: "cover" },
    { id: "SAE-2413", make: "Toyota", model: "Voxy", grade: "Hybrid ZS Kirameki", body: "minivan", year: 2019, km: 46000, engine: "1.8 Hybrid", fuel: "Hybrid", seats: 7, score: "4", gbp: 13900, img: "assets/img/cars/voxy.jpg", fit: "cover" },
    { id: "SAE-2412", make: "Subaru", model: "Levorg", grade: "1.6 GT-S EyeSight", body: "estate", year: 2018, km: 52000, engine: "1.6 Turbo", fuel: "Petrol", seats: 5, score: "4", gbp: 11300, img: "assets/img/cars/levorg.jpg", fit: "cover" }
  ];

  var bodies = [
    { key: "minivan", label: "MPV / MINIVAN" },
    { key: "suv", label: "SUV / 4X4" },
    { key: "sedan", label: "SALOON" },
    { key: "estate", label: "ESTATE" },
    { key: "hatch", label: "HATCHBACK" },
    { key: "sports", label: "SPORTS" },
    { key: "kei", label: "KEI CAR" }
  ];

  /* ---- line-art profiles ----------------------------------------------
     viewBox 600×450, ground y=352, sill y=300, front of the car on the
     right. `top` runs from rear-bottom over the roof to front-bottom. */
  var SHAPES = {
    minivan: {
      wr: 150, wf: 455, r: 40,
      top: "M60,300 L60,172 Q60,108 104,100 L452,96 Q488,96 504,130 L540,190 Q548,206 548,232 L548,300",
      win: "M98,166 L110,116 L446,113 Q470,113 482,136 L508,166 Z",
      lines: "M232,114 L232,166 M366,113 L366,166 M300,176 L300,280 M512,206 L540,210"
    },
    suv: {
      wr: 150, wf: 460, r: 42,
      top: "M62,300 L62,192 Q64,136 110,128 L192,92 Q206,84 232,84 L398,84 Q424,84 444,106 L480,146 L530,160 Q552,166 552,196 L552,300",
      win: "M118,170 L126,140 L200,104 Q212,98 232,98 L396,98 Q416,98 430,114 L462,154 L462,170 Z",
      lines: "M300,98 L300,170 M300,182 L300,280 M520,176 L548,180 M62,210 L78,210"
    },
    sedan: {
      wr: 140, wf: 460, r: 40,
      top: "M55,300 L55,216 Q58,182 96,174 L150,170 L222,114 Q236,104 262,104 L360,104 Q386,104 406,122 L456,166 L525,178 Q550,184 550,216 L550,300",
      win: "M166,170 L230,120 Q242,114 262,114 L356,114 Q376,114 392,128 L436,170 Z",
      lines: "M306,114 L306,170 M306,180 L306,282 M520,196 L546,200 M58,200 L76,200"
    },
    estate: {
      wr: 140, wf: 460, r: 40,
      top: "M50,300 L50,190 Q52,136 96,128 L214,104 Q228,98 250,98 L380,98 Q402,98 420,118 L460,165 L525,178 Q550,184 550,216 L550,300",
      win: "M84,168 L96,142 L218,116 Q230,110 250,110 L376,110 Q394,110 406,124 L440,168 Z",
      lines: "M196,120 L196,168 M316,110 L316,168 M316,178 L316,282 M520,196 L546,200"
    },
    hatch: {
      wr: 160, wf: 450, r: 40,
      top: "M80,300 L80,204 Q78,146 116,136 L176,130 L240,100 Q255,94 280,94 L360,94 Q385,94 405,115 L450,165 L515,180 Q540,186 540,216 L540,300",
      win: "M112,170 L120,148 L182,142 L244,112 Q256,106 280,106 L356,106 Q376,106 392,122 L432,170 Z",
      lines: "M304,106 L304,170 M304,180 L304,282 M512,198 L536,202"
    },
    sports: {
      wr: 140, wf: 465, r: 38,
      top: "M55,300 L55,232 Q60,202 100,196 L208,188 L284,142 Q300,132 326,132 L368,132 Q394,134 420,160 L446,186 L525,200 Q552,206 552,240 L552,300",
      win: "M228,188 L290,148 Q302,142 326,142 L364,142 Q384,144 402,162 L424,188 Z",
      lines: "M330,142 L330,188 M330,198 L330,284 M524,216 L548,220 M60,214 L84,212"
    },
    kei: {
      wr: 205, wf: 405, r: 34,
      top: "M140,300 L140,152 Q140,94 180,92 L380,90 Q405,90 418,112 L455,172 Q468,186 468,216 L468,300",
      win: "M162,166 L168,110 L376,106 Q394,106 404,124 L432,166 Z",
      lines: "M270,108 L270,166 M300,176 L300,282 M440,196 L464,198"
    }
  };

  /* bare = just the car, no paper, grid or ground line (hero road) */
  function carSVG(body, bare) {
    var s = SHAPES[body] || SHAPES.sedan;
    var a = s.r + 10;
    var bottom =
      " L" + (s.wf + a) + ",300" +
      " A" + a + "," + a + " 0 0 0 " + (s.wf - a) + ",300" +
      " L" + (s.wr + a) + ",300" +
      " A" + a + "," + a + " 0 0 0 " + (s.wr - a) + ",300 Z";
    var wheel = function (x) {
      var cy = 352 - s.r;
      return '<circle cx="' + x + '" cy="' + cy + '" r="' + s.r + '"/>' +
             '<circle cx="' + x + '" cy="' + cy + '" r="' + Math.round(s.r * 0.45) + '"/>' +
             '<circle cx="' + x + '" cy="' + cy + '" r="3" fill="#161616"/>';
    };
    if (bare) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 80 520 280" aria-hidden="true">' +
        '<g fill="#ffffff" stroke="#161616" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">' +
          '<path d="' + s.top + bottom + '"/>' +
          '<path d="' + s.win + '" stroke-width="5"/>' +
          wheel(s.wr) + wheel(s.wf) +
        '</g></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" role="img" aria-hidden="true">' +
      '<rect width="600" height="450" fill="#f4f4f2"/>' +
      '<g fill="none" stroke="#e3e3e0" stroke-width="1">' +
        '<path d="M0,90 H600 M0,180 H600 M0,270 H600 M150,0 V450 M300,0 V450 M450,0 V450"/>' +
      '</g>' +
      '<path d="M24,352 H576" stroke="#161616" stroke-width="1" stroke-dasharray="8 7"/>' +
      '<g fill="none" stroke="#161616" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">' +
        '<path d="' + s.top + bottom + '"/>' +
        '<path d="' + s.win + '" stroke-width="1.8"/>' +
        '<path d="' + s.lines + '" stroke-width="1.6"/>' +
        wheel(s.wr) + wheel(s.wf) +
      '</g>' +
      '</svg>';
  }

  function money(gbp, ccy) {
    if (ccy === "JPY") {
      return "¥" + (Math.round(gbp * GBP_TO_JPY / 1000) * 1000).toLocaleString("en-GB");
    }
    return "£" + gbp.toLocaleString("en-GB");
  }

  window.JCC = {
    vehicles: vehicles,
    bodies: bodies,
    carSVG: carSVG,
    money: money,
    GBP_TO_JPY: GBP_TO_JPY
  };
})();
