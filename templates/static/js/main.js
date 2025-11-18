document.addEventListener("DOMContentLoaded", () => {
  // ====== Cargar tareas desde el JSON embebido ======
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

  // Mapa nombre -> {time, priority}
  const TASKS_MAP = TASKS.reduce((acc, t) => {
    if (t && t.name) {
      acc[t.name.toLowerCase()] = {
        time: t.time || 1,
        priority: t.priority || 1,
      };
    }
    return acc;
  }, {});

  const descInput   = document.getElementById("description");
  const timeInput   = document.getElementById("prep_time");
  const prioSelect  = document.getElementById("priority");
  const sugList     = document.getElementById("order-suggestions");
  const dropdownBtn = document.getElementById("btn-desc-dropdown");

  // ====== Sugerencias bajo Trabajo / orden ======
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

      // Al hacer click en una sugerencia
      li.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
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
    // Mientras se escribe, filtra sugerencias
    descInput.addEventListener("input", () => {
      const v = descInput.value;
      if (!v.trim()) {
        sugList.style.display = "none";
        return;
      }
      renderSuggestions(v);
    });

    // Al enfocar, muestra sugerencias según lo escrito
    descInput.addEventListener("focus", () => {
      const v = descInput.value;
      if (v.trim()) {
        renderSuggestions(v);
      }
    });

    // Al salir del campo, cerrar sugerencias con un pequeño delay
    descInput.addEventListener("blur", () => {
      setTimeout(() => {
        sugList.style.display = "none";
      }, 120);
    });

    // Si se escribe EXACTAMENTE el nombre de una tarea, carga tiempo/prioridad
    descInput.addEventListener("change", () => {
      const v = (descInput.value || "").trim().toLowerCase();
      const info = TASKS_MAP[v];
      if (info) {
        if (timeInput) timeInput.value = info.time;
        if (prioSelect) prioSelect.value = info.priority;
      }
    });

    // Cerrar sugerencias si se hace click fuera
    document.addEventListener("click", (ev) => {
      if (
        ev.target !== descInput &&
        ev.target !== sugList &&
        !sugList.contains(ev.target)
      ) {
        sugList.style.display = "none";
      }
    });
  }

  // ====== Botoncito ▾ para abrir lista completa ======
  if (dropdownBtn && sugList && descInput) {
    dropdownBtn.addEventListener("click", () => {
      // si ya está visible, la cerramos
      if (sugList.style.display === "block") {
        sugList.style.display = "none";
        return;
      }
      // mostrar todas las tareas sin filtro
      renderSuggestions("");
      descInput.focus();
    });
  }

  // ====== Botón Actualizar (recarga la página) + ocultarlo si ya no hay pendientes ======
  const refreshBtn = document.getElementById("btn-refresh");
  const ordersWrapper = document.querySelector(".card-orders .table-wrapper");

  // Auto-scroll de la tabla para que siempre se vea lo último
  if (ordersWrapper) {
    ordersWrapper.scrollTop = ordersWrapper.scrollHeight;
  }

  if (refreshBtn) {
    // Revisar si hay alguna orden NO completada
    const estados = Array.from(
      document.querySelectorAll("#orders-tbody tr td:nth-child(5)")
    );
    const hasPending = estados.some((td) =>
      td.textContent.trim().toLowerCase() !== "completada"
    );

    // Si todas están completadas, esconder el botón
    if (!hasPending) {
      refreshBtn.style.display = "none";
    } else {
      refreshBtn.style.display = "inline-block";
      refreshBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }
  }

  // ====== Auto-scroll de logs al final ======
  const logsBox = document.getElementById("logs-box");
  if (logsBox) {
    logsBox.scrollTop = logsBox.scrollHeight;
  }
});
