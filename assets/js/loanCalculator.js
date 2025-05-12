/*
  loanCalculator.js – ToolsApp 2.0
  ---------------------------------------------------------------
  Handles logic for loan.html:
    • Calculates repayment per period (with optional extra payment)
    • Builds full amortisation schedule until balance paid off
    • Outputs summary + payoff date
    • Renders principal balance line chart via Chart.js
    • Populates amortisation table
    • Supports print & PDF (html2canvas + jsPDF)
    • Persists last form inputs in localStorage
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* =======================
       Element references
       ======================= */
    const form = document.getElementById('loanForm');
    if (!form) return; // Safety guard

    const out = {
      pay: document.getElementById('paymentPerPeriod'),
      interest: document.getElementById('totalInterest'),
      total: document.getElementById('totalPaid'),
      payoffDate: document.getElementById('payoffDate'),
    };

    const resultsSection = document.querySelector('.results');
    const amortTableBody = document.querySelector('#amortTable tbody');
    const chartCanvas = document.getElementById('amortChart');
    let balanceChart;

    const storageKey = 'loanCalcDraft';

    /* =======================
       Helper functions
       ======================= */
    const num = (v) => parseFloat(v) || 0;
    const fmt = (v) => formatZAR(v);

    const FREQ_MAP = {
      monthly: { periods: 12, days: 30 },
      fortnightly: { periods: 26, days: 14 },
      weekly: { periods: 52, days: 7 },
    };

    /* =======================
       Core calculation
       ======================= */
    function calculate() {
      const principal = num(form.elements.loanAmount.value);
      const annualRatePct = num(form.elements.interestRate.value);
      const years = num(form.elements.loanTerm.value);
      const freqKey = form.elements.repaymentFreq.value;
      const extra = num(form.elements.extraPayment.value);

      const freqInfo = FREQ_MAP[freqKey] || FREQ_MAP.monthly;
      const periodsPerYear = freqInfo.periods;
      const i = (annualRatePct / 100) / periodsPerYear; // periodic interest rate
      const n = years * periodsPerYear;

      // Standard payment (annuity formula)
      const stdPayment = (principal * i) / (1 - Math.pow(1 + i, -n));
      const payment = stdPayment + extra;

      // Build schedule
      let balance = principal;
      let totalInterest = 0;
      let totalPaid = 0;
      let period = 0;
      const schedule = [];

      const today = new Date();

      while (balance > 0 && period < n + 1000) { // safety upper bound
        const interest = balance * i;
        let principalPayment = payment - interest;
        if (payment >= balance + interest) {
          // last payment tweak
          principalPayment = balance;
        }
        balance -= principalPayment;
        totalInterest += interest;
        totalPaid += principalPayment + interest;

        schedule.push({
          period: period + 1,
          payment: principalPayment + interest,
          principal: principalPayment,
          interest,
          balance: Math.max(balance, 0),
        });

        period++;
        if (period > 2000) break; // avoid infinite loop
      }

      // Payoff date
      const payoffDate = addPeriods(today, period, freqKey);

      // Update outputs
      out.pay.textContent = fmt(payment);
      out.interest.textContent = fmt(totalInterest);
      out.total.textContent = fmt(totalPaid);
      out.payoffDate.textContent = payoffDate.toLocaleDateString();

      // Populate table & chart
      populateTable(schedule);
      renderChart(schedule);

      resultsSection.hidden = false;

      // Save draft
      saveDraft();
    }

    function addPeriods(date, periods, freqKey) {
      const d = new Date(date);
      switch (freqKey) {
        case 'weekly':
          d.setDate(d.getDate() + periods * 7);
          break;
        case 'fortnightly':
          d.setDate(d.getDate() + periods * 14);
          break;
        default: // monthly
          d.setMonth(d.getMonth() + periods);
      }
      return d;
    }

    /* =======================
       Table & chart
       ======================= */
    function populateTable(schedule) {
      amortTableBody.innerHTML = '';
      schedule.forEach((row, idx) => {
        if (idx > 600) return; // table cap for performance
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.period}</td>
          <td>${fmt(row.payment)}</td>
          <td>${fmt(row.principal)}</td>
          <td>${fmt(row.interest)}</td>
          <td>${fmt(row.balance)}</td>`;
        amortTableBody.appendChild(tr);
      });
    }

    function renderChart(schedule) {
      const balances = schedule.map((r) => r.balance);
      const labels = schedule.map((r) => r.period);
      if (balanceChart) balanceChart.destroy();
      balanceChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Balance',
              data: balances,
              fill: false,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => fmt(ctx.raw) },
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

    /* =======================
       Persistence
       ======================= */
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

    /* =======================
       Actions & events
       ======================= */
    form.querySelector('#calculateBtn').addEventListener('click', calculate);

    form.addEventListener('reset', () => {
      setTimeout(() => {
        Object.values(out).forEach((o) => (o.textContent = '—'));
        resultsSection.hidden = true;
        amortTableBody.innerHTML = '';
        if (balanceChart) balanceChart.destroy();
        localStorage.removeItem(storageKey);
      }, 0);
    });

    // Print results
    form.querySelector('#printBtn').addEventListener('click', () => {
      if (resultsSection.hidden) calculate();
      const printWin = window.open('', '_blank');
      printWin.document.write(`<link rel="stylesheet" href="assets/css/styles.css">`);
      printWin.document.write(`<link rel="stylesheet" href="assets/css/components.css">`);
      printWin.document.write(resultsSection.outerHTML);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
    });

    // Download PDF
    form.querySelector('#downloadPdfBtn').addEventListener('click', async () => {
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
      pdf.save('Loan_Amortisation.pdf');
    });

    /* =======================
       Init on load
       ======================= */
    loadDraft();
  });
})();