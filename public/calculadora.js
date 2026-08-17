(function () {
  "use strict";

  var MASS_OPTIONS = [5, 10, 15, 20, 30, 60];
  var DILUENT_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];
  var DOSE_OPTIONS = [0.25, 0.5, 1, 1.7, 2, 2.4, 2.5, 4, 5, 7.5, 10, 12, 12.5, 15];
  var SYRINGES = [
    { id: "03", label: ".3 mL", units: 30, ml: 0.3 },
    { id: "05", label: ".5 mL", units: 50, ml: 0.5 },
    { id: "10", label: "1 mL", units: 100, ml: 1 },
  ];

  var state = {
    mass: 15,
    massCustom: false,
    diluent: 0.5,
    diluentCustom: false,
    syringeId: "10",
    dose: 2.5,
    doseCustom: false,
  };

  var els = {
    massOptions: document.getElementById("mass-options"),
    diluentOptions: document.getElementById("diluent-options"),
    doseOptions: document.getElementById("dose-options"),
    syringeOptions: document.getElementById("syringe-options"),
    massCustom: document.getElementById("mass-custom"),
    diluentCustom: document.getElementById("diluent-custom"),
    doseCustom: document.getElementById("dose-custom"),
    massCustomInput: document.getElementById("mass-custom-input"),
    diluentCustomInput: document.getElementById("diluent-custom-input"),
    doseCustomInput: document.getElementById("dose-custom-input"),
    volumeDisplay: document.getElementById("volume-display"),
    volumeMl: document.getElementById("volume-ml"),
    volumeUnits: document.getElementById("volume-units"),
    stickyBar: document.getElementById("calc-sticky-bar"),
    stickyUnits: document.getElementById("sticky-units"),
    concentrationDisplay: document.getElementById("concentration-display"),
    dosesDisplay: document.getElementById("doses-display"),
    warning: document.getElementById("calc-warning"),
    tableBody: document.getElementById("dose-table-body"),
    syringeFill: document.getElementById("syringe-fill"),
    syringePlunger: document.getElementById("syringe-plunger"),
    syringeRod: document.getElementById("syringe-rod"),
    syringeFlange: document.getElementById("syringe-flange"),
    syringeLabel: document.getElementById("syringe-label"),
    syringeTicks: document.getElementById("syringe-ticks"),
    btnCopy: document.getElementById("btn-copy"),
    btnWhatsapp: document.getElementById("btn-whatsapp"),
    btnPrint: document.getElementById("btn-print"),
    btnReset: document.getElementById("btn-reset"),
  };

  function formatMg(value) {
    return Number(value).toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    }) + " mg";
  }

  function formatMl(value) {
    if (!isFinite(value)) return "—";
    var rounded = Math.round(value * 1000) / 1000;
    var text = rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    if (text.charAt(0) === "0") text = text.slice(1);
    return text + " mL";
  }

  function formatUnits(value) {
    if (!isFinite(value)) return "—";
    var rounded = Math.round(value * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
      return Math.round(rounded) + " UI";
    }
    return rounded.toFixed(1).replace(".", ",") + " UI";
  }

  function getSyringe() {
    return SYRINGES.find(function (s) {
      return s.id === state.syringeId;
    }) || SYRINGES[2];
  }

  function getMass() {
    if (state.massCustom) {
      var v = parseFloat(els.massCustomInput.value);
      return isFinite(v) && v > 0 ? v : null;
    }
    return state.mass;
  }

  function getDiluent() {
    if (state.diluentCustom) {
      var v = parseFloat(els.diluentCustomInput.value);
      return isFinite(v) && v > 0 ? v : null;
    }
    return state.diluent;
  }

  function getDose() {
    if (state.doseCustom) {
      var v = parseFloat(els.doseCustomInput.value);
      if (!isFinite(v) || v <= 0) return null;
      return Math.min(v, 15);
    }
    return state.dose;
  }

  function calculate(mass, diluent, dose, syringe) {
    if (!mass || !diluent || !dose || !syringe) return null;
    var concentration = mass / diluent;
    var volumeMl = dose / concentration;
    var units = volumeMl * 100; // U-100: 1 mL = 100 UI
    var dosesInVial = mass / dose;
    return {
      concentration: concentration,
      volumeMl: volumeMl,
      units: units,
      dosesInVial: dosesInVial,
      exceedsSyringe: units > syringe.units + 0.05,
      doseExceedsVial: dose > mass + 0.0001,
    };
  }

  function buildChips(container, values, unit, activeValue, isCustom, onSelect, onCustom) {
    container.innerHTML = "";
    values.forEach(function (value) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calc-chip" + (!isCustom && value === activeValue ? " is-active" : "");
      btn.textContent = unit === "mg" ? formatMg(value).replace(" mg", "mg") : value + "mL";
      btn.addEventListener("click", function () {
        onSelect(value);
      });
      container.appendChild(btn);
    });
    var other = document.createElement("button");
    other.type = "button";
    other.className = "calc-chip" + (isCustom ? " is-active" : "");
    other.textContent = "Outro";
    other.addEventListener("click", onCustom);
    container.appendChild(other);
  }

  function buildSyringes() {
    els.syringeOptions.innerHTML = "";
    SYRINGES.forEach(function (syringe) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calc-syringe-card" + (state.syringeId === syringe.id ? " is-active" : "");
      btn.innerHTML =
        "<strong>" +
        syringe.label +
        "</strong><span>" +
        syringe.units +
        " Units</span>";
      btn.addEventListener("click", function () {
        state.syringeId = syringe.id;
        render();
      });
      els.syringeOptions.appendChild(btn);
    });
  }

  function drawTicks(maxUnits) {
    els.syringeTicks.innerHTML = "";
    var barrelTop = 50;
    var barrelHeight = 300;
    var step = maxUnits <= 30 ? 5 : maxUnits <= 50 ? 5 : 10;
    for (var u = 0; u <= maxUnits; u += step) {
      var y = barrelTop + barrelHeight - (u / maxUnits) * barrelHeight;
      var major = u % (step * 2) === 0 || u === maxUnits || u === 0;
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", major ? "42" : "48");
      line.setAttribute("x2", "54");
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      line.setAttribute("stroke", "#64748b");
      line.setAttribute("stroke-width", major ? "1.5" : "1");
      els.syringeTicks.appendChild(line);

      if (major) {
        var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "34");
        text.setAttribute("y", String(y + 3));
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-size", "8");
        text.setAttribute("fill", "#64748b");
        text.textContent = String(u);
        els.syringeTicks.appendChild(text);
      }
    }
  }

  function updateSyringeVisual(units, maxUnits) {
    var barrelTop = 50;
    var barrelHeight = 300;
    var clamped = Math.max(0, Math.min(units || 0, maxUnits));
    var ratio = maxUnits > 0 ? clamped / maxUnits : 0;
    var y = barrelTop + barrelHeight - ratio * barrelHeight;
    var fillHeight = ratio * barrelHeight;

    els.syringeFill.setAttribute("y", String(y));
    els.syringeFill.setAttribute("height", String(fillHeight));
    els.syringePlunger.setAttribute("y1", String(y));
    els.syringePlunger.setAttribute("y2", String(y));
    els.syringeRod.setAttribute("y", String(y));
    els.syringeRod.setAttribute("height", String(Math.max(12, 400 - y - 18)));
    els.syringeFlange.setAttribute("y", String(Math.min(400, y + Math.max(12, 400 - y - 18))));
    els.syringeLabel.setAttribute("y", String(y + 4));
    els.syringeLabel.textContent = isFinite(units) ? String(Math.round(units * 10) / 10) : "0";
  }

  function buildComparisonTable(mass, diluent, selectedDose, syringe) {
    els.tableBody.innerHTML = "";
    if (!mass || !diluent) return;

    var doses = DOSE_OPTIONS.slice();
    if (selectedDose && doses.indexOf(selectedDose) === -1) {
      doses.push(selectedDose);
      doses.sort(function (a, b) {
        return a - b;
      });
    }

    doses.forEach(function (dose) {
      if (dose > mass) return;
      var result = calculate(mass, diluent, dose, syringe);
      if (!result) return;
      var tr = document.createElement("tr");
      if (selectedDose && Math.abs(dose - selectedDose) < 0.0001) {
        tr.className = "is-selected";
      }
      tr.innerHTML =
        "<td>" +
        formatMg(dose) +
        "</td><td>" +
        formatMl(result.volumeMl) +
        "</td><td>" +
        formatUnits(result.units).replace(" UI", "") +
        "</td>";
      els.tableBody.appendChild(tr);
    });
  }

  function calculatorUrl() {
    return window.location.origin + "/calculadora";
  }

  function buildSummaryText(mass, diluent, dose, syringe, result) {
    return [
      "Qual a Minha Dose? — DataTirze",
      "Frasco: " + formatMg(mass),
      "Diluente: " + diluent + " mL",
      "Seringa: " + syringe.label + " (" + syringe.units + " UI)",
      "Dose: " + formatMg(dose),
      "Concentração: " + result.concentration.toFixed(2).replace(".", ",") + " mg/mL",
      "Volume: " + formatMl(result.volumeMl),
      "Marcar na seringa: " + formatUnits(result.units),
      "Doses no frasco: ~" + Math.floor(result.dosesInVial * 10) / 10,
      "",
      "Calcule a sua dose também: " + calculatorUrl(),
      "",
      "Ferramenta informativa. Não substitui orientação profissional.",
    ].join("\n");
  }

  function render() {
    buildChips(
      els.massOptions,
      MASS_OPTIONS,
      "mg",
      state.mass,
      state.massCustom,
      function (value) {
        state.mass = value;
        state.massCustom = false;
        els.massCustom.hidden = true;
        render();
      },
      function () {
        state.massCustom = true;
        els.massCustom.hidden = false;
        els.massCustomInput.focus();
        render();
      }
    );

    buildChips(
      els.diluentOptions,
      DILUENT_OPTIONS,
      "mL",
      state.diluent,
      state.diluentCustom,
      function (value) {
        state.diluent = value;
        state.diluentCustom = false;
        els.diluentCustom.hidden = true;
        render();
      },
      function () {
        state.diluentCustom = true;
        els.diluentCustom.hidden = false;
        els.diluentCustomInput.focus();
        render();
      }
    );

    buildChips(
      els.doseOptions,
      DOSE_OPTIONS,
      "mg",
      state.dose,
      state.doseCustom,
      function (value) {
        state.dose = value;
        state.doseCustom = false;
        els.doseCustom.hidden = true;
        render();
      },
      function () {
        state.doseCustom = true;
        els.doseCustom.hidden = false;
        els.doseCustomInput.focus();
        render();
      }
    );

    buildSyringes();

    var mass = getMass();
    var diluent = getDiluent();
    var dose = getDose();
    var syringe = getSyringe();
    drawTicks(syringe.units);

    var result = calculate(mass, diluent, dose, syringe);
    if (!result) {
      if (els.volumeMl) els.volumeMl.textContent = "—";
      if (els.volumeUnits) els.volumeUnits.textContent = "—";
      els.concentrationDisplay.textContent = "—";
      els.dosesDisplay.textContent = "—";
      els.warning.hidden = true;
      if (els.stickyBar) els.stickyBar.hidden = true;
      updateSyringeVisual(0, syringe.units);
      buildComparisonTable(mass, diluent, dose, syringe);
      return;
    }

    if (els.volumeMl) els.volumeMl.textContent = formatMl(result.volumeMl).replace(" mL", "mL");
    if (els.volumeUnits) els.volumeUnits.textContent = formatUnits(result.units).replace(" UI", " Units");
    els.concentrationDisplay.textContent =
      (Math.round(result.concentration * 100) / 100).toLocaleString("pt-BR") + " mg/mL";

    var dosesRounded = Math.floor(result.dosesInVial * 10) / 10;
    els.dosesDisplay.innerHTML =
      '<span class="calc-doses-pill">' +
      dosesRounded +
      "</span> de " +
      formatMg(dose);

    var warnings = [];
    if (result.doseExceedsVial) {
      warnings.push("A dose desejada é maior que o conteúdo do frasco.");
    }
    if (result.exceedsSyringe) {
      warnings.push(
        "O volume calculado (" +
          formatUnits(result.units) +
          ") ultrapassa a capacidade da seringa (" +
          syringe.units +
          " UI). Escolha uma seringa maior ou ajuste a reconstituição."
      );
    }
    if (warnings.length) {
      els.warning.hidden = false;
      els.warning.textContent = warnings.join(" ");
    } else {
      els.warning.hidden = true;
    }

    updateSyringeVisual(result.units, syringe.units);
    buildComparisonTable(mass, diluent, dose, syringe);

    if (els.stickyBar && els.stickyUnits) {
      els.stickyUnits.textContent = formatUnits(result.units);
      els.stickyBar.hidden = false;
    }

    var summary = buildSummaryText(mass, diluent, dose, syringe, result);
    els.btnWhatsapp.href =
      "https://wa.me/?text=" + encodeURIComponent(summary);
    els.btnCopy.dataset.summary = summary;
  }

  els.massCustomInput.addEventListener("input", render);
  els.diluentCustomInput.addEventListener("input", render);
  els.doseCustomInput.addEventListener("input", render);

  els.btnCopy.addEventListener("click", function () {
    var text = els.btnCopy.dataset.summary || "";
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        els.btnCopy.textContent = "Copiado!";
        setTimeout(function () {
          els.btnCopy.textContent = "Copiar";
        }, 1600);
      });
    }
  });

  els.btnPrint.addEventListener("click", function () {
    window.print();
  });

  els.btnReset.addEventListener("click", function () {
    state = {
      mass: 15,
      massCustom: false,
      diluent: 0.5,
      diluentCustom: false,
      syringeId: "10",
      dose: 2.5,
      doseCustom: false,
    };
    els.massCustom.hidden = true;
    els.diluentCustom.hidden = true;
    els.doseCustom.hidden = true;
    els.massCustomInput.value = "";
    els.diluentCustomInput.value = "";
    els.doseCustomInput.value = "";
    render();
  });

  var helpModal = document.getElementById("calc-help-modal");
  var helpBtn = document.getElementById("btn-help-info");

  function openHelpModal() {
    if (!helpModal) return;
    helpModal.hidden = false;
    document.body.classList.add("calc-modal-open");
  }

  function closeHelpModal() {
    if (!helpModal) return;
    helpModal.hidden = true;
    document.body.classList.remove("calc-modal-open");
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", openHelpModal);
  }
  if (helpModal) {
    helpModal.querySelectorAll("[data-close-help-modal]").forEach(function (el) {
      el.addEventListener("click", closeHelpModal);
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && helpModal && !helpModal.hidden) {
      closeHelpModal();
    }
  });

  render();
})();
