import ExcelJS from "exceljs";
import { Transaction } from "../types";

// Helper to draw Category Expenses Pie Chart on canvas
function drawCategoryPieChart(expenses: { category: string; amount: number }[], currencyCode: string): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Title
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("Expenses by Category Breakdown", 20, 35);

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  if (total === 0) {
    ctx.fillStyle = "#64748B";
    ctx.font = "14px sans-serif";
    ctx.fillText("No expense data recorded in this period.", 50, 150);
    return canvas.toDataURL("image/png");
  }

  // Draw Pie Chart
  const centerX = 190;
  const centerY = 210;
  const radius = 110;
  let startAngle = -Math.PI / 2;

  const colors = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#EC4899", // Pink
    "#6366F1", // Indigo
    "#F97316", // Orange
    "#14B8A6", // Teal
  ];

  expenses.forEach((item, index) => {
    const sliceAngle = (item.amount / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Make it a Doughnut Chart
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.52, 0, 2 * Math.PI);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Legend
  const legendX = 360;
  let legendY = 70;
  ctx.font = "12px sans-serif";

  expenses.forEach((item, index) => {
    const percent = ((item.amount / total) * 100).toFixed(1);
    
    // Draw color swatch
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.rect(legendX, legendY, 15, 15);
    ctx.fill();

    // Swatch stroke
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Category Label
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`${item.category} (${percent}%)`, legendX + 22, legendY + 12);
    
    // Amount Subtext
    ctx.fillStyle = "#64748B";
    ctx.font = "normal 11px sans-serif";
    const amountText = `${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currencyCode}`;
    ctx.fillText(amountText, legendX + 22, legendY + 27);

    legendY += 36;
  });

  return canvas.toDataURL("image/png");
}

// Helper to draw Daily Trends Bar Chart on canvas
function drawDailyTrendsChart(transactions: Transaction[], currencyCode: string): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 650;
  canvas.height = 350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Filter to expense items & sort by chronological date
  const expenses = transactions.filter(t => t.type === "expense");
  const grouped: Record<string, number> = {};
  expenses.forEach(t => {
    const d = t.date;
    grouped[d] = (grouped[d] || 0) + t.amount;
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const finalDates = sortedDates.slice(-10); // recent 10 active days

  // Title
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("Expenses Trend analysis (Last 10 Days)", 20, 35);

  if (finalDates.length === 0) {
    ctx.fillStyle = "#64748B";
    ctx.font = "14px sans-serif";
    ctx.fillText("No historical daily expense markings found under chosen dates.", 50, 150);
    return canvas.toDataURL("image/png");
  }

  // Math scale
  const values = finalDates.map(d => grouped[d]);
  const maxValue = Math.max(...values, 100);
  const roundedMax = Math.ceil(maxValue / 100) * 100;

  const graphX = 65;
  const graphY = 65;
  const graphWidth = 550;
  const graphHeight = 220;

  // Draw horizontal grids
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#475569";
  ctx.font = "10px monospace";

  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const val = (roundedMax / numTicks) * i;
    const y = graphY + graphHeight - (graphHeight / numTicks) * i;
    
    ctx.beginPath();
    ctx.moveTo(graphX, y);
    ctx.lineTo(graphX + graphWidth, y);
    ctx.stroke();

    ctx.fillText(`${val.toLocaleString()} ${currencyCode}`, 10, y + 3);
  }

  // Draw Trend bars
  const gapSize = 10;
  const blockWidth = graphWidth / finalDates.length;
  const barWidth = blockWidth - gapSize * 2;

  finalDates.forEach((date, i) => {
    const dayVal = grouped[date];
    const barHeight = (dayVal / roundedMax) * graphHeight;
    const x = graphX + i * blockWidth + gapSize;
    const y = graphY + graphHeight - barHeight;

    // Gradient bar styling
    const gradient = ctx.createLinearGradient(x, y, x, graphY + graphHeight);
    gradient.addColorStop(0, "#0EA5E9"); // Sky Blue
    gradient.addColorStop(1, "#2563EB"); // Royal Blue

    ctx.fillStyle = gradient;
    ctx.beginPath();
    // Rounded bar
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
    } else {
      ctx.rect(x, y, barWidth, barHeight);
    }
    ctx.fill();

    // Text value on top of bar
    if (barHeight > 15) {
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(Math.round(dayVal).toLocaleString(), x + barWidth / 2, y - 5);
      ctx.textAlign = "left";
    }

    // Format Date string
    let displayDate = date;
    try {
      const parsedDate = new Date(date);
      displayDate = parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {}

    // Axis tick label
    ctx.fillStyle = "#64748B";
    ctx.font = "normal 10px sans-serif";
    ctx.fillText(displayDate, x - 2, graphY + graphHeight + 16);
  });

  return canvas.toDataURL("image/png");
}

