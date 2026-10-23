FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
CMD ["sh", "-c", "gunicorn app:app --workers 1 --threads 4 --timeout 60 --bind 0.0.0.0:${PORT}"]
