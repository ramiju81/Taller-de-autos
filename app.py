from flask import Flask, render_template, request, redirect, url_for, jsonify
from taller_autos import (
    get_state,
    add_order,
    process_orders,
    reset_state,
    get_tasks,
    is_processing,
    start_async_processing,
    export_state,
)

app = Flask(__name__)


@app.route("/", methods=["GET"])
def index():
    orders, logs = get_state()
    tasks = get_tasks()
    return render_template("index.html", orders=orders, logs=logs, tasks=tasks)


@app.route("/add-order", methods=["POST"])
def add_order_route():
    description = request.form.get("description", "")
    prep_time = request.form.get("prep_time", "1")
    priority = request.form.get("priority", "1")

    add_order(description, prep_time, priority)
    return redirect(url_for("index"))


@app.route("/process-orders", methods=["POST"])
def process_orders_route():
    """
    Dispara el procesamiento en segundo plano y vuelve al index.
    El avance se ve por /estado-json que consulta el JS cada 1s.
    """
    start_async_processing()
    return redirect(url_for("index"))


@app.route("/reset", methods=["POST"])
def reset_route():
    reset_state()
    return redirect(url_for("index"))


@app.route("/estado-json", methods=["GET"])
def estado_json():
    """
    Endpoint que devuelve el estado actual para el auto–refresh.
    Lo consulta main.js cada 1 segundo.
    """
    data = export_state()
    # export_state() ya devuelve {"orders": [...], "logs": [...]}
    return jsonify(data)


if __name__ == "__main__":
    # En Docker se usa esto tal cual
    app.run(host="0.0.0.0", debug=True)
