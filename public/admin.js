// public/admin.js
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/login.html"; // 如果沒有 token，跳轉回登入頁面
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const ordersTableBody = document.getElementById("ordersTableBody");
  const logoutBtn = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "/login.html";
  });

  try {
    // 獲取所有員工和所有訂單
    const [usersResponse, ordersResponse] = await Promise.all([
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/orders", { headers }),
    ]);

    if (ordersResponse.status === 401 || usersResponse.status === 401) {
      // 如果 token 失效或權限不足
      localStorage.removeItem("authToken");
      window.location.href = "/login.html";
      return;
    }

    const users = await usersResponse.json();
    const orders = await ordersResponse.json();

    const statusMap = {
      NEEDS_PURCHASE: "需採購清單",
      PURCHASED: "已採購",
      IN_WAREHOUSE: "已入庫",
      NOT_IN_WAREHOUSE: "未入庫",
      SHIPPED: "已發貨",
      IN_CUSTOMS: "清關中",
      DELIVERY_COMPLETE: "派送完成",
    };

    ordersTableBody.innerHTML = orders
      .map(
        (order) => `
            <tr>
                <td data-label="訂單時間">${new Date(order.createdAt)
                  .toLocaleString("sv")
                  .replace(" ", "<br>")}</td>
                <td data-label="LINE 暱稱">${order.lineNickname || "N/A"}</td>
                <td data-label="收件人">${order.recipientName}</td>
                <td data-label="聯絡電話">${order.phone}</td>
                <td data-label="總金額">${
                  order.calculationResult?.finalTotal?.toLocaleString() || "N/A"
                } 台幣</td>
                <td data-label="進度">
                    <select class="status-select" data-order-id="${order.id}">
                        ${Object.entries(statusMap)
                          .map(
                            ([key, value]) => `
                            <option value="${key}" ${
                              order.status === key ? "selected" : ""
                            }>${value}</option>
                        `
                          )
                          .join("")}
                    </select>
                </td>
                <td data-label="負責人">
                    <select class="assign-select" data-order-id="${order.id}">
                        <option value="">-- 未指派 --</option>
                        ${users
                          .map(
                            (user) => `
                            <option value="${user.id}" ${
                              order.assignedToId === user.id ? "selected" : ""
                            }>${user.username}</option>
                        `
                          )
                          .join("")}
                    </select>
                </td>
            </tr>
        `
      )
      .join("");

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const orderId = e.target.dataset.orderId;
        const status = e.target.value;
        await fetch(`/api/admin/orders/${orderId}/status`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ status }),
        });
      });
    });

    document.querySelectorAll(".assign-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const orderId = e.target.dataset.orderId;
        const userId = e.target.value;
        await fetch(`/api/admin/orders/${orderId}/assign`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ userId: userId || null }),
        });
      });
    });
  } catch (error) {
    console.error("載入後台資料失敗:", error);
    alert("無法載入後台資料，請重新登入或聯繫管理員。");
    localStorage.removeItem("authToken");
    window.location.href = "/login.html";
  }
});
