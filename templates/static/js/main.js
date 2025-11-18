document.addEventListener("DOMContentLoaded", () => {
  // ====== 1. Cargar tareas desde el JSON embebido ======
  let TASKS = [];
  const tasksScript = document.getElementById("tasks-data");
  if (tasksScript) {
    try {
      const raw = tasksScript.textContent.trim() || "[]";
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        TASKS = parsed;
      }
    } catch (e) {
      console.error("No se pudo parsear tasks-data:", e);
      TASKS = [];
    }
  }

  // Mapa: nombre en minúsculas -> { time, priority }
  const TASKS_MAP = TASKS.reduce((acc, t) => {
    if (t && t.name) {
      acc[t.name.toLowerCase()] = {
        time: t.time || 1,
        priority: t.priority || 1,
      };
    }
    return acc;
  }, {});

  // Referencias a elementos principales del formulario
  const descInput   = document.getElementById("description");
  const timeInput   = document.getElementById("prep_time");
  const prioSelect  = document.getElementById("priority");
  const sugList     = document.getElementById("order-suggestions");
  const dropdownBtn = document.getElementById("btn-desc-dropdown");

  // ====== 2. Lógica de sugerencias para Trabajo / orden ======
  function renderSuggestions(filterText) {
    if (!sugList || !descInput) return;

    const q = (filterText || "").trim().toLowerCase();
    sugList.innerHTML = "";

    let matches = TASKS;
    if (q) {
      matches = TASKS.filter((t) =>
        (t.name || "").toLowerCase().includes(q)
      );
    }

    if (!matches.length) {
      const li = document.createElement("li");
      li.textContent = "Sin coincidencias";
      li.classList.add("empty");
      sugList.appendChild(li);
      sugList.style.display = "block";
      return;
    }

    matches.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t.name;

      li.addEventListener("mousedown", (ev) => {
        ev.preventDefault(); // evita perder el foco antes de asignar
        descInput.value = t.name || "";

        if (timeInput && t.time != null) {
          timeInput.value = t.time;
        }
        if (prioSelect && t.priority != null) {
          prioSelect.value = String(t.priority);
        }

        sugList.style.display = "none";
      });

      sugList.appendChild(li);
    });

    sugList.style.display = "block";
  }

  if (descInput && sugList) {
    // Cuando escribe, filtramos
    descInput.addEventListener("input", () => {
      const v = descInput.value;
      if (!v.trim()) {
        sugList.style.display = "none";
        return;
      }
      renderSuggestions(v);
    });

    // Al enfocar el campo, mostramos sugerencias (según lo escrito)
    descInput.addEventListener("focus", () => {
      const v = descInput.value;
      renderSuggestions(v);
    });

    // Al salir del campo cerramos con un pequeño delay
    descInput.addEventListener("blur", () => {
      setTimeout(() => {
        sugList.style.display = "none";
      }, 120);
    });

    // Si escribe exactamente el nombre de una tarea, rellenamos tiempo y prioridad
    descInput.addEventListener("change", () => {
      const v = (descInput.value || "").trim().toLowerCase();
      const info = TASKS_MAP[v];
      if (info) {
        if (timeInput) timeInput.value = info.time;
        if (prioSelect) prioSelect.value = String(info.priority);
      }
    });

    // Cerrar sugerencias si hace click fuera
    document.addEventListener("click", (ev) => {
      if (
        ev.target !== descInput &&
        ev.target !== sugList &&
        !sugList.contains(ev.target) &&
        ev.target !== dropdownBtn
      ) {
        sugList.style.display = "none";
      }
    });
  }

  // Botón ▾ para abrir lista (tipo select)
  if (dropdownBtn && sugList && descInput) {
    dropdownBtn.addEventListener("click", () => {
      if (sugList.style.display === "block") {
        sugList.style.display = "none";
        return;
      }
      // Mostrar todas las tareas o filtradas por lo que haya escrito
      const v = descInput.value;
      renderSuggestions(v);
      descInput.focus();
    });
  }

  // ====== 3. Botón Actualizar y auto-scroll de tabla ======
  const refreshBtn     = document.getElementById("btn-refresh");
  const ordersWrapper  = document.querySelector(".card-orders .table-wrapper");

  if (ordersWrapper) {
    ordersWrapper.scrollTop = ordersWrapper.scrollHeight;
  }

  if (refreshBtn) {
    const estados = Array.from(
      document.querySelectorAll("#orders-tbody tr td:nth-child(5)")
    );
    const hasPending = estados.some((td) =>
      td.textContent.trim().toLowerCase() !== "completada"
    );

    if (!hasPending) {
      refreshBtn.style.display = "none";
    } else {
      refreshBtn.style.display = "inline-block";
      refreshBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }
  }

  // ====== 4. Auto-scroll de logs ======
  const logsBox = document.getElementById("logs-box");
  if (logsBox) {
    logsBox.scrollTop = logsBox.scrollHeight;
  }

  // ====== 5. Validación: Agregar orden solo con 3 campos diligenciados ======
  const addOrderForm = document.getElementById("add-order-form");

  function camposFormularioValidos() {
    const descVal = descInput ? descInput.value.trim() : "";
    const timeVal = timeInput ? timeInput.value.trim() : "";
    const prioVal = prioSelect ? prioSelect.value : "";

    const timeNum = parseInt(timeVal, 10);

    if (!descVal || !timeVal || isNaN(timeNum) || timeNum <= 0 || !prioVal) {
      return false;
    }
    return true;
  }

  if (addOrderForm) {
    addOrderForm.addEventListener("submit", (ev) => {
      if (!camposFormularioValidos()) {
        ev.preventDefault();
        alert(
          "Para agregar una orden debes diligenciar:\n" +
          "- Trabajo / orden\n" +
          "- Tiempo de Orden (mayor a 0)\n" +
          "- Prioridad."
        );
      }
    });
  }

  // ====== 6. Validación y flujo doble: Procesar órdenes ======
  // Este es el form pequeño que está al lado del botón Agregar
  const processForm = document.querySelector(".form-actions-row form[action]");
  if (processForm) {
    processForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();

      const tbody   = document.getElementById("orders-tbody");
      const hasRows = tbody && tbody.querySelectorAll("tr").length > 0;
      const formOk  = camposFormularioValidos();

      // Si NO hay filas y NO hay formulario diligenciado -> no se puede procesar
      if (!hasRows && !formOk) {
        alert(
          "No hay órdenes para procesar.\n" +
          "Primero registra al menos una orden diligenciando los 3 campos."
        );
        return;
      }

      // Si el formulario está diligenciado, primero agregamos la orden vía fetch
      if (formOk && addOrderForm && addOrderForm.action) {
        try {
          const formData = new FormData(addOrderForm);
          const resp = await fetch(addOrderForm.action, {
            method: "POST",
            body: formData,
          });

          if (!resp.ok) {
            console.error("Error al agregar la orden antes de procesar:", resp.status);
            alert("Ocurrió un error agregando la orden. Intenta nuevamente.");
            return;
          }
        } catch (err) {
          console.error("Error de red al agregar la orden:", err);
          alert("Ocurrió un error de red agregando la orden. Intenta nuevamente.");
          return;
        }
      }

      // Ahora sí, enviamos el form de procesar órdenes al backend
      processForm.submit();
    });
  }
});
