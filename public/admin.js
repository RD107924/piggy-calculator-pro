// public/admin.js (升級後)
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // DOM Elements
  const ordersTableBody = document.getElementById("ordersTableBody");
  const logoutBtn = document.getElementById("logoutBtn");
  const filterStatus = document.getElementById("filter-status");
  const filterUser = document.getElementById("filter-user");
  const searchInput = document.getElementById("search-input");
  const modal = document.getElementById("order-detail-modal");
  const modalBody = document.getElementById("modal-body");
  const closeModalBtn = document.querySelector(".modal-close-btn");

  let allOrders = []; // 用來緩存所有訂單數據

  const statusMap = {
    NEEDS_PURCHASE: "需採購清單",
    PURCHASED: "已採購",
    IN_WAREHOUSE: "已入庫",
    NOT_IN_WAREHOUSE: "未入庫",
    SHIPPED: "已發貨",
    IN_CUSTOMS: "清關中",
    DELIVERY_COMPLETE: "派送完成",
  };

  // 填充狀態篩選下拉選單
  Object.entries(statusMap).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value;
    filterStatus.appendChild(option);
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "/login.html";
  });

  closeModalBtn.addEventListener("click", () => (modal.style.display = "none"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // 渲染訂單到表格
  const renderOrders = (orders, users) => {
    ordersTableBody.innerHTML = orders
      .map(
        (order) => `
            <tr>
                <td data-label="操作"><button class="btn-view-detail" data-order-id="${
                  order.id
                }">查看</button></td>
                <td data-label="訂單時間">${new Date(order.createdAt)
                  .toLocaleString("sv")
                  .replace(" ", "<br>")}</td>
                <td data-label="收件人">${order.recipientName}</td>
                <td data-label="聯絡電話">${order.phone}</td>
                <td data-label="總金額">${
                  order.calculationResult?.finalTotal?.toLocaleString() || "N/A"
                } 台幣</td>
                <td data-label="進度">
                    <select class="status-select" data-order-id="${order.id}">
                        ${Object.entries(statusMap)
                          .map(
                            ([key, value]) =>
                              `<option value="${key}" ${
                                order.status === key ? "selected" : ""
                              }>${value}</option>`
                          )
                          .join("")}
                    </select>
                </td>
                <td data-label="負責人">
                    <select class="assign-select" data-order-id="${order.id}">
                        <option value="">-- 未指派 --</option>
                        ${users
                          .map(
                            (user) =>
                              `<option value="${user.id}" ${
                                order.assignedToId === user.id ? "selected" : ""
                              }>${user.username}</option>`
                          )
                          .join("")}
                    </select>
                </td>
            </tr>
        `
      )
      .join("");
  };

  // 獲取並渲染所有數據
  const fetchAndRender = async () => {
    try {
      const params = new URLSearchParams({
        status: filterStatus.value,
        assignedToId: filterUser.value,
        search: searchInput.value,
      }).toString();

      const [usersResponse, ordersResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch(`/api/admin/orders?${params}`, { headers }),
        fetch("/api/admin/stats", { headers }),
      ]);

      if (ordersResponse.status === 401) {
        localStorage.removeItem("authToken");
        window.location.href = "/login.html";
        return;
      }

      const users = await usersResponse.json();
      const orders = await ordersResponse.json();
      const stats = await statsResponse.json();

      allOrders = orders; // 緩存數據

      // 填充負責人篩選下拉選單 (僅在初次載入時)
      if (filterUser.options.length <= 1) {
        users.forEach((user) => {
          const option = document.createElement("option");
          option.value = user.id;
          option.textContent = user.username;
          filterUser.appendChild(option);
        });
      }

      // 渲染儀表板數據
      document.getElementById("stats-today").textContent = stats.newOrdersToday;
      document.getElementById("stats-pending").textContent =
        stats.pendingOrders;
      document.getElementById("stats-month").textContent =
        stats.totalOrdersThisMonth;
      document.getElementById("stats-users").textContent = stats.userCount;

      // 渲染訂單表格
      renderOrders(orders, users);
    } catch (error) {
      console.error("載入後台資料失敗:", error);
      alert("無法載入後台資料，請重新登入或聯繫管理員。");
    }
  };

  // 顯示訂單詳情 Modal
  const showOrderDetail = (orderId) => {
    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;

    let itemsHtml = (order.calculationResult?.allItemsData || [])
      .map(
        (item) => `
            <div class="item-detail">
                <strong>${item.name} × ${item.quantity}</strong> (${
          item.rateInfo.name
        })
                <ul>
                    <li>單件重量: ${item.singleWeight}kg, 單件材積: ${
          item.singleVolume
        }材</li>
                    <li>此筆費用: ${item.itemFinalCost.toLocaleString()} 台幣</li>
                </ul>
            </div>
        `
      )
      .join("");

    modalBody.innerHTML = `
            <h4>客戶資訊</h4>
            <p><strong>LINE 暱稱:</strong> ${order.lineNickname || "N/A"}</p>
            <p><strong>收件人:</strong> ${order.recipientName}</p>
            <p><strong>電話:</strong> ${order.phone}</p>
            <p><strong>地址:</strong> ${order.address}</p>
            <p><strong>身分證號:</strong> ${order.idNumber || "N/A"}</p>
            <hr>
            <h4>費用詳情</h4>
            <p><strong>初步海運費:</strong> ${order.calculationResult?.initialSeaFreightCost?.toLocaleString()} 台幣</p>
            <p><strong>最終海運費(含低消):</strong> ${order.calculationResult?.finalSeaFreightCost?.toLocaleString()} 台幣</p>
            <p><strong>偏遠地區費:</strong> ${order.calculationResult?.remoteFee?.toLocaleString()} 台幣</p>
            <h3><strong>總金額: ${order.calculationResult?.finalTotal?.toLocaleString()} 台幣</strong></h3>
            <hr>
            <h4>商品列表</h4>
            ${itemsHtml}
        `;
    modal.style.display = "flex";
  };

  // 事件監聽
  filterStatus.addEventListener("change", fetchAndRender);
  filterUser.addEventListener("change", fetchAndRender);
  searchInput.addEventListener("input", fetchAndRender);

  // 使用事件代理來處理動態生成的按鈕
  ordersTableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-view-detail")) {
      showOrderDetail(e.target.dataset.orderId);
    }
  });

  ordersTableBody.addEventListener("change", async (e) => {
    const target = e.target;
    const orderId = target.dataset.orderId;

    if (target.classList.contains("status-select")) {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: target.value }),
      });
    }
    if (target.classList.contains("assign-select")) {
      await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ userId: target.value || null }),
      });
    }
  });

  // 初始載入
  fetchAndRender();
});
