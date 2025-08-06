document.addEventListener("DOMContentLoaded", () => {
  // --- 1. 資料定義 ---
  const rates = {
    general: { name: "一般家具", weightRate: 22, volumeRate: 125 },
    special_a: { name: "特殊家具A", weightRate: 32, volumeRate: 184 },
    special_b: { name: "特殊家具B", weightRate: 40, volumeRate: 224 },
    special_c: { name: "特殊家具C", weightRate: 50, volumeRate: 274 },
  };
  const MINIMUM_CHARGE = 2000;
  const VOLUME_DIVISOR = 28317;
  const CBM_TO_CAI_FACTOR = 35.3;
  const OVERSIZED_LIMIT = 300;
  let itemCount = 0;

  // --- 2. 獲取 HTML 元素 ---
  const itemList = document.getElementById("itemList");
  const addItemBtn = document.getElementById("addItemBtn");
  const calculateBtn = document.getElementById("calculateBtn");
  const resultsContainer = document.getElementById("resultsContainer");
  const deliveryLocationSelect = document.getElementById("deliveryLocation");
  const lineNicknameInput = document.getElementById("lineNickname");
  const copyAddressBtn = document.getElementById("copyAddressBtn");
  const usageCountSpan = document.getElementById("usageCount"); // NEW: 獲取人次計數器的元素

  // --- 3. 核心功能函式 ---

  // NEW: 使用人次計數器功能
  function initializeUsageCounter() {
    const baseCount = 5000; // 從 5000 開始
    let currentCount = localStorage.getItem("usageCount");

    if (currentCount === null) {
      // 如果是第一次訪問，設定一個初始隨機值
      currentCount = baseCount + Math.floor(Math.random() * 50);
    } else {
      currentCount = parseInt(currentCount, 10);
    }

    // 隨機增加 1-3 人次，讓計數器看起來更真實
    currentCount += Math.floor(Math.random() * 3) + 1;

    localStorage.setItem("usageCount", currentCount);
    usageCountSpan.textContent = currentCount.toLocaleString();
  }

  function addNewItem() {
    itemCount++;
    const itemDiv = document.createElement("div");
    itemDiv.className = "item-group";
    itemDiv.id = `item-${itemCount}`;
    let optionsHtml = "";
    for (const key in rates) {
      optionsHtml += `<option value="${key}">${rates[key].name}</option>`;
    }

    itemDiv.innerHTML = `
            <input type="text" id="name-${itemCount}" class="item-name-input" placeholder="請輸入商品名稱 (例如: 客廳沙發)">
            <div class="calc-method-toggle">
                <label><input type="radio" name="calc-method-${itemCount}" value="dimensions" checked> 依尺寸 (長x寬x高)</label>
                <label><input type="radio" name="calc-method-${itemCount}" value="cbm"> 依體積 (立方米/方)</label>
            </div>
            <div class="dimensions-input-wrapper">
                <div class="input-row">
                    <div class="input-wrapper"><label for="length-${itemCount}">長 (cm)</label><input type="number" id="length-${itemCount}" placeholder="單件"></div>
                    <div class="input-wrapper"><label for="width-${itemCount}">寬 (cm)</label><input type="number" id="width-${itemCount}" placeholder="單件"></div>
                    <div class="input-wrapper"><label for="height-${itemCount}">高 (cm)</label><input type="number" id="height-${itemCount}" placeholder="單件"></div>
                </div>
            </div>
            <div class="cbm-input-wrapper">
                 <div class="input-row">
                    <div class="input-wrapper"><label for="cbm-${itemCount}">立方米 (方)</label><input type="number" id="cbm-${itemCount}" placeholder="單件"></div>
                </div>
            </div>
            <div class="input-row">
                <div class="input-wrapper"><label for="weight-${itemCount}">重量 (kg)</label><input type="number" id="weight-${itemCount}" placeholder="單件"></div>
                <div class="input-wrapper"><label for="quantity-${itemCount}">數量</label><input type="number" id="quantity-${itemCount}" value="1" min="1"></div>
            </div>
             <div class="input-row">
                <div class="input-wrapper"><label for="type-${itemCount}">家具種類</label><select id="type-${itemCount}">${optionsHtml}</select></div>
            </div>
            ${itemCount > 1 ? '<button class="btn-remove">X</button>' : ""}
        `;
    itemList.appendChild(itemDiv);

    const removeBtn = itemDiv.querySelector(".btn-remove");
    if (removeBtn) removeBtn.addEventListener("click", () => itemDiv.remove());

    const radioButtons = itemDiv.querySelectorAll(
      `input[name="calc-method-${itemCount}"]`
    );
    const dimensionsWrapper = itemDiv.querySelector(
      ".dimensions-input-wrapper"
    );
    const cbmWrapper = itemDiv.querySelector(".cbm-input-wrapper");
    radioButtons.forEach((radio) => {
      radio.addEventListener("change", (event) => {
        dimensionsWrapper.style.display =
          event.target.value === "dimensions" ? "block" : "none";
        cbmWrapper.style.display =
          event.target.value === "cbm" ? "block" : "none";
      });
    });
  }

  function calculateTotal() {
    resultsContainer.innerHTML = "";

    const remoteAreaRate = parseFloat(deliveryLocationSelect.value);
    if (isNaN(remoteAreaRate)) {
      alert("請務必選擇一個配送地區！");
      return;
    }

    let allItemsData = [];
    let hasOversizedItem = false;
    let totalShipmentVolume = 0;

    allItemsData = Array.from(document.querySelectorAll(".item-group"))
      .map((itemEl, index) => {
        const id = itemEl.id.split("-")[1];
        const name =
          document.getElementById(`name-${id}`).value.trim() ||
          `貨物 ${index + 1}`;
        const quantity =
          parseInt(document.getElementById(`quantity-${id}`).value, 10) || 1;
        const singleWeight = parseFloat(
          document.getElementById(`weight-${id}`).value
        );
        const type = document.getElementById(`type-${id}`).value;
        const calcMethod = itemEl.querySelector(
          `input[name="calc-method-${id}"]:checked`
        ).value;
        let singleVolume = 0,
          length = 0,
          width = 0,
          height = 0,
          cbm = 0;

        if (calcMethod === "dimensions") {
          length = parseFloat(document.getElementById(`length-${id}`).value);
          width = parseFloat(document.getElementById(`width-${id}`).value);
          height = parseFloat(document.getElementById(`height-${id}`).value);
          if (
            isNaN(length) ||
            isNaN(width) ||
            isNaN(height) ||
            isNaN(singleWeight) ||
            length <= 0 ||
            width <= 0 ||
            height <= 0 ||
            singleWeight <= 0
          ) {
            return null;
          }
          singleVolume = Math.ceil((length * width * height) / VOLUME_DIVISOR);
          if (
            length > OVERSIZED_LIMIT ||
            width > OVERSIZED_LIMIT ||
            height > OVERSIZED_LIMIT
          ) {
            hasOversizedItem = true;
          }
        } else {
          cbm = parseFloat(document.getElementById(`cbm-${id}`).value);
          if (
            isNaN(cbm) ||
            isNaN(singleWeight) ||
            cbm <= 0 ||
            singleWeight <= 0
          ) {
            return null;
          }
          singleVolume = Math.ceil(cbm * CBM_TO_CAI_FACTOR);
        }
        return {
          id: index + 1,
          name,
          quantity,
          singleWeight,
          type,
          singleVolume,
          cbm,
          calcMethod,
        };
      })
      .filter((item) => item !== null);

    if (allItemsData.length === 0) {
      alert("請至少填寫一項完整的貨物資料！");
      return;
    }

    let initialSeaFreightCost = 0;
    allItemsData.forEach((item) => {
      const rateInfo = rates[item.type];
      item.rateInfo = rateInfo;

      const totalItemWeight = item.singleWeight * item.quantity;
      const totalItemVolume = item.singleVolume * item.quantity;
      item.totalWeight = totalItemWeight;
      item.totalVolume = totalItemVolume;

      const itemWeightCost = totalItemWeight * rateInfo.weightRate;
      const itemVolumeCost = totalItemVolume * rateInfo.volumeRate;
      const itemFinalCost = Math.max(itemWeightCost, itemVolumeCost);

      item.itemWeightCost = itemWeightCost;
      item.itemVolumeCost = itemVolumeCost;
      item.itemFinalCost = itemFinalCost;

      initialSeaFreightCost += itemFinalCost;
      totalShipmentVolume += totalItemVolume;
    });

    const finalSeaFreightCost = Math.max(initialSeaFreightCost, MINIMUM_CHARGE);

    let remoteFee = 0;
    let totalCbm = totalShipmentVolume / CBM_TO_CAI_FACTOR;
    if (remoteAreaRate > 0) {
      remoteFee = totalCbm * remoteAreaRate;
    }

    const finalTotal = finalSeaFreightCost + remoteFee;

    const calculationResultData = {
      allItemsData,
      totalShipmentVolume,
      totalCbm,
      initialSeaFreightCost,
      finalSeaFreightCost,
      remoteAreaRate,
      remoteFee,
      hasOversizedItem,
      finalTotal,
    };

    displayResults(calculationResultData);

    const proceedButton = document.createElement("button");
    proceedButton.textContent = "我要寄送 (下一步，填寫收件資料)";
    proceedButton.className = "btn btn-proceed";
    proceedButton.onclick = () => {
      const dataToStore = {
        lineNickname: lineNicknameInput.value,
        calculationResult: calculationResultData,
      };
      localStorage.setItem("calculationData", JSON.stringify(dataToStore));
      window.location.href = "order.html";
    };
    resultsContainer.appendChild(proceedButton);
  }

  function displayResults(data) {
    const {
      allItemsData,
      totalShipmentVolume,
      totalCbm,
      initialSeaFreightCost,
      finalSeaFreightCost,
      remoteAreaRate,
      remoteFee,
      hasOversizedItem,
      finalTotal,
    } = data;

    let resultsHTML = '<div class="result-section">';

    resultsHTML += `<h4>--- 費用計算明細 (逐筆) ---</h4>`;

    allItemsData.forEach((item) => {
      resultsHTML += `<p><strong>[${item.name} × ${item.quantity} - ${item.rateInfo.name}]</strong><br>`;
      if (item.calcMethod === "cbm" && item.cbm > 0) {
        resultsHTML += `<small style="color:#555;">(單件以立方米輸入: ${item.cbm} 方 × ${CBM_TO_CAI_FACTOR} = ${item.singleVolume} 材)<br></small>`;
      }
      resultsHTML += `<small style="color:#555;">(總材積: ${item.singleVolume} 材/件 × ${item.quantity} = ${item.totalVolume} 材 | 總重量: ${item.singleWeight} kg/件 × ${item.quantity} = ${item.totalWeight} kg)<br></small>`;

      resultsHTML += `材積費用: ${item.totalVolume} 材 × ${
        item.rateInfo.volumeRate
      } = ${Math.round(item.itemVolumeCost).toLocaleString()} 台幣<br>`;
      resultsHTML += `重量費用: ${item.totalWeight} 公斤 × ${
        item.rateInfo.weightRate
      } = ${Math.round(item.itemWeightCost).toLocaleString()} 台幣<br>`;
      resultsHTML += `→ 此筆費用(取較高者): <strong>${Math.round(
        item.itemFinalCost
      ).toLocaleString()} 台幣</strong></p>`;
    });

    resultsHTML += `<hr>`;
    resultsHTML += `<p><strong>初步海運費 (所有項目加總): ${Math.round(
      initialSeaFreightCost
    ).toLocaleString()} 台幣</strong></p>`;

    if (initialSeaFreightCost < MINIMUM_CHARGE) {
      resultsHTML += `<p style="color: #e74c3c;">↳ 未達最低消費 ${MINIMUM_CHARGE} 元，故海運費以低消計: <strong>${finalSeaFreightCost.toLocaleString()} 台幣</strong></p>`;
    } else {
      resultsHTML += `<p style="color: green;">↳ 已超過最低消費，海運費為: <strong>${finalSeaFreightCost.toLocaleString()} 台幣</strong></p>`;
    }

    if (remoteAreaRate > 0) {
      resultsHTML += `<hr>`;
      resultsHTML += `<p><strong>偏遠地區附加費:</strong><br>`;
      resultsHTML += `(總材積 ${totalShipmentVolume} 材 ÷ ${CBM_TO_CAI_FACTOR} = ${totalCbm.toFixed(
        2
      )} 方) × ${remoteAreaRate.toLocaleString()} 元/方<br>`;
      resultsHTML += `→ 費用: <strong>${Math.round(
        remoteFee
      ).toLocaleString()} 台幣</strong></p>`;
    }

    resultsHTML += `</div>`;
    resultsHTML += `
            <div class="result-section" style="text-align: center;">
                <h2>最終總計費用</h2>
                <div class="total-cost">${Math.round(
                  finalTotal
                ).toLocaleString()} 台幣</div>
                <small>(海運費 ${Math.round(
                  finalSeaFreightCost
                ).toLocaleString()} + 偏遠費 ${Math.round(
      remoteFee
    ).toLocaleString()})</small>
            </div>
        `;

    if (hasOversizedItem) {
      resultsHTML += `<div class="final-disclaimer"><strong>提醒：</strong>您的貨物中有單邊超過 300 公分的品項，將會產生超長費 (600元/件 起)，實際費用以入庫報價為準。</div>`;
    }

    resultsHTML += `<div class="final-disclaimer">此試算表僅適用於小跑豬傢俱專線，試算費用僅供參考，最終金額以實際入庫丈量為準。</div>`;

    resultsContainer.innerHTML = resultsHTML;
  }

  function copyWarehouseAddress() {
    const addressBox = document.getElementById("warehouseAddressBox");
    const textToCopy = addressBox.innerText
      .replace(/\[您的姓名\]/g, "(請填上您的姓名)")
      .replace(/\[您的電話末三碼\]/g, "(請填上您的電話末三碼)")
      .trim();

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        const originalText = copyAddressBtn.textContent;
        copyAddressBtn.textContent = "複製成功！";
        copyAddressBtn.style.backgroundColor = "#27ae60";
        setTimeout(() => {
          copyAddressBtn.textContent = originalText;
          copyAddressBtn.style.backgroundColor = "";
        }, 2000);
      })
      .catch((err) => {
        console.error("複製失敗: ", err);
        alert("複製失敗，請手動複製。");
      });
  }

  // --- 4. 綁定事件監聽 ---
  addItemBtn.addEventListener("click", addNewItem);
  calculateBtn.addEventListener("click", calculateTotal);
  copyAddressBtn.addEventListener("click", copyWarehouseAddress);

  // --- 5. 初始載入 ---
  addNewItem();
  initializeUsageCounter(); // NEW: 頁面載入時初始化計數器
});
