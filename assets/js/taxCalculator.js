/*
  taxCalculator.js – ToolsApp 2.0
  --------------------------------------------------------------------
  Logic for tax.html (Income-tax calculator):
    • SARS 2024/25 PAYE brackets + primary rebate
    • Calculates annual & monthly tax, net income, avg rate
    • Optional deductions field (pre-tax)
    • Toggles monthly view
    • Renders a simple Chart.js bar chart (tax vs net)
    • Saves last inputs in localStorage
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* =====================================================
       0. Constants – SARS 2024/25 brackets & rebate
       ===================================================== */
    const BRACKETS_2025 = [
      { upTo: 237_100, rate: 0.18, base: 0 },
      { upTo: 370_500, rate: 0.26, base: 42_678 },
      { upTo: 512_800, rate: 0.31, base: 77_362 },
      { upTo: 673_000, rate: 0.36, base: 121_475 },
      { upTo: 857_900, rate: 0.39, base: 179_147 },
      { upTo: 1_817_000, rate: 0.41, base: 251_258 },
      { upTo: Infinity, rate: 0.45, base: 644_489 },
    ];
    const PRIMARY_REBATE = 17_235;

    const storageKey = 'taxCalcDraft';

    /* =====================================================
       1. Element refs
       ===================================================== */
    const form = document.getElementById('taxForm');
    if (!form) return; // Abort if on different page

    const outTax = document.getElementById('annualTax');
    const outNet = document.getElementById('annualNet');
    const outAvgRate = document.getElementById('avgRate');

    const outTaxM = document.getElementById('monthlyTax');
    const outNetM = document.getElementById('monthlyNet');

    const monthlySection = document.getElementById('monthlySection');
    const chartCanvas = document.getElementById('taxChart');

    let taxChart;

    /* =====================================================
       2. Helpers
       ===================================================== */
    const num = (v) => parseFloat(v) || 0;
    const fmt = (v) => formatZAR(v);

    function calcTax(income) {
      // Find bracket
      for (let i = 0; i < BRACKETS_2025.length; i++) {
        if (income <= BRACKETS_2025[i].upTo) {
          const { rate, base, upTo } = BRACKETS_2025[i];
          const taxablePortion = income - (i === 0 ? 0 : BRACKETS_2025[i - 1].upTo);
          const tax = base + taxablePortion * rate;
          return Math.max(tax - PRIMARY_REBATE, 0);
        }
      }
      return 0; // fallback
    }

    /* =====================================================
       3. Main calculate
       ===================================================== */
    function calculate() {
      const income = num(form.elements.annualIncome.value);
      const deductions = num(form.elements.deductions.value);
      const taxable = Math.max(income - deductions, 0);

      const tax = calcTax(taxable);
      const netAnnual = income - deductions - tax;
      const avgRate = taxable ? (tax / taxable) * 100 : 0;

      // Update outputs
      outTax.textContent = fmt(tax);
      outNet.textContent = fmt(netAnnual);
      outAvgRate.textContent = avgRate.toFixed(1) + ' %';

      // Monthly
      outTaxM.textContent = fmt(tax / 12);
      outNetM.textContent = fmt(netAnnual / 12);

      // Chart
      renderChart(income, netAnnual, tax);

      monthlySection.hidden = !form.elements.showMonthly.checked;

      // Save draft
      saveDraft();
    }

    function renderChart(gross, net, tax) {
      if (!chartCanvas) return;
      if (taxChart) taxChart.destroy();
      taxChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels: ['Gross', 'Tax', 'Net'],
          datasets: [
            {
              label: 'Amount (R)',
              data: [gross, tax, net],
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => fmt(ctx.raw),
              },
            },
          },
          scales: {
            y: {
              ticks: {
                callback: (v) => 'R' + (v / 1000) + 'k',
              },
            },
          },
        },
      });
    }

    /* =====================================================
       4. Persistence
       ===================================================== */
    function saveDraft() {
      const data = Object.fromEntries(new FormData(form).entries());
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
    function loadDraft() {
      const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!data) return;
      Object.entries(data).forEach(([k, v]) => {
        if (form.elements[k]) form.elements[k].value = v;
      });
    }

    /* =====================================================
       5. UI events
       ===================================================== */
    form.querySelector('#calculateBtn').addEventListener('click', calculate);
    form.addEventListener('reset', () => {
      setTimeout(() => {
        outTax.textContent = outNet.textContent = outAvgRate.textContent = '—';
        outTaxM.textContent = outNetM.textContent = '—';
        monthlySection.hidden = true;
        if (taxChart) taxChart.destroy();
        localStorage.removeItem(storageKey);
      }, 0);
    });

    // Monthly toggle
    form.elements.showMonthly?.addEventListener('change', (e) => {
      monthlySection.hidden = !e.target.checked;
    });

    /* =====================================================
       6. Init
       ===================================================== */
    loadDraft();
  });
})();