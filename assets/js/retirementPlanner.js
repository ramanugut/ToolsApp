/*
  retirementPlanner.js – ToolsApp 2.0
  ------------------------------------------------------------------
  Logic for retirement.html:
    • Projects nest‑egg value at retirement with monthly compounding
      (annual return – fee) and monthly contributions.
    • Calculates real (inflation‑adjusted) value if toggle is on.
    • Gives 4 %‑rule monthly drawdown estimate.
    • Renders growth chart (line) and yearly projection table.
    • Saves / loads last inputs in localStorage.
    • Supports print+PDF buttons like other calculators.
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* ============================
       Element refs & constants
       ============================ */
    const form = document.getElementById('retirementForm');
    if (!form) return;

    const out = {
      nestEgg: document.getElementById('nestEgg'),
      realValue: document.getElementById('realValue'),
      draw: document.getElementById('monthlyDraw'),
    };

    const chartCanvas = document.getElementById('growthChart');
    const tableBody = document.querySelector('#projectionTable tbody');
    const resultsSection = document.querySelector('.results');

    let growthChart;
    const storageKey = 'retirePlannerDraft';

    /* ============================
       Helpers
       ============================ */
    const num = (v) => parseFloat(v) || 0;
    const fmt = (v) => formatZAR(v);

    function monthsBetween(ageNow, retireAge) {
      return Math.max((retireAge - ageNow) * 12, 0);
    }

    /* ============================
       Core calculation
       ============================ */
    function calculate() {
      const ageNow = num(form.elements.currentAge.value);
      const retireAge = num(form.elements.retirementAge.value);
      if (!ageNow || !retireAge || retireAge <= ageNow) {
        alert('Check ages: retirement age must be greater than current age.');
        return;
      }

      const months = monthsBetween(ageNow, retireAge);
      const currentSavings = num(form.elements.currentSavings.value);
      const contrib = num(form.elements.monthlyContribution.value);
      const annualReturn = num(form.elements.annualReturn.value) / 100;
      const inflation = num(form.elements.inflationRate.value) / 100;
      const fee = num(form.elements.feeRate.value) / 100;
      const adjInflation = form.elements.adjustForInflation.checked;

      const monthlyReturn = (annualReturn - fee) / 12;

      // Arrays to hold yearly projection
      const balances = [];
      const years = months / 12;

      let balance = currentSavings;
      for (let m = 1; m <= months; m++) {
        balance = balance * (1 + monthlyReturn) + contrib;
        if (m % 12 === 0) {
          balances.push(balance);
        }
      }

      const nestEgg = balance;
      const realValue = adjInflation ? nestEgg / Math.pow(1 + inflation, years) : nestEgg;
      const monthlyDraw = nestEgg * 0.04 / 12;

      // Outputs
      out.nestEgg.textContent = fmt(nestEgg);
      out.realValue.textContent = fmt(realValue);
      out.draw.textContent = fmt(monthlyDraw);

      // Build table (yearly rows)
      buildTable(ageNow, currentSavings, contrib, annualReturn - fee, balances);

      // Chart
      renderChart(balances, adjInflation ? inflation : null);

      resultsSection.hidden = false;

      // Save form inputs
      saveDraft();
    }

    /* ============================
       Table & chart builders
       ============================ */
    function buildTable(startAge, startBalance, monthlyContrib, netAnnualReturn, balances) {
      tableBody.innerHTML = '';
      let prevBalance = startBalance;
      balances.forEach((bal, idx) => {
        const year = idx + 1;
        const age = startAge + year;
        const contribYear = monthlyContrib * 12;
        const growth = bal - prevBalance - contribYear;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${year}</td>
          <td>${age}</td>
          <td>${fmt(prevBalance)}</td>
          <td>${fmt(contribYear)}</td>
          <td>${fmt(growth)}</td>
          <td>${fmt(bal)}</td>`;
        tableBody.appendChild(tr);
        prevBalance = bal;
      });
    }

    function renderChart(balances, inflationRate) {
      if (!chartCanvas) return;
      if (growthChart) growthChart.destroy();
      const labels = balances.map((_, i) => 'Year ' + (i + 1));
      const datasets = [
        {
          label: 'Nominal balance',
          data: balances,
          fill: false,
        },
      ];
      if (inflationRate !== null) {
        const realBalances = balances.map((b, i) => b / Math.pow(1 + inflationRate, i + 1));
        datasets.push({ label: 'Real balance', data: realBalances, fill: false, borderDash: [4, 4] });
      }
      growthChart = new Chart(chartCanvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          plugins: {
            tooltip: {
              callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fmt(ctx.raw) },
            },
          },
          scales: {
            y: {
              ticks: { callback: (v) => 'R' + (v / 1000) + 'k' },
            },
          },
        },
      });
    }

    /* ============================
       Persistence helpers
       ============================ */
    function saveDraft() {
      const data = Object.fromEntries(new FormData(form).entries());
      localStorage.setItem(storageKey, JSON.stringify(data));
    }

    function loadDraft() {
      const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!data) return;
      Object.entries(data).forEach(([k, v]) => {
        if (form.elements[k]) {
          if (form.elements[k].type === 'checkbox') {
            form.elements[k].checked = v === 'on' || v === true;
          } else {
            form.elements[k].value = v;
          }
        }
      });
    }

    /* ============================
       Print & PDF
       ============================ */
    function printResults() {
      if (resultsSection.hidden) calculate();
      const printWin = window.open('', '_blank');
      printWin.document.write(`<link rel="stylesheet" href="assets/css/styles.css">`);
      printWin.document.write(`<link rel="stylesheet" href="assets/css/components.css">`);
      printWin.document.write(resultsSection.outerHTML);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
    }

    async function downloadPDF() {
      if (resultsSection.hidden) calculate();
      if (!window.html2canvas || !window.jspdf) {
        alert('PDF library not loaded.');
        return;
      }
      const canvas = await html2canvas(resultsSection, { backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save('Retirement_Projection.pdf');
    }

    /* ============================
       Event bindings
       ============================ */
    form.querySelector('#calculateBtn').addEventListener('click', calculate);
    form.querySelector('#printBtn').addEventListener('click', printResults);
    form.querySelector('#downloadPdfBtn').addEventListener('click', downloadPDF);

    form.addEventListener('reset', () => {
      setTimeout(() => {
        Object.values(out).forEach((el) => (el.textContent = 'R0.00'));
        tableBody.innerHTML = '';
        resultsSection.hidden = true;
        if (growthChart) growthChart.destroy();
        localStorage.removeItem(storageKey);
      }, 0);
    });

    /* ============================
       Init on load
       ============================ */
    loadDraft();
  });
})();
