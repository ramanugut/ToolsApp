// Constants and Tax Brackets
const saTaxBrackets = [
  { min: 0, max: 237100, rate: 18, baseAmount: 0 },
  { min: 237101, max: 370500, rate: 26, baseAmount: 42678 },
  { min: 370501, max: 512800, rate: 31, baseAmount: 77362 },
  { min: 512801, max: 673000, rate: 36, baseAmount: 121475 },
  { min: 673001, max: 857900, rate: 39, baseAmount: 179147 },
  { min: 857901, max: 1817000, rate: 41, baseAmount: 251258 },
  { min: 1817001, max: Infinity, rate: 45, baseAmount: 644489 },
];

const UIF_RATE = 0.01;
const MAX_UIF_MONTHLY = 177.12;
const MED_AID_TAX_CREDIT = 364.0; // Monthly medical aid tax credit for 2024

// DOM Elements
const domElements = {
  // Company Details
  companyLogo: document.getElementById("companyLogo"),
  companyName: document.getElementById("companyName"),
  companyAddress: document.getElementById("companyAddress"),
  poBox: document.getElementById("poBox"),

  // Employee Details
  employeeName: document.getElementById("employeeName"),
  employeeId: document.getElementById("employeeId"),
  idNumber: document.getElementById("idNumber"),
  designation: document.getElementById("designation"),
  department: document.getElementById("department"),
  payPoint: document.getElementById("payPoint"),
  children: document.getElementById("children"),
  sex: document.getElementById("sex"),
  status: document.getElementById("status"),

  // Employment Details
  hourlyRate: document.getElementById("hourlyRate"),
  normalHours: document.getElementById("normalHours"),
  leaveDays: document.getElementById("leaveDays"),

  // Earnings
  basicSalary: document.getElementById("basicSalary"),
  otherBonus: document.getElementById("otherBonus"),
  overtimeHours: document.getElementById("overtimeHours"),
  overtimeRate: document.getElementById("overtimeRate"),

  // Deductions
  medicalAid: document.getElementById("medicalAid"),
  pensionFund: document.getElementById("pensionFund"),

  // Period
  paymentDate: document.getElementById("paymentDate"),

  // Buttons and Display
  calculateBtn: document.getElementById("calculateBtn"),
  generatePdfBtn: document.getElementById("generatePdfBtn"),
  resultsSection: document.querySelector(".results-section"),
  logoPreview: document.querySelector(".logo-preview"),

  // Style Elements
  payslipStyle: document.getElementById("payslipStyle"),
  primaryColor: document.getElementById("primaryColor"),
  secondaryColor: document.getElementById("secondaryColor"),
  accentColor: document.getElementById("accentColor"),
  stylePreviews: document.querySelectorAll(".preview-card"),
};

// Global Variables
let logoData = null;

// Utility Functions
function formatCurrency(amount) {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function validateInputs() {
  const requiredFields = ["basicSalary", "employeeName", "employeeId"];
  const missingFields = [];

  requiredFields.forEach((field) => {
    if (!domElements[field].value) {
      missingFields.push(field.replace(/([A-Z])/g, " $1").toLowerCase());
      domElements[field].classList.add("error");
    } else {
      domElements[field].classList.remove("error");
    }
  });

  if (missingFields.length > 0) {
    alert(
      `Please fill in the following required fields: ${missingFields.join(
        ", "
      )}`
    );
    return false;
  }
  return true;
}

// Logo Handling
domElements.companyLogo.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5000000) {
      // 5MB limit
      alert("File size too large. Please choose an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      logoData = e.target.result;
      domElements.logoPreview.innerHTML = `<img src="${logoData}" alt="Company Logo">`;
    };
    reader.onerror = function () {
      alert("Error reading file. Please try again.");
    };
    reader.readAsDataURL(file);
  }
});

// Tax Calculations
function calculateTax(annualIncome) {
  const bracket = saTaxBrackets.find(
    (b) => annualIncome > b.min && annualIncome <= b.max
  );
  if (!bracket) return 0;

  const taxableAmountAboveMin = annualIncome - bracket.min;
  const taxOnExcess = (taxableAmountAboveMin * bracket.rate) / 100;
  const annualTax = bracket.baseAmount + taxOnExcess;
  return annualTax / 12; // Convert to monthly
}

