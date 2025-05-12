/*
  invoiceGenerator.js – ToolsApp 2.0
  ------------------------------------------------------------------
  Logic for invoice.html:
    • Adds/removes dynamic line‑item rows (handled globally by main.js)
    • Calculates subtotal, optional 15% VAT, and grand total
    • Builds invoice preview section and supports print/PDF download
    • Saves last inputs & logo (base64) in localStorage for reuse
    • Implements professional invoice styling for print
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* ============================
       Element references
       ============================ */
    const form = document.getElementById('invoiceForm');
    if (!form) return; // exit if on another page

    const out = {
      subTotal: document.getElementById('subTotal'),
      vat: document.getElementById('vatTotal'),
      grand: document.getElementById('grandTotal'),
    };

    const preview = document.getElementById('invoicePreview');
    const pv = {
      logo: document.getElementById('pvLogo'),
      bizName: document.getElementById('pvBizName'),
      bizContact: document.getElementById('pvBizContact'),
      bizVat: document.getElementById('pvBizVat'),
      clientName: document.getElementById('pvClientName'),
      clientContact: document.getElementById('pvClientContact'),
      invoiceNumber: document.getElementById('pvInvoiceNumber'),
      invoiceDate: document.getElementById('pvInvoiceDate'),
      dueDate: document.getElementById('pvDueDate'),
      items: document.getElementById('pvItems'),
      subTotal: document.getElementById('pvSubTotal'),
      vat: document.getElementById('pvVat'),
      grandTotal: document.getElementById('pvGrandTotal'),
      vatRow: document.getElementById('pvVatRow'),
    };

    const VAT_RATE = 0.15;
    const storageKey = 'invoiceDraft';

    // Initial row creation
    createInitialRows();

    /* ============================
       Helpers
       ============================ */
    const num = (v) => parseFloat(v) || 0;
    const fmt = (v) => formatZAR(v);

    function gatherItems() {
      const items = [];
      document.querySelectorAll('#itemsContainer .row').forEach((row) => {
        // Get all inputs in the row
        const inputs = row.querySelectorAll('input');
        
        // If we have fewer than 2 inputs, this row isn't valid
        if (inputs.length < 2) return;
        
        let desc, qty, rate;
        
        // Handle both 2-input (main.js) and 3-input (custom) structures
        if (inputs.length >= 3) {
          // Our custom 3-input structure
          desc = inputs[0].value.trim();
          qty = num(inputs[1].value) || 1; // Default to 1 if not specified
          rate = num(inputs[2].value);
        } else {
          // Original 2-input structure from main.js
          desc = inputs[0].value.trim();
          rate = num(inputs[1].value);
          qty = 1; // Default quantity
        }
        
        if (desc && rate) {
          items.push({ 
            desc, 
            qty, 
            rate, 
            total: qty * rate 
          });
        }
      });
      
      return items;
    }

    function createInitialRows() {
      // Create at least one empty row if none exist
      const container = document.getElementById('itemsContainer');
      if (container && container.querySelectorAll('.row').length === 0) {
        createItemRow(container);
      }
    }

    function createItemRow(container) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <input type="text" placeholder="Item description" required>
        <input type="number" min="1" step="1" placeholder="Quantity" required>
        <input type="number" min="0" step="0.01" placeholder="Rate (R)" required>
        <button type="button" class="remove-row" aria-label="Remove">
          <i class="material-icons">delete</i>
        </button>`;
      container.appendChild(row);
      return row;
    }

    /* ============================
       Calculation & preview
       ============================ */
    function calculate() {
      const items = gatherItems();
      
      // For debugging
      console.log("Items gathered:", items);
      if (items.length === 0) {
        console.log("No valid items found. Row structure might be incorrect.");
        const rows = document.querySelectorAll('#itemsContainer .row');
        console.log("Number of rows found:", rows.length);
        if (rows.length > 0) {
          console.log("First row structure:", rows[0].innerHTML);
          console.log("First row inputs:", rows[0].querySelectorAll('input').length);
        }
      }
      
      if (!items.length) {
        alert('Please add at least one line item.');
        return;
      }

      const subtotal = items.reduce((t, i) => t + i.total, 0);
      const includeVat = form.elements.includeVat.checked;
      const vat = includeVat ? subtotal * VAT_RATE : 0;
      const grandTotal = subtotal + vat;

      // Update summary outputs
      out.subTotal.textContent = fmt(subtotal);
      out.vat.textContent = fmt(vat);
      out.grand.textContent = fmt(grandTotal);
      document.getElementById('vatRow').style.display = includeVat ? '' : 'none';

      // Build preview
      buildPreview(items, { subtotal, vat, grandTotal, includeVat });

      // Save draft
      saveDraft();
    }

    function buildPreview(items, totals) {
      // Biz & client details
      pv.bizName.textContent = form.elements.bizName.value || 'Business Name';
      
      // Handle multiline text for bizContact with proper line breaks
      const bizContactText = form.elements.bizContact.value || '';
      pv.bizContact.innerHTML = bizContactText.replace(/\n/g, '<br>');
      
      // VAT number handling
      const vatNumber = form.elements.bizVat.value;
      pv.bizVat.textContent = vatNumber ? `VAT #: ${vatNumber}` : '';
      pv.bizVat.style.display = vatNumber ? 'block' : 'none';

      // Client information with proper line breaks
      pv.clientName.textContent = form.elements.clientName.value || 'Client Name';
      const clientContactText = form.elements.clientContact.value || '';
      pv.clientContact.innerHTML = clientContactText.replace(/\n/g, '<br>');

      // Invoice details
      pv.invoiceNumber.textContent = form.elements.invoiceNumber.value || 'INV-0001';
      
      // Format dates for better display
      const invoiceDate = form.elements.invoiceDate.value;
      const dueDate = form.elements.dueDate.value;
      
      pv.invoiceDate.textContent = formatDate(invoiceDate);
      pv.dueDate.textContent = formatDate(dueDate);

      // Logo
      const logoData = localStorage.getItem('invoiceLogoData');
      if (logoData) {
        pv.logo.src = logoData;
        pv.logo.style.display = 'block';
      } else {
        pv.logo.style.display = 'none';
      }

      // Table rows
      pv.items.innerHTML = '';
      items.forEach((it, index) => {
        const tr = document.createElement('tr');
        // Add alternating row class for better readability
        tr.className = index % 2 === 0 ? 'even-row' : 'odd-row';
        
        tr.innerHTML = `
          <td>${it.desc}</td>
          <td class="text-center">${it.qty}</td>
          <td class="text-right">${fmt(it.rate)}</td>
          <td class="text-right">${fmt(it.total)}</td>`;
        pv.items.appendChild(tr);
      });

      // Totals with proper formatting
      pv.subTotal.textContent = fmt(totals.subtotal);
      pv.vat.textContent = fmt(totals.vat);
      pv.vatRow.style.display = totals.includeVat ? 'table-row' : 'none';
      pv.grandTotal.textContent = fmt(totals.grandTotal);

      // Add current date and invoice number to invoice
      const currentDate = new Date().toLocaleDateString('en-ZA');
      document.querySelector('.invoice-header').setAttribute('data-generated', `Generated: ${currentDate}`);

      preview.hidden = false;
    }

    /* ============================
       Format helpers
       ============================ */
    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-ZA', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      } catch (e) {
        return dateString; // Fallback to original string if parsing fails
      }
    }

    /* ============================
       Logo image handling
       ============================ */
    form.elements.bizLogo.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file size (max 300KB)
      if (file.size > 300 * 1024) {
        alert('Logo file is too large. Please use an image less than 300KB.');
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file type
      if (!file.type.match('image.*')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        e.target.value = ''; // Clear the input
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        localStorage.setItem('invoiceLogoData', reader.result);
        
        // Show a preview of the logo in the form
        const logoPreview = document.createElement('div');
        logoPreview.className = 'logo-preview';
        logoPreview.innerHTML = `
          <img src="${reader.result}" alt="Logo preview" style="max-height: 50px; max-width: 200px;">
          <p>Logo saved successfully!</p>
        `;
        
        // Replace any existing preview
        const existingPreview = form.querySelector('.logo-preview');
        if (existingPreview) {
          existingPreview.remove();
        }
        
        // Insert after the file input
        const fileInput = form.elements.bizLogo.parentNode;
        fileInput.parentNode.insertBefore(logoPreview, fileInput.nextSibling);
        
        // Alert for confirmation
        alert('Logo saved – it will appear on all future invoices.');
      };
      reader.readAsDataURL(file);
    });

    /* ============================
       Persistence
       ============================ */
    function saveDraft() {
      // Gather form data for storage
      const formData = {};
      
      // Save text and number inputs
      form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], textarea, select').forEach(el => {
        if (el.id && el.value) {
          formData[el.id] = el.value;
        }
      });
      
      // Save checkbox states
      form.querySelectorAll('input[type="checkbox"]').forEach(el => {
        if (el.id) {
          formData[el.id] = el.checked;
        }
      });
      
      // Save line items separately
      formData.lineItems = gatherItems();
      
      // Store in localStorage
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }

    function loadDraft() {
      const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!data) return;
      
      // Restore form fields
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'lineItems') return; // Handle line items separately
        
        const el = form.elements[k];
        if (!el) return;
        
        if (el.type === 'checkbox') {
          el.checked = v;
        } else {
          el.value = v;
        }
      });
      
      // Restore line items
      if (data.lineItems && Array.isArray(data.lineItems) && data.lineItems.length > 0) {
        const container = document.getElementById('itemsContainer');
        
        // Clear existing rows
        container.querySelectorAll('.row').forEach(row => row.remove());
        
        // Add saved line items
        data.lineItems.forEach(item => {
          const row = createItemRow(container);
          const inputs = row.querySelectorAll('input');
          inputs[0].value = item.desc;
          inputs[1].value = item.qty;
          inputs[2].value = item.rate;
        });
      } else {
        // Ensure at least one row exists
        createInitialRows();
      }
    }

    /* ============================
       Print & PDF helpers
       ============================ */
    function printInvoice() {
      if (preview.hidden) calculate();
      
      // Create a new window with improved styling for printing
      const printWin = window.open('', '_blank');
      
      // Add CSS with print-specific styles
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${form.elements.bizName.value || 'Business'}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="assets/css/styles.css">
          <link rel="stylesheet" href="assets/css/components.css">
          <style>
            @media print {
              body {
                font-family: Arial, sans-serif;
                color: #333;
                margin: 0;
                padding: 0;
              }
              .invoice-wrapper {
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                border: 1px solid #ddd;
                box-shadow: none;
              }
              .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                border-bottom: 2px solid #006c5b;
                padding-bottom: 20px;
                position: relative;
              }
              .invoice-header::after {
                content: attr(data-generated);
                position: absolute;
                bottom: 5px;
                right: 0;
                font-size: 10px;
                color: #777;
              }
              .biz-details h2 {
                color: #006c5b;
                margin-bottom: 5px;
              }
              .logo {
                max-height: 80px;
                max-width: 200px;
              }
              .client-details, .invoice-meta {
                margin-bottom: 30px;
              }
              .invoice-meta {
                background-color: #f7f7f7;
                padding: 15px;
                border-radius: 5px;
              }
              .invoice-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              .invoice-table th {
                background-color: #006c5b;
                color: white;
                text-align: left;
                padding: 10px;
                font-weight: normal;
              }
              .invoice-table td {
                padding: 10px;
                border-bottom: 1px solid #ddd;
              }
              .invoice-table .even-row {
                background-color: #f9f9f9;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
              tfoot td {
                padding: 10px;
                border-top: 2px solid #ddd;
                font-weight: bold;
              }
              .net {
                font-weight: bold;
                color: #006c5b;
              }
              .footer-note {
                margin-top: 50px;
                border-top: 1px solid #ddd;
                padding-top: 20px;
                text-align: center;
                font-size: 12px;
                color: #777;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-preview">${preview.innerHTML}</div>
          <div class="footer-note">
            <p>Thank you for your business!</p>
            <p>Created with ToolsApp 2.0</p>
          </div>
        </body>
        </html>
      `);
      
      printWin.document.close();
      
      // Wait for resources to load before printing
      setTimeout(() => {
        printWin.focus();
        printWin.print();
        printWin.close();
      }, 250);
    }

    async function downloadPDF() {
      if (preview.hidden) calculate();
      
      if (!window.html2canvas || !window.jspdf) {
        alert('PDF library not loaded.');
        return;
      }
      
      // Show loading indicator
      const loadingEl = document.createElement('div');
      loadingEl.className = 'loading-overlay';
      loadingEl.innerHTML = '<div class="spinner"></div><p>Generating PDF...</p>';
      document.body.appendChild(loadingEl);
      
      try {
        // Create a clone of the preview with some styling adjustments for PDF
        const pdfPreview = preview.cloneNode(true);
        pdfPreview.hidden = false;
        pdfPreview.style.position = 'absolute';
        pdfPreview.style.left = '-9999px';
        pdfPreview.style.background = 'white';
        pdfPreview.style.padding = '20px';
        document.body.appendChild(pdfPreview);
        
        // Add a footer to the clone
        const footer = document.createElement('div');
        footer.className = 'footer-note';
        footer.innerHTML = '<p>Thank you for your business!</p><p>Created with ToolsApp 2.0</p>';
        pdfPreview.querySelector('.invoice-wrapper').appendChild(footer);
        
        // Render to canvas
        const canvas = await html2canvas(pdfPreview, { 
          backgroundColor: '#fff',
          scale: 2, // Higher resolution
          logging: false
        });
        
        // Remove the clone
        document.body.removeChild(pdfPreview);
        
        // Generate PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Add metadata
        pdf.setProperties({
          title: `Invoice ${form.elements.invoiceNumber.value || 'Draft'}`,
          subject: `Invoice for ${form.elements.clientName.value || 'Client'}`,
          creator: 'ToolsApp 2.0',
          author: form.elements.bizName.value || 'Business'
        });
        
        // Calculate dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        
        const imgX = (pageWidth - imgWidth * ratio) / 2;
        const imgY = 10; // Top margin
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        // Save the PDF
        const fileName = `Invoice_${form.elements.invoiceNumber.value || 'Draft'}.pdf`;
        pdf.save(fileName);
      } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF. Please try again.');
      } finally {
        // Remove loading indicator
        document.body.removeChild(loadingEl);
      }
    }

    /* ============================
       Event listeners
       ============================ */
    // Calculate, print and PDF buttons
    form.querySelector('#calculateBtn').addEventListener('click', calculate);
    form.querySelector('#printBtn').addEventListener('click', printInvoice);
    form.querySelector('#downloadPdfBtn').addEventListener('click', downloadPDF);

    // Use event delegation for both add and remove buttons
    document.addEventListener('click', function(e) {
      // Handle add item button
      if (e.target.closest('#addItemBtn')) {
        const container = document.getElementById('itemsContainer');
        if (container) {
          createItemRow(container);
        }
      }
      
      // Handle remove row button
      if (e.target.closest('.remove-row')) {
        const row = e.target.closest('.row');
        if (row) row.remove();
      }
    });

    form.addEventListener('reset', () => {
      setTimeout(() => {
        Object.values(out).forEach((o) => (o.textContent = 'R0.00'));
        preview.hidden = true;
        
        // Remove the logo preview if present
        const logoPreview = form.querySelector('.logo-preview');
        if (logoPreview) logoPreview.remove();
        
        // Remove all line items except one empty one
        const container = document.getElementById('itemsContainer');
        container.innerHTML = '';
        createItemRow(container);
        
        localStorage.removeItem(storageKey);
      }, 0);
    });

    /* ============================
       Init on load
       ============================ */
    // Add CSS for loading overlay
    const style = document.createElement('style');
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
      }
      .spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .logo-preview {
        display: flex;
        align-items: center;
        margin: 10px 0;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 4px;
      }
      .logo-preview p {
        margin: 0 0 0 10px;
        color: #006c5b;
      }
    `;
    document.head.appendChild(style);
    
    // Load saved data
    loadDraft();
    
    // Check for saved logo and show preview
    const savedLogo = localStorage.getItem('invoiceLogoData');
    if (savedLogo) {
      const logoPreview = document.createElement('div');
      logoPreview.className = 'logo-preview';
      logoPreview.innerHTML = `
        <img src="${savedLogo}" alt="Logo preview" style="max-height: 50px; max-width: 200px;">
        <p>Logo saved</p>
      `;
      
      // Insert after the file input
      const fileInput = form.elements.bizLogo.parentNode;
      fileInput.parentNode.insertBefore(logoPreview, fileInput.nextSibling);
    }
  });
})();