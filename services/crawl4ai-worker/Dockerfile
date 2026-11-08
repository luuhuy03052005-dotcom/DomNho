FROM unclecode/crawl4ai:0.9.5

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PORT=11236
ENV CRAWL4AI_NO_CLOUD_NOTICE=1
EXPOSE 11236

CMD ["python", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "11236"]
