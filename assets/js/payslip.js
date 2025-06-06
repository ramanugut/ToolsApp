/*
  payslip.js – ToolsApp 2.0
  ---------------------------------
  Provides logic for payslip.html:
    • Calculate gross, deductions, net
    • Update summary outputs
    • Build printable/PDF preview
    • Persist last-used values in localStorage
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* ===============
       Grab elements
       =============== */
    const form = document.getElementById('payslipForm');
    const summaryEls = {
      gross: document.getElementById('grossEarnings'),
      deductions: document.getElementById('totalDeductions'),
      net: document.getElementById('netPay'),
    };

    const preview = document.getElementById('payslipPreview');
    const pv = {
      companyName: document.getElementById('pvCompanyName'),
      companyAddress: document.getElementById('pvCompanyAddress'),
      companyContact: document.getElementById('pvCompanyContact'),
      employeeName: document.getElementById('pvEmployeeName'),
      employeeId: document.getElementById('pvEmployeeId'),
      employeeNumber: document.getElementById('pvEmployeeNumber'),
      payPeriod: document.getElementById('pvPayPeriod'),
      tableBody: document.getElementById('pvTableBody'),
      gross: document.getElementById('pvGross'),
      deductions: document.getElementById('pvDeductions'),
      net: document.getElementById('pvNet'),
    };

    /* ===============
       Helper funcs
       =============== */
    const num = (v) => parseFloat(v) || 0;

    const storageKey = 'payslipDraft';

    // SARS 2024/25 tax brackets and rebate
    const TAX_BRACKETS = [
      { upTo: 237100, rate: 0.18 },
      { upTo: 370500, rate: 0.26 },
      { upTo: 512800, rate: 0.31 },
      { upTo: 673000, rate: 0.36 },
      { upTo: 857900, rate: 0.39 },
      { upTo: 1817000, rate: 0.41 },
      { upTo: Infinity, rate: 0.45 },
    ];
    const PRIMARY_REBATE = 17235;

    function calcAnnualTax(income) {
      let tax = 0;
      let prev = 0;
      for (const { upTo, rate } of TAX_BRACKETS) {
        const portion = Math.min(income, upTo) - prev;
        if (portion <= 0) break;
        tax += portion * rate;
        prev = upTo;
      }
      return Math.max(tax - PRIMARY_REBATE, 0);
    }

    function saveDraft() {
      const data = Object.fromEntries(new FormData(form).entries());
      localStorage.setItem(storageKey, JSON.stringify(data));
    }

    function loadDraft() {
      const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!data) return;
      Object.entries(data).forEach(([k, v]) => {
        const el = form.elements[k];
        if (el) el.value = v;
      });
    }

    function sumContainer(containerId) {
      let total = 0;
      document.querySelectorAll(`#${containerId} .row input[type="number"]`).forEach((inpt) => {
        total += num(inpt.value);
      });
      return total;
    }

    function gatherItems(containerId) {
      const rows = [];
      document.querySelectorAll(`#${containerId} .row`).forEach((row) => {
        const [descInput, amtInput] = row.querySelectorAll('input');
        const desc = descInput.value.trim();
        const amt = num(amtInput.value);
        if (desc && amt) rows.push({ desc, amt });
      });
      return rows;
    }

    /* ===============
       Core calculate
       =============== */
    function calculate() {
      // Basic inputs
      const basicSalary = num(form.elements.basicSalary.value);
      let paye = num(form.elements.paye.value);
      const uif = num(form.elements.uif.value);
      const autoPaye = form.elements.autoPaye?.checked;

      // Dynamic lists
      const allowances = gatherItems('allowancesContainer');
      const deductionsExtra = gatherItems('deductionsContainer');

      // Totals
      const allowanceTotal = allowances.reduce((t, r) => t + r.amt, 0);
      const gross = basicSalary + allowanceTotal;

      if (autoPaye) {
        const annual = gross * 12;
        paye = calcAnnualTax(annual) / 12;
        form.elements.paye.value = paye.toFixed(2);
      }

      const deductionsTotal = paye + uif + deductionsExtra.reduce((t, r) => t + r.amt, 0);
      const net = gross - deductionsTotal;

      // Update summary UI
      summaryEls.gross.textContent = formatZAR(gross);
      summaryEls.deductions.textContent = formatZAR(deductionsTotal);
      summaryEls.net.textContent = formatZAR(net);

      // Build preview
      buildPreview({ basicSalary, allowances, paye, uif, deductionsExtra, gross, deductionsTotal, net });

      // Save
      saveDraft();
    }

    /* ===============
       Build preview
       =============== */
    function buildPreview({ basicSalary, allowances, paye, uif, deductionsExtra, gross, deductionsTotal, net }) {
      pv.companyName.textContent = form.elements.companyName.value;
      pv.companyAddress.textContent = form.elements.companyAddress.value;
      pv.companyContact.textContent = form.elements.companyContact.value;

      pv.employeeName.textContent = form.elements.employeeName.value;
      pv.employeeId.textContent = form.elements.employeeId.value;
      pv.employeeNumber.textContent = form.elements.employeeNumber.value;
      pv.payPeriod.textContent = form.elements.payPeriod.value;

      // Clear table body
      pv.tableBody.innerHTML = '';

      // Build arrays with base entries
      const earningsRows = [{ desc: 'Basic salary', amt: basicSalary }, ...allowances];
      const deductionRows = [
        ...(paye ? [{ desc: 'PAYE', amt: paye }] : []),
        ...(uif ? [{ desc: 'UIF', amt: uif }] : []),
        ...deductionsExtra,
      ];

      const len = Math.max(earningsRows.length, deductionRows.length);
      for (let i = 0; i < len; i++) {
        const earn = earningsRows[i] || { desc: '', amt: '' };
        const ded = deductionRows[i] || { desc: '', amt: '' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${earn.desc}</td><td>${earn.amt === '' ? '' : formatZAR(earn.amt)}</td>
          <td>${ded.desc}</td><td>${ded.amt === '' ? '' : formatZAR(ded.amt)}</td>`;
        pv.tableBody.appendChild(tr);
      }

      pv.gross.textContent = formatZAR(gross);
      pv.deductions.textContent = formatZAR(deductionsTotal);
      pv.net.textContent = formatZAR(net);

      preview.hidden = false;
    }

    /* ===============
       Actions
       =============== */
    form.querySelector('#calculateBtn').addEventListener('click', calculate);
    form.addEventListener('reset', () => {
      setTimeout(() => {
        preview.hidden = true;
        summaryEls.gross.textContent = summaryEls.deductions.textContent = summaryEls.net.textContent = 'R0.00';
        localStorage.removeItem(storageKey);
      }, 0);
    });

    // Print preview only
    form.querySelector('#printBtn').addEventListener('click', () => {
      if (preview.hidden) calculate();
      const printWin = window.open('', '_blank');
      printWin.document.write(`<link rel="stylesheet" href="assets/css/styles.css">`);
      printWin.document.write(`<link rel="stylesheet" href="assets/css/components.css">`);
      printWin.document.write(preview.innerHTML);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
    });

    // Download PDF (requires html2canvas + jsPDF in libs)
    form.querySelector('#downloadPdfBtn').addEventListener('click', async () => {
      if (preview.hidden) calculate();
      if (!window.html2canvas || !window.jspdf) {
        alert('PDF library not loaded.');
        return;
      }
      const canvas = await html2canvas(preview, { backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Payslip_${form.elements.employeeName.value || 'employee'}.pdf`);
    });

    /* ===============
       Init
       =============== */
    loadDraft();
  });
})();
