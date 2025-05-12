/*
  converters.js – ToolsApp 2.0
  --------------------------------------------------------------
  Handles logic for converters.html:
    • Currency, length, weight, volume, temperature, fuel conversions
    • Populates unit <select> elements dynamically
    • Converts on input / select change and on form submit
    • Swap‑button for currency
    • Persists last‑used units in localStorage
    • All rates/factors are static and editable in this file.
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* ====================================================
       1. Static data – edit here to refresh rates/factors
       ==================================================== */
    // Currency: 1 ZAR → foreign
    const CURRENCY_RATES = {
      ZAR: 1,
      USD: 0.055,
      EUR: 0.051,
      GBP: 0.044,
    };

    // Length factors to metres
    const LENGTH_FACTORS = {
      m: 1,
      km: 1000,
      cm: 0.01,
      mm: 0.001,
      ft: 0.3048,
      in: 0.0254,
      mi: 1609.34,
    };

    // Weight factors to kilograms
    const WEIGHT_FACTORS = {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495,
    };

    // Volume factors to litres
    const VOLUME_FACTORS = {
      L: 1,
      mL: 0.001,
      gal: 3.78541, // US gallon
      qt: 0.946353,
    };

    /* ====================================================
       2. Helper functions
       ==================================================== */
    const num = (v) => parseFloat(v) || 0;
    const storageKey = 'converterPrefs';

    function loadPrefs() {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    }
    function savePrefs(prefs) {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    }

    const prefs = loadPrefs();

    /* ====================================================
       3. Currency converter
       ==================================================== */
    const curForm = document.querySelector('.currency-form');
    if (curForm) {
      const selFrom = curForm.querySelector('#currencyFrom');
      const selTo = curForm.querySelector('#currencyTo');
      const amountIn = curForm.querySelector('#currencyAmount');
      const out = curForm.querySelector('#currencyResult');

      // Populate select options
      Object.keys(CURRENCY_RATES).forEach((code) => {
        selFrom.appendChild(new Option(code, code));
        selTo.appendChild(new Option(code, code));
      });
      selFrom.value = prefs.curFrom || 'ZAR';
      selTo.value = prefs.curTo || 'USD';

      function convertCurrency() {
        const amt = num(amountIn.value);
        const from = selFrom.value;
        const to = selTo.value;
        const result = amt / CURRENCY_RATES[from] * CURRENCY_RATES[to];
        out.textContent = result.toFixed(2);
        prefs.curFrom = from;
        prefs.curTo = to;
        savePrefs(prefs);
      }
      curForm.addEventListener('input', convertCurrency);
      curForm.querySelector('#swapCurrencyBtn').addEventListener('click', () => {
        [selFrom.value, selTo.value] = [selTo.value, selFrom.value];
        convertCurrency();
      });
    }

    /* ====================================================
       4. Generic unit converter builder
       ==================================================== */
    function setupUnitConverter({ formSelector, fromSel, toSel, valueIn, resultOut, factors, prefKeyFrom, prefKeyTo }) {
      const form = document.querySelector(formSelector);
      if (!form) return;
      const selFrom = form.querySelector(fromSel);
      const selTo = form.querySelector(toSel);
      const valInput = form.querySelector(valueIn);
      const out = form.querySelector(resultOut);

      Object.keys(factors).forEach((unit) => {
        selFrom.appendChild(new Option(unit, unit));
        selTo.appendChild(new Option(unit, unit));
      });
      selFrom.value = prefs[prefKeyFrom] || Object.keys(factors)[0];
      selTo.value = prefs[prefKeyTo] || Object.keys(factors)[1];

      function convert() {
        const amt = num(valInput.value);
        const from = selFrom.value;
        const to = selTo.value;
        const result = amt * (factors[from] / factors[to]);
        out.textContent = result.toFixed(4);
        prefs[prefKeyFrom] = from;
        prefs[prefKeyTo] = to;
        savePrefs(prefs);
      }
      form.addEventListener('input', convert);
    }

    // Length
    setupUnitConverter({
      formSelector: '.length-form',
      fromSel: '#lengthFrom',
      toSel: '#lengthTo',
      valueIn: '#lengthValue',
      resultOut: '#lengthResult',
      factors: LENGTH_FACTORS,
      prefKeyFrom: 'lenFrom',
      prefKeyTo: 'lenTo',
    });

    // Weight
    setupUnitConverter({
      formSelector: '.weight-form',
      fromSel: '#weightFrom',
      toSel: '#weightTo',
      valueIn: '#weightValue',
      resultOut: '#weightResult',
      factors: WEIGHT_FACTORS,
      prefKeyFrom: 'wtFrom',
      prefKeyTo: 'wtTo',
    });

    // Volume
    setupUnitConverter({
      formSelector: '.volume-form',
      fromSel: '#volumeFrom',
      toSel: '#volumeTo',
      valueIn: '#volumeValue',
      resultOut: '#volumeResult',
      factors: VOLUME_FACTORS,
      prefKeyFrom: 'volFrom',
      prefKeyTo: 'volTo',
    });

    /* ====================================================
       5. Temperature converter (C/F only)
       ==================================================== */
    const tempForm = document.querySelector('.temperature-form');
    if (tempForm) {
      const valIn = tempForm.querySelector('#tempValue');
      const selFrom = tempForm.querySelector('#tempFrom');
      const out = tempForm.querySelector('#tempResult');

      selFrom.value = prefs.tempFrom || 'c';

      function convertTemp() {
        const v = num(valIn.value);
        const from = selFrom.value;
        let res = 0;
        if (from === 'c') res = v * 9 / 5 + 32; // °C → °F
        else res = (v - 32) * 5 / 9;           // °F → °C
        out.textContent = res.toFixed(2);
        prefs.tempFrom = from;
        savePrefs(prefs);
      }
      tempForm.addEventListener('input', convertTemp);
    }

    /* ====================================================
       6. Fuel consumption converter
       ==================================================== */
    const fuelForm = document.querySelector('.fuel-form');
    if (fuelForm) {
      const valIn = fuelForm.querySelector('#fuelValue');
      const selFrom = fuelForm.querySelector('#fuelFrom');
      const out = fuelForm.querySelector('#fuelResult');

      selFrom.value = prefs.fuelFrom || 'l100';

      function convertFuel() {
        const v = num(valIn.value);
        const from = selFrom.value;
        let result = 0;
        if (from === 'l100') {
          // L/100 km → km/L and MPG (UK)
          result = 100 / v; // km/L
          out.textContent = `${result.toFixed(2)} km/L`;
        } else if (from === 'kml') {
          // km/L → L/100 km
          result = 100 / v;
          out.textContent = `${result.toFixed(2)} L/100 km`;
        } else if (from === 'mpg') {
          // MPG (UK) → L/100 km formula
          result = 282.48 / v;
          out.textContent = `${result.toFixed(2)} L/100 km`;
        }
        prefs.fuelFrom = from;
        savePrefs(prefs);
      }
      fuelForm.addEventListener('input', convertFuel);
    }
  });
})();
