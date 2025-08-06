const express = require("express");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const cors = require("cors"); // 引入 cors

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // 啟用 CORS
app.use(express.json({ limit: "5mb" })); // 解析 JSON，並提高大小限制以容納計算結果
app.use(express.static(path.join(__dirname, "public")));

// API Endpoint: 接收新的訂單
app.post("/api/orders", async (req, res) => {
  try {
    const {
      lineNickname,
      recipientName,
      address,
      phone,
      idNumber,
      calculationResult,
    } = req.body;

    if (!recipientName || !address || !phone || !calculationResult) {
      return res.status(400).json({ error: "缺少必要的訂單資訊" });
    }

    const newOrder = await prisma.shipmentOrder.create({
      data: {
        lineNickname: lineNickname || "未提供",
        recipientName,
        address,
        phone,
        idNumber,
        calculationResult, // Prisma 會自動處理 JSON
      },
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("建立訂單時發生錯誤:", error);
    res.status(500).json({ error: "伺服器內部錯誤" });
  }
});

// 處理所有其他請求，都回傳主頁面
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
});