function calculatePayslip() {
  if (!validateInputs()) return null;

  // Get basic values
  const basicSalary = parseFloat(domElements.basicSalary.value) || 0;
  const otherBonus = parseFloat(domElements.otherBonus.value) || 0;
  const hourlyRate = parseFloat(domElements.hourlyRate.value) || 0;
  const overtimeHours = parseFloat(domElements.overtimeHours.value) || 0;
  const overtimeRate = parseFloat(domElements.overtimeRate.value) || 1;

  // Calculate overtime amount
  const overtimeAmount = overtimeHours * hourlyRate * overtimeRate;

  // Calculate gross income
  const grossIncome = basicSalary + otherBonus + overtimeAmount;
  const annualGross = grossIncome * 12;

  // Calculate PAYE
  const monthlyTax = calculateTax(annualGross);

  // Medical Aid
  const medicalAid = parseFloat(domElements.medicalAid.value) || 0;
  const medicalAidTaxCredit = MED_AID_TAX_CREDIT;

  // UIF
  const uif = Math.min(grossIncome * UIF_RATE, MAX_UIF_MONTHLY);

  // Pension Fund
  const pensionFund = parseFloat(domElements.pensionFund.value) || 0;

  // Calculate final tax after medical aid tax credit
  const finalTax = Math.max(0, monthlyTax - medicalAidTaxCredit);

  // Calculate total deductions
  const totalDeductions = finalTax + uif + medicalAid + pensionFund;

  // Calculate net pay
  const netPay = grossIncome - totalDeductions;

  return {
    // Earnings
    basicSalary,
    otherBonus,
    overtimeHours,
    overtimeAmount,
    grossIncome,

    // Deductions
    medicalAid,
    medicalAidTaxCredit,
    finalTax,
    uif,
    pensionFund,
    totalDeductions,

    // Final amounts
    netPay,

    // Other details
    hourlyRate,
    normalHours: parseFloat(domElements.normalHours.value) || 0,
    leaveDays: parseFloat(domElements.leaveDays.value) || 0,
  };
}

// Style Handling
function updatePayslipStyle() {
  const style = domElements.payslipStyle.value;
  const primaryColor = domElements.primaryColor.value;
  const secondaryColor = domElements.secondaryColor.value;
  const accentColor = domElements.accentColor.value;

  // Update preview cards
  domElements.stylePreviews.forEach((preview) => {
    preview.classList.remove("selected");
    if (preview.dataset.style === style) {
      preview.classList.add("selected");
    }
  });

  // Update CSS variables
  document.documentElement.style.setProperty("--primary-color", primaryColor);
  document.documentElement.style.setProperty(
    "--secondary-color",
    secondaryColor
  );
  document.documentElement.style.setProperty("--accent-color", accentColor);

  // Update payslip if it exists
  const payslip = document.getElementById("payslip-pdf");
  if (payslip) {
    payslip.className = `payslip-container payslip-${style}`;
  }
}
// PaySlip HTML Generation
function generatePayslipHTML(calculations) {
  const style = domElements.payslipStyle.value;
  const date = domElements.paymentDate.value
    ? new Date(domElements.paymentDate.value).toLocaleDateString("en-ZA")
    : new Date().toLocaleDateString("en-ZA");

  return `
      <div class="payslip-container payslip-${style}" id="payslip-pdf">
          <!-- Company Header -->
          <div class="payslip-header">
              ${
                logoData
                  ? `<div class="logo-container">
                       <img src="${logoData}" alt="Company Logo" style="max-height: 100px;">
                     </div>`
                  : ""
              }
              <div class="company-info">
                  <h2>${domElements.companyName.value || "Company Name"}</h2>
                  <p>${domElements.companyAddress.value || ""}</p>
                  <p>PO Box: ${domElements.poBox.value || ""}</p>
              </div>
          </div>

          <!-- PaySlip Title -->
          <div class="payslip-title">
              <h2>PAYSLIP</h2>
              <p class="pay-period">Pay Period: ${date}</p>
          </div>

          <!-- Employee Information -->
          <div class="employee-info">
              <div class="info-grid">
                  <div class="info-item">
                      <strong>Employee Name:</strong>
                      <span>${domElements.employeeName.value}</span>
                  </div>
                  <div class="info-item">
                      <strong>Employee No:</strong>
                      <span>${domElements.employeeId.value}</span>
                  </div>
                  <div class="info-item">
                      <strong>ID Number:</strong>
                      <span>${domElements.idNumber.value}</span>
                  </div>
                  <div class="info-item">
                      <strong>Designation:</strong>
                      <span>${domElements.designation.value}</span>
                  </div>
                  <div class="info-item">
                      <strong>Department:</strong>
                      <span>${domElements.department.value}</span>
                  </div>
                  <div class="info-item">
                      <strong>Pay Point:</strong>
                      <span>${domElements.payPoint.value}</span>
                  </div>
                  <div class="info-item">
                      <strong>Normal Hours:</strong>
                      <span>${calculations.normalHours}</span>
                  </div>
                  <div class="info-item">
                      <strong>Leave Days Due:</strong>
                      <span>${calculations.leaveDays}</span>
                  </div>
              </div>
          </div>

          <!-- Earnings and Deductions Grid -->
          <div class="payslip-grid">
              <!-- Earnings Section -->
              <div class="payslip-section earnings">
                  <h3>Earnings</h3>
                  <div class="details-list">
                      <div class="detail-row">
                          <span>Basic Salary</span>
                          <span>${formatCurrency(
                            calculations.basicSalary
                          )}</span>
                      </div>
                      <div class="detail-row">
                          <span>Other Bonus</span>
                          <span>${formatCurrency(
                            calculations.otherBonus
                          )}</span>
                      </div>
                      <div class="detail-row">
                          <span>Overtime @ ${
                            domElements.overtimeRate.value || 1
                          }</span>
                          <span>${formatCurrency(
                            calculations.overtimeAmount
                          )}</span>
                      </div>
                      <div class="detail-row total">
                          <span>Total Earnings</span>
                          <span>${formatCurrency(
                            calculations.grossIncome
                          )}</span>
                      </div>
                  </div>
              </div>

              <!-- Deductions Section -->
              <div class="payslip-section deductions">
                  <h3>Deductions</h3>
                  <div class="details-list">
                      <div class="detail-row">
                          <span>PAYE</span>
                          <span>${formatCurrency(calculations.finalTax)}</span>
                      </div>
                      <div class="detail-row">
                          <span>UIF Contribution</span>
                          <span>${formatCurrency(calculations.uif)}</span>
                      </div>
                      <div class="detail-row">
                          <span>Medical Aid</span>
                          <span>${formatCurrency(
                            calculations.medicalAid
                          )}</span>
                      </div>
                      ${
                        calculations.pensionFund > 0
                          ? `
                      <div class="detail-row">
                          <span>Pension Fund</span>
                          <span>${formatCurrency(
                            calculations.pensionFund
                          )}</span>
                      </div>
                      `
                          : ""
                      }
                      <div class="detail-row total">
                          <span>Total Deductions</span>
                          <span>${formatCurrency(
                            calculations.totalDeductions
                          )}</span>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Net Pay Section -->
          <div class="net-pay">
              <h3>Net Pay</h3>
              <div class="net-amount">${formatCurrency(
                calculations.netPay
              )}</div>
          </div>

          <!-- Footer -->
          <div class="payslip-footer">
              <p>This is a computer-generated document. No signature is required.</p>
              <p>Generated on: ${new Date().toLocaleString("en-ZA")}</p>
          </div>
      </div>
  `;
}

