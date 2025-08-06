document.addEventListener("DOMContentLoaded", () => {
  const orderForm = document.getElementById("orderForm");
  const formMessage = document.getElementById("formMessage");
  const submitButton = orderForm.querySelector('button[type="submit"]');

  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const originalBtnText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner"></span> 訂單提交中...`;

    const calculationData = JSON.parse(localStorage.getItem("calculationData"));
    if (!calculationData || !calculationData.calculationResult) {
      formMessage.textContent =
        "錯誤：找不到運費試算記錄，請返回主頁重新操作。";
      formMessage.style.color = "red";
      submitButton.disabled = false;
      submitButton.innerHTML = originalBtnText;
      return;
    }

    const recipientName = document.getElementById("recipientName").value;
    const address = document.getElementById("address").value;
    const phone = document.getElementById("phone").value;
    const idNumber = document.getElementById("idNumber").value;

    const orderData = {
      lineNickname: calculationData.lineNickname,
      recipientName,
      address,
      phone,
      idNumber,
      calculationResult: calculationData.calculationResult,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || "伺服器回應錯誤，訂單提交失敗。");
      }

      const result = await response.json();
      console.log("訂單成功建立:", result);

      orderForm.style.display = "none";
      formMessage.innerHTML = `
                <h2 style="color: green;">您的訂單已成功提交！</h2>
                <p>我們的客服人員將會透過您提供的 LINE 暱稱與您聯繫後續事宜。</p>
                <p>感謝您的使用！</p>
                <a href="/" class="btn">返回首頁</a>
            `;
      localStorage.removeItem("calculationData");
      localStorage.removeItem("draftItems");
    } catch (error) {
      console.error("提交訂單時發生錯誤:", error);
      formMessage.textContent = `提交失敗，請稍後再試或直接聯繫客服。錯誤訊息: ${error.message}`;
      formMessage.style.color = "red";
      submitButton.disabled = false;
      submitButton.innerHTML = originalBtnText;
    }
  });
});
