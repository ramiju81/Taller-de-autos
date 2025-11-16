import threading
import time
import queue


class TallerAutosSimulator:
    """Simula el taller con N hilos y una cola de prioridad."""

    def __init__(self, orders, num_workers=3, logical_minute_seconds=0.2):
        self.orders = orders
        self.num_workers = num_workers
        self.logical_minute_seconds = logical_minute_seconds

        self.queue = queue.PriorityQueue()
        for o in self.orders:
            # prioridad más alta primero, luego id menor primero
            self.queue.put((-o["priority"], o["id"], o))

        self.threads = []
        self.logs = []
        self._logs_lock = threading.Lock()

    def _log(self, msg: str):
        with self._logs_lock:
            self.logs.append(msg)

    def _worker(self, worker_id: int):
        while True:
            try:
                _, _, order = self.queue.get_nowait()
            except queue.Empty:
                break

            order["status"] = "En proceso"
            self._log(
                f"🚗 Taller {worker_id} inicia orden {order['id']} "
                f"({order['description']}) – tiempo lógico {order['prep_time']}"
            )

            # Ciclo interno 1..prep_time (no se muestra, solo simula tiempo)
            for _ in range(order["prep_time"]):
                time.sleep(self.logical_minute_seconds)

            order["status"] = "Completada"
            order["worker_id"] = worker_id
            self._log(
                f"✅ Taller {worker_id} finaliza orden {order['id']} "
                f"({order['description']})"
            )

            self.queue.task_done()

    def run(self):
        for wid in range(1, self.num_workers + 1):
            t = threading.Thread(target=self._worker, args=(wid,))
            t.start()
            self.threads.append(t)
            self._log(f"🧵 Taller {wid} listo para recibir órdenes.")

        self.queue.join()

        for t in self.threads:
            t.join()

        self._log("🏁 Simulación finalizada: todas las órdenes fueron atendidas.")
        return self.orders, self.logs


def simular_taller(num_workers, orders):
    simulator = TallerAutosSimulator(
        orders=orders,
        num_workers=num_workers,
        logical_minute_seconds=0.2,
    )
    return simulator.run()