// PDF Generation
async function generatePDF() {
  const payslipElement = document.querySelector("#payslip-pdf");

  if (!payslipElement) {
    alert("Please calculate payslip first");
    return;
  }

  try {
    // Create canvas
    const canvas = await html2canvas(payslipElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    // Create PDF
    const pdf = new jspdf.jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add image to PDF
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

    // Save PDF
    pdf.save(`payslip-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Error generating PDF. Please try again.");
  }
}

// Update your button event listener
document
  .getElementById("generatePdfBtn")
  .addEventListener("click", async function (e) {
    e.preventDefault();

    // Show loading message
    const loadingElement = document.createElement("div");
    loadingElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 9999;
  `;
    loadingElement.textContent = "Generating PDF...";
    document.body.appendChild(loadingElement);

    try {
      await generatePDF();
      document.body.removeChild(loadingElement);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate PDF. Please try again.");
      document.body.removeChild(loadingElement);
    }
  });

// Update the event listener for the generate PDF button
document
  .getElementById("generatePdfBtn")
  .addEventListener("click", function (e) {
    e.preventDefault(); // Prevent any default form submission
    generatePDF();
  });

// Event Listeners
domElements.calculateBtn.addEventListener("click", function () {
  const calculations = calculatePayslip();
  if (calculations) {
    domElements.resultsSection.innerHTML = generatePayslipHTML(calculations);
    domElements.resultsSection.style.display = "block";
    // Scroll to results
    domElements.resultsSection.scrollIntoView({ behavior: "smooth" });
  }
});

domElements.generatePdfBtn.addEventListener("click", generatePDF);

// Style-related event listeners
domElements.payslipStyle.addEventListener("change", updatePayslipStyle);
domElements.primaryColor.addEventListener("input", updatePayslipStyle);
domElements.secondaryColor.addEventListener("input", updatePayslipStyle);
domElements.accentColor.addEventListener("input", updatePayslipStyle);

// Preview card click handlers
domElements.stylePreviews.forEach((preview) => {
  preview.addEventListener("click", () => {
    domElements.payslipStyle.value = preview.dataset.style;
    updatePayslipStyle();
  });
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  // Hide results section initially
  domElements.resultsSection.style.display = "none";

  // Set today's date as default for payment date
  const today = new Date().toISOString().split("T")[0];
  domElements.paymentDate.value = today;

  // Initialize payslip style
  updatePayslipStyle();

  // Add error class to required fields
  const requiredFields = ["basicSalary", "employeeName", "employeeId"];
  requiredFields.forEach((field) => {
    domElements[field].required = true;
    domElements[field].addEventListener("input", function () {
      this.classList.remove("error");
    });
  });
});
