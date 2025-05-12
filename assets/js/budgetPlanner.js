/*
  budgetPlanner.js – ToolsApp 2.0
  ------------------------------------------------------------
  Logic for budget.html (50/30/20 planner):
    • Splits net income into target buckets
    • Sums dynamic expense entries per bucket
    • Warns if bucket exceeds target
    • Outputs summary + pie chart + detail table
    • Generates CSV download
    • Persists last inputs in localStorage
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* ============
       Elements
       ============ */
    const form = document.getElementById('budgetForm');
    if (!form) return;

    const out = {
      needs: document.getElementById('needsTotal'),
      wants: document.getElementById('wantsTotal'),
      savings: document.getElementById('savingsTotal'),
    };

    const warning = document.getElementById('overspendWarning');
    const chartCanvas = document.getElementById('budgetChart');
    const detailBody = document.querySelector('#budgetTable tbody');
    const resultsSection = document.querySelector('.results');

    let pieChart;
    const storageKey = 'budgetPlannerDraft';

    /* ============
       Helpers
       ============ */
    const num = (v) => parseFloat(v) || 0;
    const fmt = (v) => formatZAR(v);

    function gatherRows(containerId) {
      const rows = [];
      document.querySelectorAll(`#${containerId} .row`).forEach((row) => {
        const [descInput, amtInput] = row.querySelectorAll('input');
        const desc = descInput.value.trim();
        const amt = num(amtInput.value);
        if (desc && amt) rows.push({ desc, amt });
      });
      return rows;
    }

    /* ============
       Calculate
       ============ */
    function calculate() {
      const income = num(form.elements.netIncome.value);
      if (!income) {
        alert('Please enter net income.');
        return;
      }

      // Gather expenses
      const needsRows = gatherRows('needsContainer');
      const wantsRows = gatherRows('wantsContainer');
      const savingsRows = gatherRows('savingsContainer');

      const totals = {
        needs: needsRows.reduce((t, r) => t + r.amt, 0),
        wants: wantsRows.reduce((t, r) => t + r.amt, 0),
        savings: savingsRows.reduce((t, r) => t + r.amt, 0),
      };

      // Targets
      const targets = {
        needs: income * 0.5,
        wants: income * 0.3,
        savings: income * 0.2,
      };

      // Update outputs
      out.needs.textContent = fmt(totals.needs) + ` / ${fmt(targets.needs)}`;
      out.wants.textContent = fmt(totals.wants) + ` / ${fmt(targets.wants)}`;
      out.savings.textContent = fmt(totals.savings) + ` / ${fmt(targets.savings)}`;

      // Overspend check
      const overspend = Object.keys(totals).some((k) => totals[k] > targets[k]);
      warning.hidden = !overspend;

      // Chart
      renderChart(totals, income);

      // Detail table
      buildDetailTable(needsRows, wantsRows, savingsRows);

      resultsSection.hidden = false;

      // Save draft
      saveDraft();
    }

    /* ============
       Chart & table
       ============ */
    function renderChart(totals, income) {
      if (!chartCanvas) return;
      if (pieChart) pieChart.destroy();
      pieChart = new Chart(chartCanvas, {
        type: 'pie',
        data: {
          labels: ['Needs', 'Wants', 'Savings/Debt'],
          datasets: [{
            data: [totals.needs, totals.wants, totals.savings],
          }],
        },
        options: {
          plugins: {
            tooltip: {
              callbacks: { label: (ctx) => ctx.label + ': ' + fmt(ctx.raw) },
            },
          },
        },
      });
    }

    function buildDetailTable(needsRows, wantsRows, savingsRows) {
      detailBody.innerHTML = '';
      const pack = [
        ['Needs', needsRows],
        ['Wants', wantsRows],
        ['Savings/Debt', savingsRows],
      ];
      pack.forEach(([cat, rows]) => {
        rows.forEach((r) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${cat}</td><td>${r.desc}</td><td>${fmt(r.amt)}</td>`;
          detailBody.appendChild(tr);
        });
      });
    }

    /* ============
       CSV download
       ============ */
    function downloadCSV() {
      const rows = [['Category', 'Description', 'Amount']];
      document.querySelectorAll('#budgetTable tbody tr').forEach((tr) => {
        const cols = Array.from(tr.children).map((td) => td.textContent);
        rows.push(cols);
      });
      const csvContent = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Budget.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    /* ============
       Persistence
       ============ */
    function saveDraft() {
      const data = Object.fromEntries(new FormData(form).entries());
      // Also save dynamic lists separately
      data.needsRows = gatherRows('needsContainer');
      data.wantsRows = gatherRows('wantsContainer');
      data.savingsRows = gatherRows('savingsContainer');
      localStorage.setItem(storageKey, JSON.stringify(data));
    }

    function loadDraft() {
      const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!data) return;
      Object.entries(data).forEach(([k, v]) => {
        if (form.elements[k]) form.elements[k].value = v;
      });
      // rebuild list rows
      rebuildList('needsContainer', data.needsRows);
      rebuildList('wantsContainer', data.wantsRows);
      rebuildList('savingsContainer', data.savingsRows);
    }

    function rebuildList(containerId, rows = []) {
      const container = document.getElementById(containerId);
      rows.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `
          <input type="text" value="${r.desc}" required>
          <input type="number" value="${r.amt}" step="0.01" required>
          <button type="button" class="remove-row" aria-label="Remove">&times;</button>`;
        container.appendChild(div);
      });
    }

    /* ============
       Events
       ============ */
    form.querySelector('#calculateBtn').addEventListener('click', calculate);

    form.querySelector('#downloadCsvBtn').addEventListener('click', downloadCSV);

    form.addEventListener('reset', () => {
      setTimeout(() => {
        Object.values(out).forEach((o) => (o.textContent = 'R0.00'));
        warning.hidden = true;
        resultsSection.hidden = true;
        detailBody.innerHTML = '';
        if (pieChart) pieChart.destroy();
        localStorage.removeItem(storageKey);
      }, 0);
    });

    /* ============
       Init
       ============ */
    loadDraft();
  });
})();
