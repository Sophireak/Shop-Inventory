import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx-js-style";
import { getCurrentTotalDebt } from "@/lib/debt";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "Missing dates" }, { status: 400 });
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Get all data
    const dailySales = await db.dailySale.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: "asc" },
    });

    const stockIns = await db.stockIn.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });

    const stockChecks = await db.stockCheck.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });

    const products = await db.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Get current debt info (real-time)
    const currentDebt = await getCurrentTotalDebt();

    // Helper: format riel
    const fmtRiel = (n: number) => n.toLocaleString() + " ៛";

    // Helper: apply header style (blue background, white text, bold)
    const applyHeaderStyle = (ws: XLSX.WorkSheet, headerRow = 1) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
          fill: { patternType: "solid", fgColor: { rgb: "2563EB" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }
    };

    // Helper: apply total row style (yellow background, bold)
    const applyTotalRowStyle = (ws: XLSX.WorkSheet, rowIndex: number) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: col });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
          font: { bold: true, sz: 11 },
          fill: { patternType: "solid", fgColor: { rgb: "FEF3C7" } },
          border: {
            top: { style: "double", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }
    };

    // Helper: apply all cells border
    const applyAllBorders = (
      ws: XLSX.WorkSheet,
      startRow: number,
      endRow: number,
    ) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let row = startRow; row <= endRow; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddr]) {
            ws[cellAddr] = { v: "", t: "s" };
          }
          if (!ws[cellAddr].s) {
            ws[cellAddr].s = {};
          }
          ws[cellAddr].s.border = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } },
          };
          // Alternating row colors
          if (row % 2 === 0 && !ws[cellAddr].s.fill) {
            ws[cellAddr].s.fill = {
              patternType: "solid",
              fgColor: { rgb: "F9FAFB" },
            };
          }
        }
      }
    };

    // Helper: auto-size columns
    const autoSizeColumns = (
      ws: XLSX.WorkSheet,
      data: Record<string, unknown>[],
    ) => {
      if (data.length === 0) return;
      const cols: { wch: number }[] = [];
      const keys = Object.keys(data[0]);
      keys.forEach((key) => {
        let maxLen = key.length;
        data.forEach((row) => {
          const val = String(row[key] ?? "");
          if (val.length > maxLen) maxLen = val.length;
        });
        cols.push({ wch: Math.min(maxLen + 3, 35) });
      });
      ws["!cols"] = cols;
    };

    // Calculate totals
    const totalItems = dailySales.reduce((s, d) => s + d.totalItems, 0);
    const totalRevenue = dailySales.reduce((s, d) => s + d.totalRevenue, 0);
    const totalCost = dailySales.reduce((s, d) => s + d.totalCost, 0);
    const totalProfit = dailySales.reduce((s, d) => s + d.totalProfit, 0);
    const totalLoss = stockChecks.reduce((s, c) => s + c.lossValue, 0);
    const totalStockInCost = stockIns.reduce((s, i) => s + i.totalCost, 0);
    const totalStockInQty = stockIns.reduce((s, i) => s + i.quantity, 0);

    const wb = XLSX.utils.book_new();

    // ==========================================
    // SHEET 1: SUMMARY (Professional Template)
    // ==========================================
    const bestDay = [...dailySales].sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    )[0];
    const worstDay = [...dailySales].sort(
      (a, b) => a.totalRevenue - b.totalRevenue,
    )[0];

    const summaryData: (string | number)[][] = [
      // Title (row 1)
      ["🏪 របាយការណ៍ហាង / Shop Report"],
      [""],
      // Period info
      ["📅 អំឡុងពេល / Period", `${from}  →  ${to}`],
      ["📊 ថ្ងៃលក់", `${dailySales.length} ថ្ងៃ`],
      [""],

      // Current Debt Section (NEW!)
      ["💳 ស្តានភាពជំពាក់បច្ចុប្បន្ន / CURRENT DEBT STATUS"],
      [""],
      ["ប្រាក់ជំពាក់សរុប", fmtRiel(currentDebt.totalDebt)],
      ["ចំនួនទំនិញនៅសល់", currentDebt.totalItems + " ទំនិញ"],
      ["ចំនួនផលិតផល", currentDebt.productCount + " ប្រភេទ"],
      [""],
      ["👧 កុមារី", fmtRiel(currentDebt.byCategory.girl?.debt || 0)],
      ["👦 កុមារា", fmtRiel(currentDebt.byCategory.boy?.debt || 0)],
      ["👦👧 ទាំងពីរ", fmtRiel(currentDebt.byCategory.both?.debt || 0)],
      [""],

      // Sales Summary
      ["💰 សេចក្តីសង្ខេបការលក់ / SALES SUMMARY"],
      [""],
      ["ចំណូលសរុប / Total Revenue", fmtRiel(totalRevenue)],
      ["តម្លៃដើមទំនិញលក់ / Cost of Sold", fmtRiel(totalCost)],
      ["ប្រាក់ចំណេញ / Total Profit", fmtRiel(totalProfit)],
      [
        "អត្រាចំណេញ / Profit Margin",
        totalRevenue > 0
          ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%`
          : "0%",
      ],
      ["ទំនិញលក់សរុប / Items Sold", totalItems + " ទំនិញ"],
      ["ការខាតបង់ / Total Loss", fmtRiel(totalLoss)],
      [""],

      // Daily Average
      ["📈 មធ្យមប្រចាំថ្ងៃ / DAILY AVERAGE"],
      [""],
      [
        "មធ្យមចំណូល",
        dailySales.length > 0
          ? fmtRiel(Math.round(totalRevenue / dailySales.length))
          : "0 ៛",
      ],
      [
        "មធ្យមចំណេញ",
        dailySales.length > 0
          ? fmtRiel(Math.round(totalProfit / dailySales.length))
          : "0 ៛",
      ],
      [
        "មធ្យមទំនិញលក់",
        dailySales.length > 0
          ? `${Math.round(totalItems / dailySales.length)} ទំនិញ`
          : "0",
      ],
      [""],

      // Best Day
      ["🏆 ថ្ងៃលក់ដាច់បំផុត / BEST DAY"],
      [""],
    ];

    if (bestDay) {
      summaryData.push([
        "កាលបរិច្ឆេទ",
        bestDay.date.toISOString().split("T")[0],
      ]);
      summaryData.push(["ចំណូល", fmtRiel(bestDay.totalRevenue)]);
      summaryData.push(["ទំនិញលក់", bestDay.totalItems + " ទំនិញ"]);
    } else {
      summaryData.push(["(គ្មានទិន្នន័យ)", ""]);
    }

    summaryData.push([""]);
    summaryData.push(["📉 ថ្ងៃលក់តិចបំផុត / SLOWEST DAY"]);
    summaryData.push([""]);

    if (worstDay && dailySales.length > 1) {
      summaryData.push([
        "កាលបរិច្ឆេទ",
        worstDay.date.toISOString().split("T")[0],
      ]);
      summaryData.push(["ចំណូល", fmtRiel(worstDay.totalRevenue)]);
      summaryData.push(["ទំនិញលក់", worstDay.totalItems + " ទំនិញ"]);
    } else {
      summaryData.push(["(គ្មានទិន្នន័យ)", ""]);
    }

    summaryData.push([""]);
    summaryData.push(["📥 ការបញ្ចូលទំនិញ / STOCK IN"]);
    summaryData.push([""]);
    summaryData.push(["ចំនួនទំនិញបញ្ចូល", totalStockInQty + " ទំនិញ"]);
    summaryData.push(["ចំណាយសរុប", fmtRiel(totalStockInCost)]);

    const ws0 = XLSX.utils.aoa_to_sheet(summaryData);
    ws0["!cols"] = [{ wch: 45 }, { wch: 35 }];

    // Merge title cell
    ws0["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Title
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, // Debt section
      { s: { r: 14, c: 0 }, e: { r: 14, c: 1 } }, // Sales section
      { s: { r: 23, c: 0 }, e: { r: 23, c: 1 } }, // Daily avg
      { s: { r: 29, c: 0 }, e: { r: 29, c: 1 } }, // Best day
    ];

    // Style the title
    if (ws0["A1"]) {
      ws0["A1"].s = {
        font: { bold: true, sz: 20, color: { rgb: "FFFFFF" } },
        fill: { patternType: "solid", fgColor: { rgb: "2563EB" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    // Style section headers
    const sectionRows = [5, 14, 23, 29];
    sectionRows.forEach((row) => {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (ws0[cellAddr]) {
        ws0[cellAddr].s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: "1F2937" } },
          alignment: { horizontal: "left", vertical: "center" },
        };
      }
    });

    // Set row heights
    ws0["!rows"] = [{ hpt: 40 }]; // Title row taller

    XLSX.utils.book_append_sheet(wb, ws0, "📊 សេចក្តីសង្ខេប");

    // ==========================================
    // SHEET 2: DAILY SALES
    // ==========================================
    if (dailySales.length > 0) {
      const salesData: Record<string, string | number>[] = dailySales.map(
        (s) => ({
          កាលបរិច្ឆេទ: s.date.toISOString().split("T")[0],
          ចំនួនទំនិញ: s.totalItems,
          "ចំណូល (៛)": s.totalRevenue,
          "តម្លៃដើម (៛)": s.totalCost,
          "ចំណេញ (៛)": s.totalProfit,
          សាច់ប្រាក់រាប់: s.cashCounted ?? "",
          ភាពខុសគ្នា: s.cashDifference ?? "",
          ចំណាំ: s.note ?? "",
        }),
      );

      salesData.push({
        កាលបរិច្ឆេទ: "🎯 សរុប / TOTAL",
        ចំនួនទំនិញ: totalItems,
        "ចំណូល (៛)": totalRevenue,
        "តម្លៃដើម (៛)": totalCost,
        "ចំណេញ (៛)": totalProfit,
        សាច់ប្រាក់រាប់: "",
        ភាពខុសគ្នា: "",
        ចំណាំ: "",
      });

      const ws1 = XLSX.utils.json_to_sheet(salesData);
      autoSizeColumns(ws1, salesData);
      applyAllBorders(ws1, 1, salesData.length);
      applyHeaderStyle(ws1);
      applyTotalRowStyle(ws1, salesData.length);
      ws1["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws1, "📅 ការលក់ប្រចាំថ្ងៃ");
    }

    // ==========================================
    // SHEET 3: DETAILED SALES
    // ==========================================
    const saleItemsData: Record<string, string | number>[] = [];
    for (const sale of dailySales) {
      for (const item of sale.items) {
        saleItemsData.push({
          កាលបរិច្ឆេទ: sale.date.toISOString().split("T")[0],
          ផលិតផល: item.product.name,
          ទំហំ: item.product.size ?? "",
          "ម៉ូដ/ពណ៌": item.product.style ?? "",
          ប្រភេទ:
            item.product.category === "girl"
              ? "កុមារី"
              : item.product.category === "boy"
                ? "កុមារា"
                : "ទាំងពីរ",
          បរិមាណ: item.quantity,
          "តម្លៃ (៛)": item.sellPrice,
          "សរុប (៛)": item.subtotal,
        });
      }
    }

    if (saleItemsData.length > 0) {
      const detailedTotalItems = saleItemsData.reduce(
        (s, r) => s + Number(r["បរិមាណ"]),
        0,
      );
      const detailedTotalRevenue = saleItemsData.reduce(
        (s, r) => s + Number(r["សរុប (៛)"]),
        0,
      );

      saleItemsData.push({
        កាលបរិច្ឆេទ: "🎯 សរុប / TOTAL",
        ផលិតផល: "",
        ទំហំ: "",
        "ម៉ូដ/ពណ៌": "",
        ប្រភេទ: "",
        បរិមាណ: detailedTotalItems,
        "តម្លៃ (៛)": "",
        "សរុប (៛)": detailedTotalRevenue,
      });

      const ws2 = XLSX.utils.json_to_sheet(saleItemsData);
      autoSizeColumns(ws2, saleItemsData);
      applyAllBorders(ws2, 1, saleItemsData.length);
      applyHeaderStyle(ws2);
      applyTotalRowStyle(ws2, saleItemsData.length);
      ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws2, "📝 លម្អិតការលក់");
    }

    // ==========================================
    // SHEET 4: SALES ANALYSIS WITH DEBT
    // ==========================================
    if (dailySales.length > 0) {
      const salesMap = new Map<
        number,
        {
          product: (typeof products)[0];
          quantity: number;
          revenue: number;
          cost: number;
        }
      >();

      for (const sale of dailySales) {
        for (const item of sale.items) {
          const p = products.find((prod) => prod.id === item.productId);
          if (!p) continue;
          const existing = salesMap.get(item.productId);
          const itemCost = item.quantity * p.costPrice;
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.subtotal;
            existing.cost += itemCost;
          } else {
            salesMap.set(item.productId, {
              product: p,
              quantity: item.quantity,
              revenue: item.subtotal,
              cost: itemCost,
            });
          }
        }
      }

      const analysisData: Record<string, string | number>[] = Array.from(
        salesMap.values(),
      )
        .sort((a, b) => b.quantity - a.quantity)
        .map((item) => ({
          ចំណាត់ថ្នាក់: "",
          ផលិតផល: item.product.name,
          ទំហំ: item.product.size ?? "",
          "ម៉ូដ/ពណ៌": item.product.style ?? "",
          ប្រភេទ:
            item.product.category === "girl"
              ? "កុមារី"
              : item.product.category === "boy"
                ? "កុមារា"
                : "ទាំងពីរ",
          ទំនិញលក់: item.quantity,
          "សាច់ប្រាក់ (៛)": item.revenue,
          "តម្លៃដើម (៛)": item.cost,
          "ចំណេញ (៛)": item.revenue - item.cost,
          ស្តុកនៅសល់: item.product.currentStock,
          "ជំពាក់នៅសល់ (៛)": item.product.currentStock * item.product.costPrice,
        }));

      // Add ranking numbers
      analysisData.forEach((row, i) => {
        row["ចំណាត់ថ្នាក់"] = i + 1;
      });

      const totalQty = analysisData.reduce(
        (s, r) => s + Number(r["ទំនិញលក់"]),
        0,
      );
      const totalRev = analysisData.reduce(
        (s, r) => s + Number(r["សាច់ប្រាក់ (៛)"]),
        0,
      );
      const totalCostSold = analysisData.reduce(
        (s, r) => s + Number(r["តម្លៃដើម (៛)"]),
        0,
      );
      const totalProfitCalc = analysisData.reduce(
        (s, r) => s + Number(r["ចំណេញ (៛)"]),
        0,
      );
      const totalDebtLeft = analysisData.reduce(
        (s, r) => s + Number(r["ជំពាក់នៅសល់ (៛)"]),
        0,
      );

      analysisData.push({
        ចំណាត់ថ្នាក់: "",
        ផលិតផល: "🎯 សរុប / TOTAL",
        ទំហំ: "",
        "ម៉ូដ/ពណ៌": "",
        ប្រភេទ: "",
        ទំនិញលក់: totalQty,
        "សាច់ប្រាក់ (៛)": totalRev,
        "តម្លៃដើម (៛)": totalCostSold,
        "ចំណេញ (៛)": totalProfitCalc,
        ស្តុកនៅសល់: "",
        "ជំពាក់នៅសល់ (៛)": totalDebtLeft,
      });

      const wsAnalysis = XLSX.utils.json_to_sheet(analysisData);
      autoSizeColumns(wsAnalysis, analysisData);
      applyAllBorders(wsAnalysis, 1, analysisData.length);
      applyHeaderStyle(wsAnalysis);
      applyTotalRowStyle(wsAnalysis, analysisData.length);
      wsAnalysis["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, wsAnalysis, "📊 វិភាគការលក់");
    }

    // ==========================================
    // SHEET 5: PRODUCT RANKING
    // ==========================================
    const productSalesMap = new Map<
      number,
      { product: (typeof products)[0]; quantity: number; revenue: number }
    >();
    for (const sale of dailySales) {
      for (const item of sale.items) {
        const p = products.find((prod) => prod.id === item.productId);
        if (!p) continue;
        const existing = productSalesMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSalesMap.set(item.productId, {
            product: p,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      }
    }

    const rankedProducts = Array.from(productSalesMap.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );

    if (rankedProducts.length > 0) {
      const rankData: Record<string, string | number>[] = rankedProducts.map(
        (item, i) => ({
          ចំណាត់ថ្នាក់: i + 1,
          ផលិតផល: item.product.name,
          ទំហំ: item.product.size ?? "",
          "ម៉ូដ/ពណ៌": item.product.style ?? "",
          ប្រភេទ:
            item.product.category === "girl"
              ? "កុមារី"
              : item.product.category === "boy"
                ? "កុមារា"
                : "ទាំងពីរ",
          បរិមាណលក់: item.quantity,
          "ចំណូល (៛)": item.revenue,
          ភាគរយ:
            totalRevenue > 0
              ? `${((item.revenue / totalRevenue) * 100).toFixed(1)}%`
              : "0%",
        }),
      );

      const ws3 = XLSX.utils.json_to_sheet(rankData);
      autoSizeColumns(ws3, rankData);
      applyAllBorders(ws3, 1, rankData.length);
      applyHeaderStyle(ws3);
      ws3["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws3, "🏆 ចំណាត់ថ្នាក់ផលិតផល");
    }

    // ==========================================
    // SHEET 6: STOCK IN
    // ==========================================
    if (stockIns.length > 0) {
      const stockInData: Record<string, string | number>[] = stockIns.map(
        (s) => ({
          កាលបរិច្ឆេទ: s.createdAt.toISOString().split("T")[0],
          ផលិតផល: s.product.name,
          ទំហំ: s.product.size ?? "",
          "ម៉ូដ/ពណ៌": s.product.style ?? "",
          បរិមាណ: s.quantity,
          "តម្លៃដើម (៛)": s.costPrice,
          "សរុប (៛)": s.totalCost,
          អ្នកផ្គត់ផ្គង់: s.supplier ?? "",
          ចំណាំ: s.note ?? "",
        }),
      );

      stockInData.push({
        កាលបរិច្ឆេទ: "🎯 សរុប / TOTAL",
        ផលិតផល: "",
        ទំហំ: "",
        "ម៉ូដ/ពណ៌": "",
        បរិមាណ: totalStockInQty,
        "តម្លៃដើម (៛)": "",
        "សរុប (៛)": totalStockInCost,
        អ្នកផ្គត់ផ្គង់: "",
        ចំណាំ: "",
      });

      const ws4 = XLSX.utils.json_to_sheet(stockInData);
      autoSizeColumns(ws4, stockInData);
      applyAllBorders(ws4, 1, stockInData.length);
      applyHeaderStyle(ws4);
      applyTotalRowStyle(ws4, stockInData.length);
      ws4["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws4, "📥 បញ្ចូលទំនិញ");
    }

    // ==========================================
    // SHEET 7: STOCK CHECKS / LOSSES
    // ==========================================
    if (stockChecks.length > 0) {
      const totalLossQty = stockChecks.reduce(
        (s, c) => s + Math.abs(c.difference),
        0,
      );

      const checkData: Record<string, string | number>[] = stockChecks.map(
        (c) => ({
          កាលបរិច្ឆេទ: c.createdAt.toISOString().split("T")[0],
          ផលិតផល: c.product.name,
          ទំហំ: c.product.size ?? "",
          ស្តុកគួរតែមាន: c.expectedStock,
          ស្តុកពិត: c.actualStock,
          ភាពខុសគ្នា: c.difference,
          "តម្លៃខាតបង់ (៛)": c.lossValue,
          មូលហេតុ: c.reason ?? "",
          ចំណាំ: c.note ?? "",
        }),
      );

      checkData.push({
        កាលបរិច្ឆេទ: "🎯 សរុប / TOTAL",
        ផលិតផល: "",
        ទំហំ: "",
        ស្តុកគួរតែមាន: "",
        ស្តុកពិត: "",
        ភាពខុសគ្នា: -totalLossQty,
        "តម្លៃខាតបង់ (៛)": totalLoss,
        មូលហេតុ: "",
        ចំណាំ: "",
      });

      const ws5 = XLSX.utils.json_to_sheet(checkData);
      autoSizeColumns(ws5, checkData);
      applyAllBorders(ws5, 1, checkData.length);
      applyHeaderStyle(ws5);
      applyTotalRowStyle(ws5, checkData.length);
      ws5["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws5, "🔍 ការខាតបង់");
    }

    // ==========================================
    // SHEET 8: CURRENT PRODUCTS (WITH DEBT!)
    // ==========================================
    const productData: Record<string, string | number>[] = products.map(
      (p) => ({
        ឈ្មោះ: p.name,
        ទំហំ: p.size ?? "",
        "ម៉ូដ/ពណ៌": p.style ?? "",
        ប្រភេទ:
          p.category === "girl"
            ? "កុមារី"
            : p.category === "boy"
              ? "កុមារា"
              : "ទាំងពីរ",
        "តម្លៃលក់ (៛)": p.sellPrice,
        "តម្លៃដើម (៛)": p.costPrice,
        ស្តុកបច្ចុប្បន្ន: p.currentStock,
        ស្តុកអប្បបរមា: p.minStock,
        "តម្លៃស្តុក/ជំពាក់ (៛)": p.currentStock * p.costPrice,
      }),
    );

    const totalStockValue = products.reduce(
      (s, p) => s + p.currentStock * p.costPrice,
      0,
    );
    productData.push({
      ឈ្មោះ: "🎯 សរុប / TOTAL",
      ទំហំ: "",
      "ម៉ូដ/ពណ៌": "",
      ប្រភេទ: "",
      "តម្លៃលក់ (៛)": "",
      "តម្លៃដើម (៛)": "",
      ស្តុកបច្ចុប្បន្ន: products.reduce((s, p) => s + p.currentStock, 0),
      ស្តុកអប្បបរមា: "",
      "តម្លៃស្តុក/ជំពាក់ (៛)": totalStockValue,
    });

    const ws6 = XLSX.utils.json_to_sheet(productData);
    autoSizeColumns(ws6, productData);
    applyAllBorders(ws6, 1, productData.length);
    applyHeaderStyle(ws6);
    applyTotalRowStyle(ws6, productData.length);
    ws6["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws6, "📦 ផលិតផលទាំងអស់");

    // Generate buffer with styles
    const buf = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
      bookSST: false,
    });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="shop-report-${from}-to-${to}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
