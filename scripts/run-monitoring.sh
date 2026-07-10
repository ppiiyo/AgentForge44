#!/bin/bash
set -e

BIN_DIR="/tmp/monitoring-bin"
mkdir -p "$BIN_DIR"
mkdir -p "/tmp/prometheus-data"

echo "Checking Prometheus installation..."
if [ ! -f "$BIN_DIR/prometheus" ]; then
  echo "Downloading Prometheus v2.48.0..."
  wget -q https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz -O /tmp/prometheus.tar.gz
  echo "Extracting Prometheus..."
  tar -xzf /tmp/prometheus.tar.gz -C /tmp
  mv /tmp/prometheus-2.48.0.linux-amd64/prometheus "$BIN_DIR/prometheus"
  rm -rf /tmp/prometheus.tar.gz /tmp/prometheus-2.48.0.linux-amd64
  echo "Prometheus ready."
else
  echo "Prometheus is already installed."
fi

echo "Checking Grafana installation..."
if [ ! -d "$BIN_DIR/grafana" ]; then
  echo "Downloading Grafana v10.2.3..."
  wget -q https://dl.grafana.com/oss/release/grafana-10.2.3.linux-amd64.tar.gz -O /tmp/grafana.tar.gz
  echo "Extracting Grafana..."
  tar -xzf /tmp/grafana.tar.gz -C /tmp
  mv /tmp/grafana-v10.2.3 "$BIN_DIR/grafana"
  rm -rf /tmp/grafana.tar.gz
  echo "Grafana ready."
else
  echo "Grafana is already installed."
fi

echo "Starting Prometheus..."
# Kill any existing prometheus processes
pkill -f "prometheus --config.file" || true
nohup "$BIN_DIR/prometheus" \
  --config.file=./monitoring/prometheus.yml \
  --storage.tsdb.path=/tmp/prometheus-data \
  --web.listen-address="0.0.0.0:9090" \
  > /tmp/prometheus.log 2>&1 &

echo "Starting Grafana on port 3001..."
# Kill any existing grafana-server processes
pkill -f "grafana-server" || true
export GF_SERVER_HTTP_PORT=3001
export GF_SECURITY_ADMIN_PASSWORD=admin
export GF_USERS_ALLOW_SIGN_UP=false
export GF_PATHS_PROVISIONING=./monitoring/grafana/provisioning

nohup "$BIN_DIR/grafana/bin/grafana-server" \
  --homepath="$BIN_DIR/grafana" \
  > /tmp/grafana.log 2>&1 &

echo "Prometheus and Grafana services launched successfully!"
echo "Prometheus is running at http://localhost:9090"
echo "Grafana is running at http://localhost:3001"
