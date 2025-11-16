from flask import Flask, render_template, request, redirect, url_for
from taller_autos import simular_taller

app = Flask(__name__)

ORDERS = []   # lista de dicts
NEXT_ID = 1
LOGS = []


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", orders=ORDERS, logs=LOGS)


@app.route("/add-order", methods=["POST"])
def add_order():
    global NEXT_ID

    description = request.form.get("description", "").strip()
    prep_time = request.form.get("prep_time", "").strip()
    priority = request.form.get("priority", "").strip()

    if not description:
        return redirect(url_for("index"))

    if not prep_time.isdigit():
        prep_time = "1"
    if not priority.isdigit():
        priority = "1"

    order = {
        "id": NEXT_ID,
        "description": description,
        "prep_time": int(prep_time),
        "priority": int(priority),
        "status": "Pendiente",
        "worker_id": None,
    }
    ORDERS.append(order)
    NEXT_ID += 1

    return redirect(url_for("index"))


@app.route("/process-orders", methods=["POST"])
def process_orders():
    global ORDERS, LOGS

    if not ORDERS:
        LOGS = ["No hay órdenes registradas."]
        return redirect(url_for("index"))

    ORDERS, LOGS = simular_taller(num_workers=3, orders=ORDERS)
    return redirect(url_for("index"))


@app.route("/reset", methods=["POST"])
def reset():
    global ORDERS, NEXT_ID, LOGS
    ORDERS = []
    NEXT_ID = 1
    LOGS = []
    return redirect(url_for("index"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
