// server.js (修正後)
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const cors = require("cors");

const authMiddleware = require("./authMiddleware");
const userRoutes = require("./userRoutes");
const adminRoutes = require("./adminRoutes");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/users", userRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);

// MODIFIED: 儲存訂單前，對 calculationResult 進行淨化
app.post("/api/orders", async (req, res) => {
  try {
    const {
      lineNickname,
      recipientName,
      address,
      phone,
      idNumber,
      calculationResult, // 這是從前端傳來、可能包含複雜物件的原始資料
    } = req.body;

    if (!recipientName || !address || !phone || !calculationResult) {
      return res.status(400).json({ error: "缺少必要的訂單資訊" });
    }

    // --- 淨化步驟 ---
    // 建立一個新的、乾淨的物件，只包含我們確定需要的欄位
    // 這可以避免將不必要的或可能導致錯誤的資料存入資料庫
    const cleanCalculationResult = {
      allItemsData: calculationResult.allItemsData,
      totalShipmentVolume: calculationResult.totalShipmentVolume,
      totalCbm: calculationResult.totalCbm,
      initialSeaFreightCost: calculationResult.initialSeaFreightCost,
      finalSeaFreightCost: calculationResult.finalSeaFreightCost,
      remoteAreaRate: calculationResult.remoteAreaRate,
      remoteFee: calculationResult.remoteFee,
      hasOversizedItem: calculationResult.hasOversizedItem,
      finalTotal: calculationResult.finalTotal,
    };

    const newOrder = await prisma.shipmentOrder.create({
      data: {
        lineNickname: lineNickname || "未提供",
        recipientName,
        address,
        phone,
        idNumber,
        calculationResult: cleanCalculationResult, // 使用淨化後的資料
      },
    });
    res.status(201).json(newOrder);
  } catch (error) {
    console.error("建立訂單時發生錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// 處理前端頁面請求
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
});
