(function () {
  "use strict";

  var modal = document.getElementById("relatorio-modal");
  if (!modal) return;

  var form = document.getElementById("relatorio-form");
  var emailInput = document.getElementById("relatorio-email");
  var whatsappInput = document.getElementById("relatorio-whatsapp");
  var submitBtn = document.getElementById("relatorio-submit");
  var errorEl = document.getElementById("relatorio-error");
  var STORAGE_KEY = "datatirze_relatorio_modal_dismissed";

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function isValidWhatsapp(value) {
    var digits = digitsOnly(value);
    if (/^55\d{10,11}$/.test(digits)) return true;
    if (/^\d{10,11}$/.test(digits)) return true;
    return false;
  }

  function formatWhatsapp(value) {
    var digits = digitsOnly(value).slice(0, 13);
    if (digits.indexOf("55") === 0 && digits.length > 11) {
      digits = digits.slice(0, 13);
    } else {
      digits = digits.slice(0, 11);
    }

    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length <= 10) {
      return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
    }
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 3) + " " + digits.slice(3, 7) + "-" + digits.slice(7);
  }

  function updateButtonState() {
    var emailOk = isValidEmail(emailInput.value);
    var whatsappOk = isValidWhatsapp(whatsappInput.value);
    emailInput.classList.toggle("is-invalid", emailInput.value.trim() !== "" && !emailOk);
    whatsappInput.classList.toggle("is-invalid", whatsappInput.value.trim() !== "" && !whatsappOk);
    submitBtn.disabled = !(emailOk && whatsappOk) || submitBtn.dataset.loading === "1";
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("relatorio-modal-open");
  }

  function closeModal(persist) {
    modal.hidden = true;
    document.body.classList.remove("relatorio-modal-open");
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {}
    }
  }

  whatsappInput.addEventListener("input", function () {
    var cursor = whatsappInput.selectionStart;
    var before = whatsappInput.value.length;
    whatsappInput.value = formatWhatsapp(whatsappInput.value);
    var after = whatsappInput.value.length;
    if (document.activeElement === whatsappInput) {
      var next = Math.max(0, (cursor || 0) + (after - before));
      try {
        whatsappInput.setSelectionRange(next, next);
      } catch (e) {}
    }
    updateButtonState();
  });

  emailInput.addEventListener("input", updateButtonState);

  modal.querySelectorAll("[data-close-relatorio-modal]").forEach(function (el) {
    el.addEventListener("click", function () {
      closeModal(true);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) closeModal(true);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    errorEl.textContent = "";

    var email = emailInput.value.trim().toLowerCase();
    var whatsapp = digitsOnly(whatsappInput.value);

    if (!isValidEmail(email) || !isValidWhatsapp(whatsapp)) {
      updateButtonState();
      errorEl.textContent = "Preencha um e-mail e um WhatsApp válidos.";
      return;
    }

    submitBtn.dataset.loading = "1";
    submitBtn.disabled = true;
    submitBtn.querySelector("span").textContent = "BAIXANDO...";

    try {
      var response = await fetch("/api/relatorio-pesquisa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, whatsapp: whatsapp }),
      });

      if (!response.ok) {
        var payload = await response.json().catch(function () {
          return { error: "Não foi possível baixar o relatório." };
        });
        throw new Error(payload.error || "Não foi possível baixar o relatório.");
      }

      var blob = await response.blob();
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "pesquisa-nacional-queridinhas-datatirze-2026.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {}
      closeModal(false);
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Erro ao baixar o relatório.";
    } finally {
      submitBtn.dataset.loading = "0";
      submitBtn.querySelector("span").textContent = "BAIXAR PESQUISA";
      updateButtonState();
    }
  });

  updateButtonState();

  var dismissed = false;
  try {
    dismissed = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {}

  if (!dismissed) {
    setTimeout(openModal, 700);
  }
})();
