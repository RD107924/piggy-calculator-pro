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
  const usageCountSpan = document.getElementById("usageCount");

  // --- 3. 核心功能函式 ---

  // 優化 1: 自動儲存草稿
  let saveTimeout;
  const saveItemsToLocalStorage = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const items = [];
      document.querySelectorAll(".item-group").forEach((group) => {
        const id = group.id.split("-")[1];
        const itemData = {
          name: document.getElementById(`name-${id}`).value,
          calcMethod: group.querySelector(
            `input[name="calc-method-${id}"]:checked`
          ).value,
          length: document.getElementById(`length-${id}`).value,
          width: document.getElementById(`width-${id}`).value,
          height: document.getElementById(`height-${id}`).value,
          cbm: document.getElementById(`cbm-${id}`).value,
          weight: document.getElementById(`weight-${id}`).value,
          quantity: document.getElementById(`quantity-${id}`).value,
          type: document.getElementById(`type-${id}`).value,
        };
        items.push(itemData);
      });
      localStorage.setItem("draftItems", JSON.stringify(items));
    }, 500); // Debounce: 停止輸入 500ms 後才儲存
  };

  const loadItemsFromLocalStorage = () => {
    const draftItems = JSON.parse(localStorage.getItem("draftItems"));
    if (draftItems && Array.isArray(draftItems) && draftItems.length > 0) {
      itemList.innerHTML = ""; // 清空預設的第一項
      itemCount = 0;
      draftItems.forEach((itemData) => {
        addNewItem(); // 這會建立一個新的 item group
        const id = itemCount;
        document.getElementById(`name-${id}`).value = itemData.name || "";
        document.getElementById(`length-${id}`).value = itemData.length || "";
        document.getElementById(`width-${id}`).value = itemData.width || "";
        document.getElementById(`height-${id}`).value = itemData.height || "";
        document.getElementById(`cbm-${id}`).value = itemData.cbm || "";
        document.getElementById(`weight-${id}`).value = itemData.weight || "";
        document.getElementById(`quantity-${id}`).value =
          itemData.quantity || "1";
        document.getElementById(`type-${id}`).value =
          itemData.type || "general";

        const radio = document.querySelector(
          `input[name="calc-method-${id}"][value="${itemData.calcMethod}"]`
        );
        if (radio) {
          radio.checked = true;
          // Manually trigger change event to show/hide correct fields
          const event = new Event("change", { bubbles: true });
          radio.dispatchEvent(event);
        }
      });
    } else {
      addNewItem(); // 如果沒有草稿，或草稿無效，則建立一個空的
    }
  };

  function initializeUsageCounter() {
    const baseCount = 5000;
    let currentCount = localStorage.getItem("usageCount");

    if (currentCount === null) {
      currentCount = baseCount + Math.floor(Math.random() * 50);
    } else {
      currentCount = parseInt(currentCount, 10);
    }

    currentCount += Math.floor(Math.random() * 3) + 1;

    localStorage.setItem("usageCount", currentCount);
    if (usageCountSpan) {
      usageCountSpan.textContent = currentCount.toLocaleString();
    }
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
                    <div class="input-wrapper">
                        <label for="length-${itemCount}">長 (cm)</label>
                        <input type="number" id="length-${itemCount}" placeholder="單件" min="0">
                        <div class="validation-message">請輸入正數</div>
                    </div>
                    <div class="input-wrapper">
                        <label for="width-${itemCount}">寬 (cm)</label>
                        <input type="number" id="width-${itemCount}" placeholder="單件" min="0">
                        <div class="validation-message">請輸入正數</div>
                    </div>
                    <div class="input-wrapper">
                        <label for="height-${itemCount}">高 (cm)</label>
                        <input type="number" id="height-${itemCount}" placeholder="單件" min="0">
                        <div class="validation-message">請輸入正數</div>
                    </div>
                </div>
            </div>
            <div class="cbm-input-wrapper">
                 <div class="input-row">
                    <div class="input-wrapper">
                        <label for="cbm-${itemCount}">立方米 (方)</label>
                        <input type="number" id="cbm-${itemCount}" placeholder="單件" min="0">
                        <div class="validation-message">請輸入正數</div>
                    </div>
                </div>
            </div>
            <div class="input-row">
                <div class="input-wrapper">
                    <label for="weight-${itemCount}">重量 (kg)</label>
                    <input type="number" id="weight-${itemCount}" placeholder="單件" min="0">
                    <div class="validation-message">請輸入正數</div>
                </div>
                <div class="input-wrapper">
                    <label for="quantity-${itemCount}">數量</label>
                    <input type="number" id="quantity-${itemCount}" value="1" min="1">
                    <div class="validation-message">數量至少為 1</div>
                </div>
            </div>
             <div class="input-row">
                <div class="input-wrapper"><label for="type-${itemCount}">家具種類</label><select id="type-${itemCount}">${optionsHtml}</select></div>
            </div>
            ${
              itemCount > 1
                ? '<button class="btn-remove" title="移除此項">X</button>'
                : ""
            }
        `;
    itemList.appendChild(itemDiv);

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

  const validateInput = (input) => {
    const value = parseFloat(input.value);
    const min = parseFloat(input.getAttribute("min"));
    const wrapper = input.parentElement;
    const messageDiv = wrapper.querySelector(".validation-message");

    let isValid = !isNaN(value) && value >= min;

    if (isValid) {
      input.classList.remove("invalid");
      messageDiv.style.display = "none";
    } else {
      input.classList.add("invalid");
      messageDiv.style.display = "block";
    }
    return isValid;
  };

  function calculateTotal() {
    const originalBtnText = calculateBtn.innerHTML;
    calculateBtn.disabled = true;
    calculateBtn.innerHTML = `<span class="spinner"></span> 計算中...`;

    setTimeout(() => {
      resultsContainer.innerHTML = "";

      if (deliveryLocationSelect.value === "") {
        alert("請務必選擇一個配送地區！");
        calculateBtn.disabled = false;
        calculateBtn.innerHTML = originalBtnText;
        return;
      }

      let allFormsAreValid = true;
      document
        .querySelectorAll('.item-group input[type="number"]')
        .forEach((input) => {
          // 只驗證可見的輸入框
          if (input.offsetParent !== null) {
            if (!validateInput(input)) {
              allFormsAreValid = false;
            }
          }
        });

      if (!allFormsAreValid) {
        alert("部分欄位資料有誤，請檢查紅色提示的欄位。");
        calculateBtn.disabled = false;
        calculateBtn.innerHTML = originalBtnText;
        return;
      }

      const allItemsData = Array.from(document.querySelectorAll(".item-group"))
        .map((itemEl, index) => {
          // ... (原有 map 邏輯，此處省略以保持簡潔)
        })
        .filter((item) => item !== null);

      if (allItemsData.length === 0) {
        alert("請至少填寫一項完整的貨物資料！");
        calculateBtn.disabled = false;
        calculateBtn.innerHTML = originalBtnText;
        return;
      }

      // ... (原有所有計算邏輯)

      displayResults(calculationResultData);

      const proceedButton = document.createElement("button");
      proceedButton.textContent = "我要寄送 (下一步，填寫收件資料)";
      proceedButton.className = "btn btn-proceed";
      proceedButton.onclick = () => {
        /* ... */
      };
      resultsContainer.appendChild(proceedButton);

      calculateBtn.disabled = false;
      calculateBtn.innerHTML = originalBtnText;
    }, 50);
  }

  // ... displayResults 和 copyWarehouseAddress 內容不變 ...

  addItemBtn.addEventListener("click", () => {
    addNewItem();
    saveItemsToLocalStorage();
  });
  calculateBtn.addEventListener("click", calculateTotal);
  copyAddressBtn.addEventListener("click", copyWarehouseAddress);

  itemList.addEventListener("input", (e) => {
    if (e.target.tagName === "INPUT") {
      if (e.target.type === "number") {
        validateInput(e.target);
      }
      saveItemsToLocalStorage();
    }
  });
  itemList.addEventListener("change", saveItemsToLocalStorage);
  itemList.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remove")) {
      e.target.closest(".item-group").remove();
      saveItemsToLocalStorage();
    }
  });

  // --- 5. 初始載入 ---
  loadItemsFromLocalStorage();
  if (itemList.children.length === 0) {
    addNewItem();
  }
  initializeUsageCounter();
});