export async function exportToExcelWithCharts(
  transactions: Transaction[],
  currencyCode: string,
  dateWindowName: string
) {
  // 1. Calculate overall sums
  const incomeItems = transactions.filter((t) => t.type === "income");
  const expenseItems = transactions.filter((t) => t.type === "expense");

  const totalIncome = incomeItems.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenseItems.reduce((acc, curr) => acc + curr.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Group Category expenses
  const catMap: Record<string, number> = {};
  expenseItems.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const sortedCategories = Object.keys(catMap)
    .map((k) => ({ category: k, amount: catMap[k] }))
    .sort((a, b) => b.amount - a.amount);

  // 2. Generate Canvas Charts images
  const categoryPieDataURL = drawCategoryPieChart(sortedCategories, currencyCode);
  const trendBarDataURL = drawDailyTrendsChart(transactions, currencyCode);

  // 3. Create Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Aura Financial Engine";
  workbook.lastModifiedBy = "Aura Financial Engine";
  workbook.created = new Date();
  workbook.modified = new Date();

  // SHEET 1: DASHBOARD OVERVIEW
  const dashboardSheet = workbook.addWorksheet("Financial Dashboard");
  dashboardSheet.views = [{ showGridLines: true }];

  // Column formatting for spacing
  dashboardSheet.columns = [
    { key: "A", width: 4 },
    { key: "B", width: 18 },
    { key: "C", width: 18 },
    { key: "D", width: 18 },
    { key: "E", width: 18 },
    { key: "F", width: 18 },
    { key: "G", width: 18 },
    { key: "H", width: 18 },
    { key: "I", width: 18 },
  ];

  // A. Title Banner Row
  const bannerRow = dashboardSheet.addRow([]);
  dashboardSheet.mergeCells("B2:I2");
  const titleCell = dashboardSheet.getCell("B2");
  titleCell.value = "📊 AURA WEALTH LEDGER REPORT OVERVIEW";
  titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "2563EB" }, // Royal blue primary theme
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  dashboardSheet.getRow(2).height = 42;

  // Metadata block
  dashboardSheet.mergeCells("B3:I3");
  const metaCell = dashboardSheet.getCell("B3");
  metaCell.value = `Export Scope: ${dateWindowName.toUpperCase()}  |  Ledger Size: ${transactions.length} items  |  Generated Stamp: ${new Date().toLocaleString()}`;
  metaCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "475569" } };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };
  dashboardSheet.getRow(3).height = 20;

  // B. KPI Section (Row 5 - 7)
  const metricLabels = [
    { label: "💰 TOTAL INFLOWS", val: totalIncome, colStart: "B", colEnd: "C", numFormat: `#,##0.00 "${currencyCode}"`, color: "10B981" },
    { label: "💸 TOTAL OUTFLOWS", val: totalExpense, colStart: "D", colEnd: "E", numFormat: `#,##0.00 "${currencyCode}"`, color: "EF4444" },
    { label: "📈 NET RETENTION", val: netSavings, colStart: "F", colEnd: "G", numFormat: `#,##0.00 "${currencyCode}"`, color: netSavings >= 0 ? "3B82F6" : "DC2626" },
    { label: "🛡️ RETENTION RATE", val: savingsRate / 100, colStart: "H", colEnd: "I", numFormat: "0.0%", color: "8B5CF6" },
  ];

  metricLabels.forEach((item) => {
    const rangeLabel = `${item.colStart}5:${item.colEnd}5`;
    const rangeValue = `${item.colStart}6:${item.colEnd}6`;

    dashboardSheet.mergeCells(rangeLabel);
    dashboardSheet.mergeCells(rangeValue);

    const lCell = dashboardSheet.getCell(`${item.colStart}5`);
    lCell.value = item.label;
    lCell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "475569" } };
    lCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };
    lCell.alignment = { vertical: "middle", horizontal: "center" };

    const vCell = dashboardSheet.getCell(`${item.colStart}6`);
    vCell.value = item.val;
    vCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: item.color } };
    vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
    vCell.alignment = { vertical: "middle", horizontal: "center" };
    vCell.numFmt = item.numFormat;

    // Thin card border simulation
    const borderStyle: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "CBD5E1" } };
    [lCell, vCell].forEach((cell) => {
      cell.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle,
      };
    });
  });
  dashboardSheet.getRow(5).height = 22;
  dashboardSheet.getRow(6).height = 34;

  // Insert Canvas Graphics
  // Add images to the workbook
  if (categoryPieDataURL) {
    const pieId = workbook.addImage({
      base64: categoryPieDataURL,
      extension: "png",
    });
    // Position it at B8
    dashboardSheet.addImage(pieId, {
      tl: { col: 1, row: 8 },
      ext: { width: 440, height: 290 },
    });
  }

  if (trendBarDataURL) {
    const barId = workbook.addImage({
      base64: trendBarDataURL,
      extension: "png",
    });
    // Position it under or side-by-side (e.g. F8)
    dashboardSheet.addImage(barId, {
      tl: { col: 5, row: 8 },
      ext: { width: 440, height: 290 },
    });
  }

  // Double Empty Row Spacer in between for aesthetic placement
  dashboardSheet.addRow([]);

  // SHEET 2: TRANSACTION LEDGER SHEET
  const ledgerSheet = workbook.addWorksheet("Ledger Transactions");
  ledgerSheet.views = [{ showGridLines: true }];

  // Setup visual header
  const titleRowLedger = ledgerSheet.addRow([]);
  ledgerSheet.mergeCells("A2:H2");
  const tHeaderCell = ledgerSheet.getCell("A2");
  tHeaderCell.value = `📜 FULL POSTINGS REGISTRY (${dateWindowName.toUpperCase()})`;
  tHeaderCell.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "1E3A8A" } };
  tHeaderCell.alignment = { vertical: "middle", horizontal: "left" };
  ledgerSheet.getRow(2).height = 26;

  // Setup Table Header Row
  const tableHeaders = ["ID", "Title", "Amount", "Class", "Category", "Date", "Is Recurring", "Tags", "Special Notes"];
  const headerRow = ledgerSheet.addRow(tableHeaders);
  headerRow.height = 25;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E3A8A" }, // Dark deep blue headers
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "0F172A" } },
      top: { style: "thin", color: { argb: "CBD5E1" } },
    };
  });

  // Populate data rows
  transactions.forEach((tx, idx) => {
    const row = ledgerSheet.addRow([
      tx.id,
      tx.title,
      tx.amount,
      tx.type.toUpperCase(),
      tx.category,
      tx.date,
      tx.isRecurring ? "YES" : "NO",
      tx.tags ? tx.tags.join(", ") : "-",
      tx.notes || "-",
    ]);

    row.height = 21;

    // Stripe alternating row styles
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "F8FAFC" : "FFFFFF";

    row.eachCell((cell, colNum) => {
      cell.font = { name: "Segoe UI", size: 9.5 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "F1F5F9" } },
      };

      // Set Alignments & Number formats
      if (colNum === 1) {
        cell.font = { name: "Courier New", size: 8.5, color: { argb: "94A3B8" } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      } else if (colNum === 3) {
        // Amount alignment left & currency formatting code
        const isExpense = tx.type === "expense";
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: isExpense ? "DC2626" : "15803D" } };
        cell.numFmt = `#,##0.00 "${tx.currency || currencyCode}"`;
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (colNum === 4) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNum === 6 || colNum === 7) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // Autofit Column Widths helper
  ledgerSheet.columns.forEach((col) => {
    let maxLength = 0;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const formattedVal = cell.value ? String(cell.value) : "";
      if (formattedVal.length > maxLength) {
        maxLength = formattedVal.length;
      }
    });
    // Set column width with safety pad
    col.width = Math.max(maxLength + 4, 12);
  });
  // Cap ID column to maintain clean width
  ledgerSheet.getColumn(1).width = 12;

  // 4. Generate & trigger file save download
  const buffer = await workbook.xlsx.writeBuffer();
  const fileBlob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const objectUrl = URL.createObjectURL(fileBlob);

  const cleanWindowStr = dateWindowName === "all" ? "all_time" : dateWindowName;
  const downloadLink = document.createElement("a");
  downloadLink.setAttribute("href", objectUrl);
  downloadLink.setAttribute(
    "download",
    `aura_ledger_financial_report_${cleanWindowStr}_${new Date().toISOString().split("T")[0]}.xlsx`
  );
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(objectUrl);
}
