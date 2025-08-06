// adminRoutes.js (升級後)
const express = require("express");
const { PrismaClient, OrderStatus } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// NEW: 數據儀表板 API
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const newOrdersToday = await prisma.shipmentOrder.count({
      where: { createdAt: { gte: today } },
    });

    const pendingOrders = await prisma.shipmentOrder.count({
      where: { status: "NEEDS_PURCHASE" },
    });

    const totalOrdersThisMonth = await prisma.shipmentOrder.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const userCount = await prisma.user.count();

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

// MODIFIED: 獲取所有訂單 (加入篩選和搜尋功能)
router.get("/orders", async (req, res) => {
  const { status, assignedToId, search } = req.query;

  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }
  if (assignedToId) {
    whereClause.assignedToId = assignedToId;
  }
  if (search) {
    whereClause.OR = [
      { recipientName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { lineNickname: { contains: search, mode: "insensitive" } },
    ];
  }

  const orders = await prisma.shipmentOrder.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { username: true } } },
  });
  res.json(orders);
});

// --- 以下為原有 API (不變) ---
router.post("/register", async (req, res) => {
  /* ... */
});
router.get("/users", async (req, res) => {
  /* ... */
});
router.put("/orders/:id/status", async (req, res) => {
  /* ... */
});
router.put("/orders/:id/assign", async (req, res) => {
  /* ... */
});

module.exports = router;
