/* =========================================================================
   js/calc.js — Import cost calculator (Japan dealer price → UK dealership)
   Pure arithmetic in JccCalc.compute(), UI binding in initCalculator().
   All sums are carried in JPY at full precision; rounding happens only
   when a figure is printed (JPY to whole yen, GBP to two decimals).
   Settings come from js/calc-config.js (window.JCC_CALC_CONFIG).

   The estimate is shown when the user presses "Start Price Estimate":
   the line-art car drives across the page (Yokohama → Southampton) and
   the figures appear when it arrives. Editing an input afterwards dims
   the figures and asks for another press, so the numbers on screen
   always belong to a deliberate run.
   ========================================================================= */
(function () {
  "use strict";

  var CFG = window.JCC_CALC_CONFIG;

  function findBy(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  /* ---------- arithmetic ----------
     input = { amount, currency: "JPY" | "GBP", rate, size, duty }
     Returns null when the inputs cannot produce a valid estimate. */
  function compute(input, cfg) {
    cfg = cfg || CFG;
    var R = Number(input.rate);
    var amount = Number(input.amount);
    var size = findBy(cfg.vehicleSizes, input.size);
    var duty = findBy(cfg.dutyOptions, input.duty);
    if (!isFinite(R) || R <= 0) return null;
    if (!isFinite(amount) || amount <= 0) return null;
    if (!size || !duty) return null;

    var P = input.currency === "GBP" ? amount * R : amount;   /* vehicle price, JPY */
    var feePct = P * cfg.sourcingFee.rate;
    var feeMin = cfg.sourcingFee.minimumGBP * R;
    var F = Math.max(feePct, feeMin);                          /* our fee */
    var J = cfg.japanPreShipmentJPY;                           /* Japan pre-shipment */
    var H = size.gbp * R;                                      /* ocean freight & insurance */
    var C = P + F + J + H;                                     /* Japan-side subtotal */
    var D = C * duty.rate;                                     /* import duty */
    var U = cfg.ukLocalCostsGBP * R;                           /* UK local costs */
    var L = C + D + U;                                         /* landed, excl. VAT */
    var V = L * cfg.vatRate;                                   /* import VAT */
    var T = L + V;                                             /* cash outlay with VAT */

    return {
      R: R, P: P, F: F, J: J, H: H, C: C, D: D, U: U, L: L, V: V, T: T,
      feeAtMinimum: feeMin > feePct,
      size: size,
      duty: duty
    };
  }

  /* ---------- formatting (display only) ---------- */
  function fmtJPY(n) {
    return "¥" + Math.round(n).toLocaleString("en-GB");
  }

  function fmtGBP(n) {
    return "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(rate) {
    return (Math.round(rate * 1000) / 10) + "%";
  }

  /* ---------- UI ---------- */

  var REDUCED = false;
  try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function ico(name) {
    return '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  var MSG_START = "Enter the vehicle details, then press Start Price Estimate.";

  /* which line-art body drives across the overlay for each size band */
  var DRIVE_BODY = { small: "hatch", sedan: "sedan", sports: "sports", minivan: "minivan", suv: "suv" };
  var MSG_STALE = "Inputs changed — press Start Price Estimate to refresh the figures.";

  /* result rows, in display order; `key` is the field of compute()'s result */
  function rowDefs(cfg) {
    return [
      { key: "P", icon: "car", name: "Vehicle purchase price",
        desc: "The advertised vehicle price you entered, before Japanese domestic registration charges." },
      { key: "F", icon: "fee", name: "Our sourcing & export fee",
        desc: fmtPct(cfg.sourcingFee.rate) + " of the vehicle purchase price, with a minimum fee of £" +
              cfg.sourcingFee.minimumGBP.toLocaleString("en-GB") + " per vehicle." },
      { key: "J", icon: "truck", name: "Japan pre-shipment costs",
        desc: "Estimated domestic transport, export deregistration and documentation, port/yard charges and Japanese export customs clearance." },
      { key: "H", icon: "ship", name: "Ocean freight & insurance",
        desc: "Budget for the selected vehicle size. Marine insurance (£" + cfg.insuranceIncludedGBP +
              ") is already included — do not add it separately. Actual cost varies with dimensions, route and sailing." },
      { key: "C", icon: "sum", name: "Japan-side subtotal including sea freight", subtotal: true,
        desc: "Vehicle price, our fee, pre-shipment costs and freight." },
      { key: "D", icon: "stamp", name: "Estimated import duty",
        desc: "Applied to the Japan-side subtotal at the selected rate. A simplified estimate, not a customs valuation." },
      { key: "U", icon: "dealer", name: "UK local costs",
        desc: "Estimated UK port charges, customs clearance service and inland delivery to your dealership. Excludes import duty and VAT. Not a fee we receive — paid by you directly to UK providers." }
    ];
  }

  function renderLedger(cfg) {
    var ul = $("#calcLedger");
    if (!ul) return;
    ul.innerHTML = rowDefs(cfg).map(function (r, i) {
      return '<li class="calc-row' + (r.subtotal ? " calc-row--sub" : "") + '" data-row="' + r.key + '" style="--i:' + i + '">' +
        ico(r.icon) +
        '<span class="calc-row__name">' + esc(r.name) + '</span>' +
        '<span class="calc-row__gbp" data-out="' + r.key + '-gbp">—</span>' +
        '<span class="calc-row__desc">' + esc(r.desc) + '</span>' +
        '<span class="calc-row__jpy" data-out="' + r.key + '-jpy">—</span>' +
      '</li>';
    }).join("");
  }

  function fillSelect(sel, items, selected, labelFn) {
    sel.innerHTML = items.map(function (it) {
      return '<option value="' + esc(it.key) + '"' + (it.key === selected ? " selected" : "") + ">" +
        esc(labelFn(it)) + "</option>";
    }).join("");
  }

  function readInput(form) {
    return {
      amount: form.elements.calc_amount.value.trim() === "" ? NaN : Number(form.elements.calc_amount.value),
      currency: form.getAttribute("data-currency") || CFG.defaults.currency,
      rate: form.elements.calc_rate.value.trim() === "" ? NaN : Number(form.elements.calc_rate.value),
      size: form.elements.calc_size.value,
      duty: form.elements.calc_duty.value
    };
  }

  /* why the estimate cannot run, in the user's words + the field to fix */
  function problem(input, form) {
    if (!isFinite(input.rate) || input.rate <= 0) {
      return { text: "Enter an exchange rate above zero (JPY per £1).", field: form.elements.calc_rate };
    }
    if (!isFinite(input.amount)) {
      return { text: "Enter the vehicle purchase price to run the estimate.", field: form.elements.calc_amount };
    }
    if (input.amount <= 0) {
      return { text: "The vehicle price must be above zero.", field: form.elements.calc_amount };
    }
    return null;
  }

  function setOut(key, text) {
    $all('[data-out="' + key + '"]').forEach(function (el) { el.textContent = text; });
  }

  var KEYS = ["P", "F", "J", "H", "C", "D", "U", "L", "V", "T"];
  var lastResult = null;

  function showMessage(text, kind) {
    var msg = $("#calcMsg");
    msg.textContent = text || "";
    msg.hidden = !text;
    msg.className = "calc-msg" + (kind ? " calc-msg--" + kind : "");
  }

  function setState(state) {
    var box = $("#calcResults");
    box.classList.remove("is-empty", "is-stale", "is-live");
    box.classList.add("is-" + state);
  }

  function clearFigures() {
    KEYS.forEach(function (k) { setOut(k + "-gbp", "—"); setOut(k + "-jpy", "—"); });
    setOut("rate", "");
    $("#calcFeeNote").hidden = true;
    var total = $('[data-out="L-gbp"]');
    total.classList.remove("odo");
    total.removeAttribute("data-odo-text");
    lastResult = null;
  }

  /* the total rolls like the stock prices do; everything else fades in */
  function rollTotal(text) {
    var el = $('.calc-total__gbp[data-out="L-gbp"]');
    if (!el) return;
    el.classList.remove("odo");
    el.removeAttribute("data-odo-text");
    el.textContent = text;
    if (!REDUCED && window.JccFX && window.JccFX.odometer) window.JccFX.odometer(el);
  }

  function replayReveal() {
    var box = $("#calcResults");
    box.classList.remove("is-animating");
    void box.offsetWidth;
    if (!REDUCED) box.classList.add("is-animating");
  }

  /* the duty hint turns cautionary as soon as 0% is picked — no button needed */
  function syncDutyHint(form) {
    var d = findBy(CFG.dutyOptions, form.elements.calc_duty.value);
    form.classList.toggle("is-duty-zero", !!d && d.rate === 0 && d.key !== CFG.defaults.duty);
  }

  function estimate(form) {
    var input = readInput(form);
    var res = compute(input);
    if (!res) {
      clearFigures();
      setState("empty");
      var p = problem(input, form) || { text: MSG_START, field: null };
      showMessage(p.text, "error");
      if (p.field) p.field.focus();
      return;
    }

    lastResult = res;
    KEYS.forEach(function (k) {
      if (k !== "L") setOut(k + "-gbp", fmtGBP(res[k] / res.R));
      setOut(k + "-jpy", fmtJPY(res[k]));
    });
    rollTotal(fmtGBP(res.L / res.R));
    setOut("rate", "£1 = ¥" + res.R.toLocaleString("en-GB", { maximumFractionDigits: 4 }));
    $("#calcFeeNote").hidden = !res.feeAtMinimum;
    showMessage("");
    setState("live");
    replayReveal();

    /* phones stack inputs above results: bring the figures into view */
    if (window.innerWidth < 960) {
      $("#calcResults").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    }
  }

  /* ---------- the drive ----------
     A light veil covers the page; the car crosses it left to right and
     `done` runs when it arrives (or when the user taps / presses Escape).
     Skipped entirely under prefers-reduced-motion. */
  var driving = false;

  function startDrive(sizeKey, done) {
    var overlay = $("#calcDrive");
    var car = $("#calcDriveCar");
    var startBtn = $("#calcStart");
    if (!overlay || !car || REDUCED || driving) { done(); return; }

    driving = true;
    if (startBtn) startBtn.disabled = true;
    if (window.JCC && window.JCC.carSVG) {
      car.innerHTML = window.JCC.carSVG(DRIVE_BODY[sizeKey] || "minivan", true);
    }
    overlay.hidden = false;
    void overlay.offsetWidth;            /* let the hidden → shown frame paint before animating */
    overlay.classList.add("is-on");
    if (window.JccFX && window.JccFX.scramble) window.JccFX.scramble($("#calcDriveLabel"), 900);

    var finished = false;
    var timer = null;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      car.removeEventListener("animationend", finish);
      overlay.removeEventListener("click", finish);
      document.removeEventListener("keydown", onKey);
      overlay.classList.remove("is-on");
      setTimeout(function () { overlay.hidden = true; }, 320);
      if (startBtn) startBtn.disabled = false;
      driving = false;
      done();
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "Enter") finish(); }

    car.addEventListener("animationend", finish);
    overlay.addEventListener("click", finish);
    document.addEventListener("keydown", onKey);
    timer = setTimeout(finish, 2600);    /* safety net if animationend never fires */
  }

  /* the button: validate first (no drive for an empty form), then drive, then show */
  function runEstimate(form) {
    var input = readInput(form);
    if (!compute(input)) { estimate(form); return; }
    startDrive(input.size, function () { estimate(form); });
  }

  function markStale(form) {
    syncDutyHint(form);
    if (!lastResult) return;
    setState("stale");
    showMessage(MSG_STALE, "stale");
  }

  /* convert the typed amount when the currency switch changes */
  function switchCurrency(form, next) {
    var cur = form.getAttribute("data-currency");
    var field = form.elements.calc_amount;
    if (cur !== next) {
      var rate = Number(form.elements.calc_rate.value);
      var amt = Number(field.value);
      if (field.value.trim() !== "" && isFinite(amt) && isFinite(rate) && rate > 0) {
        field.value = next === "GBP"
          ? (Math.round((amt / rate) * 100) / 100).toString()
          : Math.round(amt * rate).toString();
      }
    }
    form.setAttribute("data-currency", next);
    $all("[data-calc-ccy]", form).forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-calc-ccy") === next ? "true" : "false");
    });
    field.setAttribute("placeholder", next === "GBP" ? "e.g. 2866.03" : "e.g. 599000");
    $("#calcAmountUnit").textContent = next === "GBP" ? "£" : "¥";
    if (cur !== next) markStale(form);
  }

  function summaryText() {
    if (!lastResult) return "";
    var r = lastResult;
    var line = function (name, v) { return name + ": " + fmtGBP(v / r.R) + "  (" + fmtJPY(v) + ")"; };
    return [
      "Samurai Auto Export — import cost estimate (budget figures, not a quotation)",
      "Exchange rate used: £1 = ¥" + r.R + " (editable estimate, not a live rate)",
      "Vehicle size: " + r.size.label + " · Import duty: " + fmtPct(r.duty.rate),
      "",
      line("Vehicle purchase price", r.P),
      line("Our sourcing & export fee", r.F),
      line("Japan pre-shipment costs", r.J),
      line("Ocean freight & insurance", r.H),
      line("Japan-side subtotal including sea freight", r.C),
      line("Estimated import duty", r.D),
      line("UK local costs", r.U),
      line("ESTIMATED TOTAL TO YOUR DEALERSHIP — excluding import VAT", r.L),
      "",
      line("Estimated import VAT (" + fmtPct(CFG.vatRate) + ")", r.V),
      line("Estimated cash outlay if import VAT is paid upfront", r.T),
      "",
      "Final purchase prices, freight, insurance, local charges and taxes must be confirmed before purchase."
    ].join("\n");
  }

  function toast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("is-on"); }, 2600);
  }

  function initCalculator() {
    var form = $("#calcForm");
    if (!form || !CFG) return;

    fillSelect(form.elements.calc_size, CFG.vehicleSizes, CFG.defaults.size, function (s) {
      return s.label + " · £" + s.gbp.toLocaleString("en-GB");
    });
    fillSelect(form.elements.calc_duty, CFG.dutyOptions, CFG.defaults.duty, function (d) { return d.label; });

    var rateField = form.elements.calc_rate;
    rateField.value = String(CFG.exchangeRate["default"]);
    rateField.min = String(CFG.exchangeRate.min);
    rateField.step = String(CFG.exchangeRate.step);

    /* numbers quoted in the static copy come from the config too */
    setOut("cfg-fee-min", "£" + CFG.sourcingFee.minimumGBP.toLocaleString("en-GB"));
    setOut("cfg-fee-rate", fmtPct(CFG.sourcingFee.rate));
    setOut("cfg-insurance", "£" + CFG.insuranceIncludedGBP.toLocaleString("en-GB"));
    setOut("cfg-rate-default", String(CFG.exchangeRate["default"]));
    setOut("vat-rate", fmtPct(CFG.vatRate));

    renderLedger(CFG);
    switchCurrency(form, CFG.defaults.currency);
    $all("[data-calc-ccy]", form).forEach(function (b) {
      b.addEventListener("click", function () { switchCurrency(form, b.getAttribute("data-calc-ccy")); });
    });

    form.addEventListener("input", function () { markStale(form); });
    form.addEventListener("change", function () { markStale(form); });
    form.addEventListener("submit", function (e) { e.preventDefault(); runEstimate(form); });

    $("#calcReset").addEventListener("click", function () {
      form.elements.calc_amount.value = "";
      rateField.value = String(CFG.exchangeRate["default"]);
      form.elements.calc_size.value = CFG.defaults.size;
      form.elements.calc_duty.value = CFG.defaults.duty;
      switchCurrency(form, CFG.defaults.currency);
      syncDutyHint(form);
      clearFigures();
      setState("empty");
      showMessage(MSG_START);
      form.elements.calc_amount.focus();
    });

    $("#calcCopy").addEventListener("click", function () {
      var text = summaryText();
      if (!text) { toast("PRESS START PRICE ESTIMATE FIRST"); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { toast("ESTIMATE COPIED TO CLIPBOARD"); },
          function () { toast("COPY FAILED — PLEASE SELECT THE FIGURES MANUALLY"); });
      } else {
        toast("COPY NOT AVAILABLE IN THIS BROWSER");
      }
    });

    clearFigures();
    setState("empty");
    showMessage(MSG_START);
  }

  /* catalogue hand-off: set the price (JPY) and size, leave the run to the button */
  function prefill(o) {
    var form = $("#calcForm");
    if (!form || !o) return;
    if (isFinite(o.amount) && o.amount > 0) {
      switchCurrency(form, "JPY");
      form.elements.calc_amount.value = String(Math.round(o.amount));
    }
    if (o.size && findBy(CFG.vehicleSizes, o.size)) form.elements.calc_size.value = o.size;
    clearFigures();
    setState("empty");
    showMessage("Vehicle price filled in from the catalogue — check the size, then press Start Price Estimate.", "stale");
  }

  window.JccCalc = {
    prefill: prefill,
    compute: compute,
    fmtJPY: fmtJPY,
    fmtGBP: fmtGBP,
    summaryText: summaryText,
    init: initCalculator
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalculator);
  } else {
    initCalculator();
  }
})();
