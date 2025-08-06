// adminRoutes.js (最終修正版)
const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient, OrderStatus } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "請提供帳號密碼" });
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash, role: role || "OPERATOR" },
    });
    res
      .status(201)
      .json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(400).json({ error: "帳號已存在" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [newOrdersToday, pendingOrders, totalOrdersThisMonth, userCount] =
      await Promise.all([
        prisma.shipmentOrder.count({ where: { createdAt: { gte: today } } }),
        prisma.shipmentOrder.count({ where: { status: "NEEDS_PURCHASE" } }),
        prisma.shipmentOrder.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        prisma.user.count(),
      ]);

    res.json({
      newOrdersToday,
      pendingOrders,
      totalOrdersThisMonth,
      userCount,
    });
  } catch (error) {
    console.error("獲取統計數據失敗:", error);
    res.status(500).json({ error: "無法獲取統計數據" });
  }
});

router.get("/orders", async (req, res) => {
  console.log("收到獲取訂單的請求，開始查詢資料庫...");
  try {
    const { status, assignedToId, search } = req.query;
    const whereClause = {};
    if (status) whereClause.status = status;
    if (assignedToId) whereClause.assignedToId = assignedToId;
    if (search) {
      whereClause.OR = [
        { recipientName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { lineNickname: { contains: search, mode: "insensitive" } },
      ];
    }

    const ordersFromDb = await prisma.shipmentOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { username: true } } },
    });
    console.log(`查詢成功！在資料庫中找到了 ${ordersFromDb.length} 筆訂單。`);

    // --- NEW: 淨化資料，確保 JSON 安全 ---
    // 這個技巧可以將 Prisma 回傳的複雜物件，轉換為純粹的 JSON 資料結構
    const safeOrders = JSON.parse(JSON.stringify(ordersFromDb));

    res.json(safeOrders);
  } catch (error) {
    console.error("查詢訂單時發生嚴重錯誤:", error);
    res.status(500).json({ error: "查詢訂單時伺服器發生錯誤" });
  }
});

router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true },
  });
  res.json(users);
});

router.put("/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !Object.values(OrderStatus).includes(status)) {
    return res.status(400).json({ error: "無效的狀態" });
  }
  try {
    const updatedOrder = await prisma.shipmentOrder.update({
      where: { id },
      data: { status },
    });
    res.json(updatedOrder);
  } catch (e) {
    res.status(404).json({ error: "找不到訂單" });
  }
});

router.put("/orders/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    const updatedOrder = await prisma.shipmentOrder.update({
      where: { id },
      data: { assignedToId: userId || null },
    });
    res.json(updatedOrder);
  } catch (e) {
    res.status(404).json({ error: "找不到訂單" });
  }
});

module.exports = router;
