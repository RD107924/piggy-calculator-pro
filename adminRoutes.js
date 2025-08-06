// adminRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient, OrderStatus } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// API: 新增員工帳號 (僅限已登入者訪問)
router.post("/register", async (req, res) => {
  // 可以在此加入角色驗證，例如： if (req.user.role !== 'ADMIN') return res.status(403).json(...)
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "請提供帳號密碼" });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: role || "OPERATOR", // 預設為一般操作員
      },
    });
    res
      .status(201)
      .json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(400).json({ error: "帳號已存在" });
  }
});

// API: 獲取所有訂單
router.get("/orders", async (req, res) => {
  const orders = await prisma.shipmentOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { username: true } } }, // 同時獲取被指派人的名字
  });
  res.json(orders);
});

// API: 獲取所有員工列表 (用於指派下拉選單)
router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true },
  });
  res.json(users);
});

// API: 更新訂單狀態
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

// API: 指派訂單給員工
router.put("/orders/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // userId 可以是 null, 表示取消指派
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
