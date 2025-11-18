import threading
import queue
import time 

# ==============================
#  MODELO DE ORDEN
# ==============================

class Order:
    def __init__(self, order_id, description, prep_time_minutes, priority_value):
        self.id = order_id
        self.description = description
        self.prep_time = prep_time_minutes      # "tiempo lógico" (1..N)
        self.priority = priority_value          # 1 baja, 2 media, 3 alta
        self.status = "Pendiente"               # Pendiente / En proceso / Completada
        self.worker_id = None                   # Taller que la atendió (1, 2 o 3)


# ==============================
#  ESTADO GLOBAL
# ==============================

_orders = []           # lista de Order
_logs = []             # lista de strings
_next_id = 1           # contador simple de IDs
_state_lock = threading.Lock()

# Tareas típicas para sugerir en el cajón "Trabajo / orden"
_TASKS = [
    # ==== PRIORIDAD 1 (BAJA) ====
    {"name": "Lavado general",               "time": 40,  "priority": 1},
    {"name": "Revisión general básica",      "time": 50,  "priority": 1},
    {"name": "Inspección visual externa",    "time": 35,  "priority": 1},
    {"name": "Limpieza de filtros",          "time": 45,  "priority": 1},
    {"name": "Chequeo de niveles",           "time": 30,  "priority": 1},
    {"name": "Revisión de luces",            "time": 30,  "priority": 1},
    {"name": "Aspirado interior",            "time": 40,  "priority": 1},
    {"name": "Lubricación de partes menores","time": 50,  "priority": 1},
    {"name": "Lavado de motor superficial",  "time": 45,  "priority": 1},

    # ==== PRIORIDAD 2 (MEDIA) ====
    {"name": "Cambio de aceite",             "time": 50,  "priority": 2},
    {"name": "Cambio de bujías",             "time": 55,  "priority": 2},
    {"name": "Alineación y balanceo",        "time": 70,  "priority": 2},
    {"name": "Cambio de llanta",             "time": 40,  "priority": 2},
    {"name": "Revisión de suspensión",       "time": 65,  "priority": 2},
    {"name": "Ajuste de dirección",          "time": 60,  "priority": 2},
    {"name": "Escaneo electrónico",          "time": 45,  "priority": 2},
    {"name": "Cambio de filtro de aire",     "time": 50,  "priority": 2},
    {"name": "Purgado de sistema de frenos", "time": 70,  "priority": 2},

    # ==== PRIORIDAD 3 (ALTA) ====
    {"name": "Revisión de frenos completa",  "time": 90,  "priority": 3},
    {"name": "Diagnóstico de motor crítico", "time": 120, "priority": 3},
    {"name": "Reparación de fugas",          "time": 100, "priority": 3},
    {"name": "Reparación del sistema eléctrico", "time": 110, "priority": 3},
    {"name": "Cambio de bomba de agua",      "time": 95,  "priority": 3},
    {"name": "Ajuste de inyección",          "time": 100, "priority": 3},
    {"name": "Sistema de refrigeración",     "time": 105, "priority": 3},
    {"name": "Revisión de transmisión",      "time": 115, "priority": 3},
    {"name": "Frenos ABS – diagnóstico",     "time": 120, "priority": 3},
]


def _generate_order_id():
    global _next_id
    with _state_lock:
        current = _next_id
        _next_id += 1
    return current


def get_state():
    """Devuelve snapshot de órdenes y logs."""
    with _state_lock:
        return list(_orders), list(_logs)


def get_tasks():
    """Devuelve las tareas típicas para armar la lista sugerida en el front."""
    return list(_TASKS)


def add_order(description, prep_time, priority):
    """Crea una nueva orden y la agrega a la lista (en estado Pendiente)."""
    desc = (description or "").strip()
    if not desc:
        desc = "Orden sin descripción"

    try:
        prep_time = int(prep_time)
    except Exception:
        prep_time = 1

    try:
        priority = int(priority)
    except Exception:
        priority = 1

    if prep_time < 1:
        prep_time = 1
    if priority < 1:
        priority = 1
    if priority > 3:
        priority = 3

    order_id = _generate_order_id()
    new_order = Order(order_id, desc, prep_time, priority)

    with _state_lock:
        _orders.append(new_order)

    return new_order


def reset_state():
    """Borra todas las órdenes y logs, y reinicia el contador de IDs."""
    global _orders, _logs, _next_id
    with _state_lock:
        _orders = []
        _logs = []
        _next_id = 1


# ==============================
#  LÓGICA DE SIMULACIÓN CON 3 HILOS
# ==============================

def _log(line: str):
    with _state_lock:
        _logs.append(line)


def procesar_orden(worker_id: int, order: Order):
    """
    Simula el trabajo del taller sumando de 0.1 en 0.1 hasta llegar al tiempo lógico indicado.
    Ejemplo: prep_time=30  →  0.1, 0.2, 0.3 ... 30.0
    """
    # marcar como "En proceso"
    with _state_lock:
        order.status = "En proceso"

    _log(
        f"🚗 Taller {worker_id} inicia orden {order.id} ({order.description}) – "
        f"tiempo lógico {order.prep_time}."
    )

    # 🔥 Suma incremental real de 0.1 en 0.1
    progreso = 0.0
    objetivo = float(order.prep_time)

    while progreso < objetivo:
        progreso += 0.1
        # Pequeña pausa para que el avance sea real
        time.sleep(0.01)     # 0.01 segundos por cada incremento de 0.1
                             # → 10 incrementos por segundo
                             # → 1 unidad lógica = ~1s real

    # Cuando termina la suma, se marca como completada
    with _state_lock:
        order.status = "Completada"
        order.worker_id = worker_id

    _log(f"✅ Taller {worker_id} finaliza orden {order.id} ({order.description}).")

