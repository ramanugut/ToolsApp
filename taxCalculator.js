document.addEventListener("DOMContentLoaded", function () {
  // Tax Brackets for 2024/25 (Source: SARS)
  const TAX_BRACKETS = [
    { min: 0, max: 237100, rate: 18, baseAmount: 0 },
    { min: 237101, max: 370500, rate: 26, baseAmount: 42678 },
    { min: 370501, max: 512800, rate: 31, baseAmount: 77362 },
    { min: 512801, max: 673000, rate: 36, baseAmount: 121475 },
    { min: 673001, max: 857900, rate: 39, baseAmount: 179147 },
    { min: 857901, max: 1817000, rate: 41, baseAmount: 251258 },
    { min: 1817001, max: Infinity, rate: 45, baseAmount: 644489 },
  ];

  // Tax Rebates for 2024/25
  const TAX_REBATES = {
    primary: 17235, // Primary rebate (all ages)
    secondary: 9444, // Secondary rebate (65 years and older)
    tertiary: 3145, // Tertiary rebate (75 years and older)
  };

  // Tax Thresholds for 2024/25
  const TAX_THRESHOLDS = {
    below65: 95750, // Below age 65
    age65to74: 148217, // Age 65 to 74
    age75andOver: 165689, // Age 75 and over
  };

  const UIF_RATE = 0.01; // 1%
  const MAX_UIF_MONTHLY = 177.12;

  let taxChart = null;

  // Get DOM Elements
  const calculateBtn = document.getElementById("calculateTaxBtn");
  const incomeInput = document.getElementById("incomeAmount");
  const periodSelect = document.getElementById("periodSelect");
  const bonusInput = document.getElementById("bonusAmount");
  const overtimeInput = document.getElementById("overtimeAmount");
  const ageSelect = document.getElementById("ageSelect");
  const resultsDiv = document.getElementById("results");

  // Utility Functions
  function formatCurrency(amount) {
    return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }

  function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
  }

  function convertToAnnual(amount, period) {
    switch (period) {
      case "hour":
        return amount * 8 * 22 * 12; // Assuming 8 hours/day, 22 days/month
      case "day":
        return amount * 22 * 12; // Assuming 22 working days/month
      case "week":
        return amount * 52;
      case "biweek":
        return amount * 26;
      case "month":
        return amount * 12;
      case "year":
        return amount;
      default:
        return amount * 12;
    }
  }

  function calculateRebates(age) {
    let totalRebate = TAX_REBATES.primary;

    if (age >= 65) {
      totalRebate += TAX_REBATES.secondary;
    }

    if (age >= 75) {
      totalRebate += TAX_REBATES.tertiary;
    }

    return totalRebate;
  }

  function calculateTax(annualIncome, age) {
    // Check if income is below tax threshold for age group
    const threshold =
      age >= 75
        ? TAX_THRESHOLDS.age75andOver
        : age >= 65
        ? TAX_THRESHOLDS.age65to74
        : TAX_THRESHOLDS.below65;

    if (annualIncome <= threshold) {
      return 0;
    }

    // Find applicable tax bracket
    const bracket = TAX_BRACKETS.find(
      (b) => annualIncome > b.min && annualIncome <= b.max
    );
    if (!bracket) return 0;

    // Calculate base tax
    const taxableAmountAboveMin = annualIncome - bracket.min;
    const taxOnExcess = (taxableAmountAboveMin * bracket.rate) / 100;
    const baseTax = bracket.baseAmount + taxOnExcess;

    // Apply rebates
    const rebates = calculateRebates(age);

    // Return final tax (cannot be less than 0)
    return Math.max(0, baseTax - rebates);
  }

  function calculateMarginalRate(annualIncome) {
    const bracket = TAX_BRACKETS.find(
      (b) => annualIncome > b.min && annualIncome <= b.max
    );
    return bracket ? bracket.rate : 0;
  }

  function createTaxChart(netPay, totalTax) {
    const ctx = document.getElementById("taxChart");

    if (taxChart) {
      taxChart.destroy();
    }

    taxChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Net Pay", "Total Tax"],
        datasets: [
          {
            data: [netPay, totalTax],
            backgroundColor: [
              "#2563eb", // Blue for net pay
              "#0ea5e9", // Light Blue for tax
            ],
            borderColor: ["#ffffff", "#ffffff"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              font: {
                size: 14,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.raw;
                const total = netPay + totalTax;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(
                  value
                )} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  function calculateResults() {
    const age = parseInt(ageSelect.value);
    const period = periodSelect.value;
    const income = parseFloat(incomeInput.value) || 0;
    const bonus = parseFloat(bonusInput.value) || 0;
    const overtime = parseFloat(overtimeInput.value) || 0;

    if (income === 0) {
      alert("Please enter an income amount");
      return;
    }

    // Calculate annual amounts
    // Continuing the calculateResults function...
    // Calculate annual amounts
    const totalIncome = income + bonus + overtime;
    const annualIncome = convertToAnnual(totalIncome, period);
    const monthlyIncome = annualIncome / 12;

    // Calculate tax with age consideration
    const annualTax = calculateTax(annualIncome, age);
    const monthlyTax = annualTax / 12;

    // Calculate UIF
    const monthlyUIF = Math.min(monthlyIncome * UIF_RATE, MAX_UIF_MONTHLY);
    const annualUIF = monthlyUIF * 12;

    // Calculate totals
    const totalMonthlyDeductions = monthlyTax + monthlyUIF;
    const totalAnnualDeductions = annualTax + annualUIF;
    const monthlyNetPay = monthlyIncome - totalMonthlyDeductions;
    const annualNetPay = annualIncome - totalAnnualDeductions;

    // Calculate rates
    const marginalRate = calculateMarginalRate(annualIncome);
    const averageRate = (totalAnnualDeductions / annualIncome) * 100;

    // Update results
    document.getElementById("annualSalary").textContent =
      formatCurrency(annualIncome);
    document.getElementById("monthlySalary").textContent =
      formatCurrency(monthlyIncome);
    document.getElementById("monthlyPAYE").textContent =
      formatCurrency(monthlyTax);
    document.getElementById("monthlyUIF").textContent =
      formatCurrency(monthlyUIF);
    document.getElementById("monthlyTotalTax").textContent = formatCurrency(
      totalMonthlyDeductions
    );
    document.getElementById("monthlyNetPay").textContent =
      formatCurrency(monthlyNetPay);
    document.getElementById("marginalRate").textContent =
      formatPercentage(marginalRate);
    document.getElementById("averageRate").textContent =
      formatPercentage(averageRate);

    // Create/update chart
    createTaxChart(annualNetPay, totalAnnualDeductions);

    // Update summary
    const summaryText = `If you make ${formatCurrency(
      annualIncome
    )} a year living in South Africa, you will be taxed ${formatCurrency(
      totalAnnualDeductions
    )}. That means that your net pay will be ${formatCurrency(
      annualNetPay
    )} per year, or ${formatCurrency(
      monthlyNetPay
    )} per month. Your average tax rate is ${formatPercentage(
      averageRate
    )} and your marginal tax rate is ${formatPercentage(
      marginalRate
    )}. This marginal tax rate means that your immediate additional income will be taxed at this rate. For instance, an increase of R 100 in your salary will be taxed R ${marginalRate.toFixed(
      2
    )}, hence, your net pay will only increase by R ${(
      100 - marginalRate
    ).toFixed(2)}.`;

    document.getElementById("summaryText").textContent = summaryText;

    // Show results with animation
    resultsDiv.style.display = "block";
    // Force reflow
    resultsDiv.offsetHeight;
    resultsDiv.classList.add("show");
  }

  // Event Listeners
  calculateBtn.addEventListener("click", calculateResults);

  // Add event listeners for Enter key
  [incomeInput, bonusInput, overtimeInput].forEach((input) => {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        calculateResults();
      }
    });
  });

  // Update placeholders when period changes
  periodSelect.addEventListener("change", function (e) {
    const period = e.target.value;
    const placeholder =
      period.charAt(0).toUpperCase() + period.slice(1) + "ly amount";

    incomeInput.placeholder = placeholder;
    bonusInput.placeholder = placeholder + " (Optional)";
    overtimeInput.placeholder = placeholder + " (Optional)";
  });

  // Initialize placeholder text
  periodSelect.dispatchEvent(new Event("change"));
});
