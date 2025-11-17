from flask import Flask, render_template, request, redirect, url_for
from taller_autos import (
    get_state,
    add_order,
    process_orders,
    reset_state,
    get_tasks,
)

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="templates/static",
)


@app.route("/", methods=["GET"])
def index():
    orders, logs = get_state()
    tasks = get_tasks()
    return render_template("index.html", orders=orders, logs=logs, tasks=tasks)


@app.route("/add-order", methods=["POST"])
def add_order_route():
    desc = request.form.get("description")
    prep_time = request.form.get("prep_time")
    priority = request.form.get("priority")
    add_order(desc, prep_time, priority)
    return redirect(url_for("index"))


@app.route("/process-orders", methods=["POST"])
def process_orders_route():
    process_orders()
    return redirect(url_for("index"))


@app.route("/reset", methods=["POST"])
def reset_route():
    reset_state()
    return redirect(url_for("index"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
