// adminRoutes.js (測試版)
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

// --- MODIFIED FOR DEBUGGING ---
// 暫時移除了所有篩選條件，並加入了詳細的日誌
router.get("/orders", async (req, res) => {
  console.log("收到獲取訂單的請求，開始查詢資料庫...");
  try {
    const orders = await prisma.shipmentOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { username: true } } },
    });
    console.log(`查詢成功！在資料庫中找到了 ${orders.length} 筆訂單。`);
    res.json(orders);
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
