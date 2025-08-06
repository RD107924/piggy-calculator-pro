// public/admin.js (修正後)
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
  const fetchOptions = { headers, cache: "no-cache" }; // NEW: 加入 no-cache 設定

  // DOM Elements
  const ordersTableBody = document.getElementById("ordersTableBody");
  const logoutBtn = document.getElementById("logoutBtn");
  const filterStatus = document.getElementById("filter-status");
  const filterUser = document.getElementById("filter-user");
  const searchInput = document.getElementById("search-input");
  const modal = document.getElementById("order-detail-modal");
  const modalBody = document.getElementById("modal-body");
  const closeModalBtn = document.querySelector(".modal-close-btn");

  let allOrders = [];

  const statusMap = {
    NEEDS_PURCHASE: "需採購清單",
    PURCHASED: "已採購",
    IN_WAREHOUSE: "已入庫",
    NOT_IN_WAREHOUSE: "未入庫",
    SHIPPED: "已發貨",
    IN_CUSTOMS: "清關中",
    DELIVERY_COMPLETE: "派送完成",
  };

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

  const fetchAndRender = async () => {
    try {
      const params = new URLSearchParams({
        status: filterStatus.value,
        assignedToId: filterUser.value,
        search: searchInput.value,
      }).toString();

      const [usersResponse, ordersResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/users", fetchOptions),
        fetch(`/api/admin/orders?${params}`, fetchOptions), // MODIFIED
        fetch("/api/admin/stats", fetchOptions), // MODIFIED
      ]);

      if (ordersResponse.status === 401) {
        localStorage.removeItem("authToken");
        window.location.href = "/login.html";
        return;
      }

      const users = await usersResponse.json();
      const orders = await ordersResponse.json();
      const stats = await statsResponse.json();

      allOrders = orders;

      if (filterUser.options.length <= 1) {
        users.forEach((user) => {
          const option = document.createElement("option");
          option.value = user.id;
          option.textContent = user.username;
          filterUser.appendChild(option);
        });
      }

      document.getElementById("stats-today").textContent = stats.newOrdersToday;
      document.getElementById("stats-pending").textContent =
        stats.pendingOrders;
      document.getElementById("stats-month").textContent =
        stats.totalOrdersThisMonth;
      document.getElementById("stats-users").textContent = stats.userCount;

      renderOrders(orders, users);
    } catch (error) {
      console.error("載入後台資料失敗:", error);
      alert("無法載入後台資料，請重新登入或聯繫管理員。");
    }
  };

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

  // Event Listeners
  filterStatus.addEventListener("change", fetchAndRender);
  filterUser.addEventListener("change", fetchAndRender);
  searchInput.addEventListener("input", fetchAndRender);

  ordersTableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-view-detail")) {
      showOrderDetail(e.target.dataset.orderId);
    }
  });

  ordersTableBody.addEventListener("change", async (e) => {
    const target = e.target;
    const orderId = target.dataset.orderId;

    const updateHeaders = { ...headers, cache: "no-cache" }; // MODIFIED

    if (target.classList.contains("status-select")) {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: updateHeaders,
        body: JSON.stringify({ status: target.value }),
      });
    }
    if (target.classList.contains("assign-select")) {
      await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: "PUT",
        headers: updateHeaders,
        body: JSON.stringify({ userId: target.value || null }),
      });
    }
  });

  // Initial Load
  fetchAndRender();
});
