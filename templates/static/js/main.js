// ======================================================
//  LECTURA DE TAREAS SUGERIDAS (JSON EMBEBIDO)
// ======================================================
let TASKS = [];
const tasksScript = document.getElementById("tasks-data");

if (tasksScript) {
  try {
    const raw = tasksScript.textContent.trim() || "[]";
    TASKS = JSON.parse(raw);
  } catch (e) {
    console.error("Error parseando tasks-data:", e);
    TASKS = [];
  }
}

// Mapa para autocompletar tiempo y prioridad al elegir una tarea
const TASKS_MAP = TASKS.reduce((acc, t) => {
  if (t.name) {
    acc[t.name.toLowerCase()] = {
      time: t.time || 1,
      priority: t.priority || 1,
    };
  }
  return acc;
}, {});

// ======================================================
//  ELEMENTOS DEL FORMULARIO
// ======================================================
const descInput  = document.getElementById("description");
const timeInput  = document.getElementById("prep_time");
const prioSelect = document.getElementById("priority");
const sugList    = document.getElementById("order-suggestions");

// ======================================================
//  RENDER DE LA LISTA DESPLEGABLE / SUGERENCIAS
// ======================================================
function renderSuggestions(filterText) {
  if (!sugList) return;

  const q = (filterText || "").trim().toLowerCase();
  sugList.innerHTML = "";

  let matches = TASKS;
  if (q) {
    matches = TASKS.filter((t) =>
      t.name.toLowerCase().includes(q)
    );
  }

  if (matches.length === 0) {
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
      ev.preventDefault();
      if (descInput) descInput.value = t.name;
      if (timeInput) timeInput.value = t.time;
      if (prioSelect) prioSelect.value = t.priority;
      sugList.style.display = "none";
    });
    sugList.appendChild(li);
  });

  sugList.style.display = "block";
}

// Eventos sobre el input de descripción
if (descInput && sugList) {
  descInput.addEventListener("input", () => {
    const v = descInput.value;
    if (!v.trim()) {
      sugList.style.display = "none";
      return;
    }
    renderSuggestions(v);
  });

  descInput.addEventListener("focus", () => {
    const v = descInput.value;
    if (v.trim()) {
      renderSuggestions(v);
    } else {
      renderSuggestions("");
    }
  });

  descInput.addEventListener("blur", () => {
    setTimeout(() => {
      sugList.style.display = "none";
    }, 120);
  });

  descInput.addEventListener("change", () => {
    const v = (descInput.value || "").trim().toLowerCase();
    const info = TASKS_MAP[v];
    if (info) {
      if (timeInput) timeInput.value = info.time;
      if (prioSelect) prioSelect.value = info.priority;
    }
  });
}

// Cerrar lista si se hace click fuera
document.addEventListener("click", (ev) => {
  if (!sugList) return;
  if (ev.target !== descInput && !sugList.contains(ev.target)) {
    sugList.style.display = "none";
  }
});

// ======================================================
//  AUTO-SCROLL DEL LOG
// ======================================================
const logsBox = document.getElementById("logs-box");
if (logsBox) {
  logsBox.scrollTop = logsBox.scrollHeight;
}

// ==============================
//  POLLING PARA ACTUALIZAR ÓRDENES Y LOGS EN TIEMPO REAL
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  function actualizarEstado() {
    fetch("/estado-json")
      .then((r) => r.json())
      .then((data) => {
        // Actualizar logs
        const logsBox = document.getElementById("logs-box");
        if (logsBox && Array.isArray(data.logs)) {
          // Solo pintamos exactamente lo que el backend ya tiene
          logsBox.innerHTML = "";
          data.logs.forEach((linea) => {
            const div = document.createElement("div");
            div.textContent = linea;
            logsBox.appendChild(div);
          });
          logsBox.scrollTop = logsBox.scrollHeight;
        }

        // Actualizar tabla de órdenes
        const tbody = document.getElementById("orders-tbody");
        if (tbody && Array.isArray(data.orders)) {
          tbody.innerHTML = "";
          data.orders.forEach((o) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${o.id}</td>
              <td>${o.description}</td>
              <td>${o.prep_time}</td>
              <td>${o.priority}</td>
              <td>${o.worker_id ?? ""}</td>
              <td>${o.status}</td>
            `;
            tbody.appendChild(tr);
          });
        }

        // (Opcional) Si quieres saber visualmente si aún está procesando:
        // const badge = document.getElementById("processing-badge");
        // if (badge) {
        //   badge.style.display = data.processing ? "inline-block" : "none";
        // }
      })
      .catch((err) => {
        console.error("Error consultando /estado-json:", err);
      });
  }

// Refrescar estado cada 1 segundo (1000 ms)
setInterval(actualizarEstado, 1000);
});
