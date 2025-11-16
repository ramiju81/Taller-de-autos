# TallerAutos – Simulación concurrente con 3 hilos

- Flask expone un HTML donde se ingresan las órdenes del taller.
- Cada orden tiene descripción, tiempo lógico y prioridad.
- Al procesar, se lanzan 3 hilos que atienden las órdenes en paralelo.
- El resultado se ve en la tabla y en el log.

## Ejecutar local

```bash
pip install -r requirements.txt
python app.py
```

## Ejecutar con Docker

```bash
docker compose up --build
```

Luego abre http://localhost:5000
