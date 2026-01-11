FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar codigo da aplicacao
COPY . .

# Expor porta
EXPOSE 8080

# Comando para iniciar a aplicacao
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