def _worker_loop(worker_id: int, orders_queue: "queue.Queue[Order]"):
    """Función que ejecuta cada hilo (cada taller)."""
    while True:
        try:
            order = orders_queue.get_nowait()
        except queue.Empty:
            break

        procesar_orden(worker_id, order)
        orders_queue.task_done()


def process_orders():
    """
    Toma las órdenes pendientes y las procesa con 3 hilos (3 talleres).
    Respeta prioridad (3 alta, 2 media, 1 baja) y luego el orden de llegada.
    Deja todo registrado en _logs y actualiza el estado de las órdenes.
    Al final genera un informe con:
      - número de órdenes,
      - tiempo lógico total,
      - tiempo lógico promedio,
      - tiempo real aproximado de ejecución.
    """

    with _state_lock:
        _logs.clear()

        # reiniciamos estados antes de simular
        for o in _orders:
            o.status = "Pendiente"
            o.worker_id = None

        orders_snapshot = list(_orders)

    if not orders_snapshot:
        _log("⚠ No hay órdenes para procesar.")
        return

    # Datos para el informe
    total_ordenes = len(orders_snapshot)
    tiempo_logico_total = sum(o.prep_time for o in orders_snapshot)

    # Mensaje general que pediste
    _log("🔓 Ya abrieron los 3 talleres y recibieron las primeras órdenes.")

    # Ordenamos por prioridad (3 > 2 > 1) y luego por ID
    pendientes = sorted(
        orders_snapshot,
        key=lambda o: (-o.priority, o.id)
    )

    # Cola compartida
    orders_queue: "queue.Queue[Order]" = queue.Queue()
    for order in pendientes:
        orders_queue.put(order)

    # Medir tiempo real de la simulación
    inicio_real = time.time()

    # Tres hilos: Taller 1, 2 y 3
    threads = []
    for worker_id in range(1, 4):
        t = threading.Thread(target=_worker_loop, args=(worker_id, orders_queue))
        t.start()
        threads.append(t)

    orders_queue.join()
    for t in threads:
        t.join()

    fin_real = time.time()
    tiempo_real = fin_real - inicio_real

    # Calcular promedio lógico
    promedio_logico = (
        tiempo_logico_total / total_ordenes if total_ordenes else 0
    )

    # Informe final detallado
    _log(
        "🏁 Órdenes finalizadas: "
        f"{total_ordenes} órdenes atendidas.\n"
        f"* Tiempo lógico total: {tiempo_logico_total} unidades.\n"
        f"* Tiempo lógico promedio por orden: {promedio_logico:.2f} unidades.\n"
        f"* Tiempo real aproximado de ejecución: {tiempo_real:.2f} segundos."
    )


# ==============================
#  FUNCIÓN DE COMPATIBILIDAD
# ==============================

def simular_taller(num_workers: int = 3, ordenes_data=None):
    """
    Versión de compatibilidad por si lo llamas desde otro lado.
    """
    reset_state()

    if ordenes_data:
        for d in ordenes_data:
            desc = d.get("description") or d.get("desc") or "Orden sin descripción"
            prep = d.get("prep_time") or d.get("tiempo") or 1
            pri = d.get("priority") or d.get("prioridad") or 1
            add_order(desc, prep, pri)

    process_orders(num_workers=num_workers)

    with _state_lock:
        snapshot_orders = list(_orders)
        snapshot_logs = list(_logs)

    out_orders = []
    for o in snapshot_orders:
        out_orders.append(
            {
                "id": o.id,
                "description": o.description,
                "prep_time": o.prep_time,
                "priority": o.priority,
                "status": o.status,
                "worker_id": o.worker_id,
            }
        )
    return out_orders, snapshot_logs

# ==============================
#  SOPORTE PARA PROCESO ASÍNCRONO + EXPORTAR ESTADO
# ==============================

_processing = False  # indica si hay una simulación corriendo


def export_state():
    """
    Devuelve el estado en formato listo para JSON:
    - órdenes como dicts
    - logs como lista de strings
    """
    with _state_lock:
        orders_snapshot = list(_orders)
        logs_snapshot = list(_logs)

    out_orders = []
    for o in orders_snapshot:
        out_orders.append(
            {
                "id": o.id,
                "description": o.description,
                "prep_time": o.prep_time,
                "priority": o.priority,
                "status": o.status,
                "worker_id": o.worker_id,
            }
        )
    return out_orders, logs_snapshot


def is_processing():
    """Indica si hay una simulación en curso."""
    with _state_lock:
        return _processing


def start_async_processing():
    """
    Lanza process_orders() en un hilo aparte.
    No bloquea la petición HTTP.
    """

    global _processing

    with _state_lock:
        if _processing:
            # ya hay una simulación corriendo, no lanzar otra
            return
        _processing = True

    def _run():
        global _processing
        try:
            process_orders()
        finally:
            with _state_lock:
                _processing = False

    t = threading.Thread(target=_run, daemon=True)
    t.start()
