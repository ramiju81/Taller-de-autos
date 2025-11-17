FROM python:3.11-slim

WORKDIR /app

# Dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código de la app
COPY app.py taller_autos.py ./

# Templates y estáticos
COPY templates ./templates
COPY templates/static ./static


EXPOSE 5000

CMD ["python", "app.py"]
