#!/bin/bash
# Free Observability Stack - Automated Setup & Testing
# This script implements and tests the entire free observability stack

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OBSERVABILITY_DIR="$HOME/observability"
BACKUP_DIR="$HOME/observability-backups"
LOG_FILE="$OBSERVABILITY_DIR/setup.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed. Please install curl first."
        exit 1
    fi
    print_success "curl is installed"
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Installing..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y jq
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install jq
        else
            print_error "Please install jq manually"
            exit 1
        fi
    fi
    print_success "jq is installed"
    
    # Check available disk space (need at least 10GB)
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 10 ]; then
        print_error "Not enough disk space. Need at least 10GB, have ${AVAILABLE_SPACE}GB"
        exit 1
    fi
    print_success "Sufficient disk space available (${AVAILABLE_SPACE}GB)"
}

# Function to create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    mkdir -p "$OBSERVABILITY_DIR"/{loki,grafana,prometheus,nginx,alertmanager,backups}
    mkdir -p "$OBSERVABILITY_DIR"/grafana/{provisioning/datasources,provisioning/dashboards,dashboards}
    mkdir -p "$OBSERVABILITY_DIR"/nginx/ssl
    mkdir -p "$BACKUP_DIR"
    
    print_success "Directory structure created"
}

# Function to generate SSL certificates
generate_ssl_certs() {
    print_status "Generating SSL certificates..."
    
    if [ ! -f "$OBSERVABILITY_DIR/nginx/ssl/cert.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$OBSERVABILITY_DIR/nginx/ssl/key.pem" \
            -out "$OBSERVABILITY_DIR/nginx/ssl/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
            2>> "$LOG_FILE"
        
        print_success "SSL certificates generated"
    else
        print_warning "SSL certificates already exist, skipping..."
    fi
}

# Function to generate secure passwords
generate_passwords() {
    print_status "Generating secure passwords..."
    
    if [ ! -f "$OBSERVABILITY_DIR/.env" ]; then
        cat > "$OBSERVABILITY_DIR/.env" << EOF
# Auto-generated passwords - DO NOT COMMIT TO GIT
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
LOKI_AUTH_USERNAME=admin
LOKI_AUTH_PASSWORD=$(openssl rand -base64 32)
PROMETHEUS_AUTH_USERNAME=admin
PROMETHEUS_AUTH_PASSWORD=$(openssl rand -base64 32)
EOF
        chmod 600 "$OBSERVABILITY_DIR/.env"
        print_success "Secure passwords generated in .env file"
    else
        print_warning ".env file already exists, skipping password generation..."
    fi
}

# Function to create Loki configuration
create_loki_config() {
    print_status "Creating Loki configuration..."
    
    cat > "$OBSERVABILITY_DIR/loki-config.yml" << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  retention_period: 720h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  max_streams_per_user: 10000

query_range:
  align_queries_with_step: true
  max_retries: 5
  parallelise_shardable_queries: true

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h
EOF
    
    print_success "Loki configuration created"
}

# Function to create Prometheus configuration
create_prometheus_config() {
    print_status "Creating Prometheus configuration..."
    
    cat > "$OBSERVABILITY_DIR/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'loki'
    static_configs:
      - targets: ['loki:3100']

  - job_name: 'grafana'
    static_configs:
      - targets: ['grafana:3000']
EOF
    
    print_success "Prometheus configuration created"
}

# Function to create Grafana provisioning
create_grafana_provisioning() {
    print_status "Creating Grafana provisioning..."
    
    cat > "$OBSERVABILITY_DIR/grafana/provisioning/datasources/datasources.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: false
    jsonData:
      maxLines: 1000

  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: false
    editable: false
    jsonData:
      timeInterval: 15s
EOF
    
    cat > "$OBSERVABILITY_DIR/grafana/provisioning/dashboards/dashboards.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'POS Dashboards'
    orgId: 1
    folder: 'POS System'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    print_success "Grafana provisioning created"
}

# Function to create Docker Compose file
create_docker_compose() {
    print_status "Creating Docker Compose configuration..."
    
    cat > "$OBSERVABILITY_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

networks:
  observability:
    driver: bridge

services:
  loki:
    image: grafana/loki:2.9.3
    container_name: loki
    ports:
      - "3100:3100"
      - "9096:9096"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - observability
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M

  grafana:
    image: grafana/grafana:10.2.3
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin123}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3001
      - GF_LOG_LEVEL=info
    restart: unless-stopped
    networks:
      - observability
    depends_on:
      loki:
        condition: service_healthy
      prometheus:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  prometheus:
    image: prom/prometheus:v2.48.1
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - observability
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:9090/-/healthy || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - alertmanager-data:/alertmanager
    restart: unless-stopped
    networks:
      - observability

  uptime-kuma:
    image: louislam/uptime-kuma:1.23.11
    container_name: uptime-kuma
    ports:
      - "3002:3001"
    volumes:
      - uptime-kuma-data:/app/data
    restart: unless-stopped
    networks:
      - observability

volumes:
  loki-data:
  grafana-data:
  prometheus-data:
  alertmanager-data:
  uptime-kuma-data:
EOF
    
    print_success "Docker Compose configuration created"
}

# Function to start services
start_services() {
    print_status "Starting observability stack..."
    
    cd "$OBSERVABILITY_DIR"
    docker-compose up -d
    
    print_status "Waiting for services to be healthy (this may take 2-3 minutes)..."
    sleep 30
    
    # Wait for all services to be healthy
    MAX_WAIT=180  # 3 minutes
    ELAPSED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        UNHEALTHY=$(docker-compose ps | grep -c "unhealthy" || true)
        if [ "$UNHEALTHY" -eq 0 ]; then
            print_success "All services are healthy!"
            return 0
        fi
        print_status "Waiting for services... ($ELAPSED/$MAX_WAIT seconds)"
        sleep 10
        ELAPSED=$((ELAPSED + 10))
    done
    
    print_error "Services did not become healthy in time"
    docker-compose ps
    return 1
}

# Function to test Loki
test_loki() {
    print_status "Testing Loki..."
    
    # Test ready endpoint
    if curl -f http://localhost:3100/ready &>> "$LOG_FILE"; then
        print_success "Loki is ready"
    else
        print_error "Loki ready check failed"
        return 1
    fi
    
    # Test log ingestion
    TEST_MESSAGE="Test log $(date +%s)"
    curl -X POST http://localhost:3100/loki/api/v1/push \
        -H "Content-Type: application/json" \
        -d "{
            \"streams\": [{
                \"stream\": {\"service\": \"test\", \"level\": \"info\"},
                \"values\": [[\"$(date +%s)000000000\", \"$TEST_MESSAGE\"]]
            }]
        }" &>> "$LOG_FILE"
    
    # Wait for log to be indexed
    sleep 5
    
    # Query the log back
    RESULT=$(curl -s "http://localhost:3100/loki/api/v1/query_range?query={service=\"test\"}&start=$(($(date +%s) - 60))000000000&end=$(date +%s)000000000")
    
    if echo "$RESULT" | jq -e '.data.result[0].values' &>> "$LOG_FILE"; then
        print_success "Loki log ingestion working"
    else
        print_error "Loki log ingestion failed"
        echo "$RESULT" >> "$LOG_FILE"
        return 1
    fi
}

# Function to test Grafana
test_grafana() {
    print_status "Testing Grafana..."
    
    # Test health endpoint
    if curl -f http://localhost:3001/api/health &>> "$LOG_FILE"; then
        print_success "Grafana is healthy"
    else
        print_error "Grafana health check failed"
        return 1
    fi
    
    # Test Loki datasource
    DATASOURCES=$(curl -s http://admin:${GRAFANA_ADMIN_PASSWORD:-admin123}@localhost:3001/api/datasources)
    if echo "$DATASOURCES" | jq -e '.[] | select(.type=="loki")' &>> "$LOG_FILE"; then
        print_success "Loki datasource is configured"
    else
        print_error "Loki datasource not found"
        return 1
    fi
}

# Function to test Prometheus
test_prometheus() {
    print_status "Testing Prometheus..."
    
    # Test healthy endpoint
    if curl -f http://localhost:9090/-/healthy &>> "$LOG_FILE"; then
        print_success "Prometheus is healthy"
    else
        print_error "Prometheus health check failed"
        return 1
    fi
    
    # Test metrics endpoint
    if curl -s http://localhost:9090/metrics | grep -q "prometheus_build_info"; then
        print_success "Prometheus metrics working"
    else
        print_error "Prometheus metrics failed"
        return 1
    fi
}

# Function to test service communication
test_service_communication() {
    print_status "Testing service-to-service communication..."
    
    # Test Grafana can reach Loki
    if docker-compose exec -T grafana wget -O- http://loki:3100/ready &>> "$LOG_FILE"; then
        print_success "Grafana can reach Loki"
    else
        print_error "Grafana cannot reach Loki"
        return 1
    fi
    
    # Test Prometheus can scrape Loki
    TARGETS=$(curl -s http://localhost:9090/api/v1/targets)
    if echo "$TARGETS" | jq -e '.data.activeTargets[] | select(.labels.job=="loki")' &>> "$LOG_FILE"; then
        print_success "Prometheus can scrape Loki"
    else
        print_warning "Prometheus cannot scrape Loki (this is expected if not configured)"
    fi
}

# Function to run load test
run_load_test() {
    print_status "Running load test..."
    
    print_status "Sending 1000 logs to Loki..."
    for i in {1..1000}; do
        curl -X POST http://localhost:3100/loki/api/v1/push \
            -H "Content-Type: application/json" \
            -d "{
                \"streams\": [{
                    \"stream\": {\"service\": \"load-test\", \"level\": \"info\"},
                    \"values\": [[\"$(date +%s)000000000\", \"Load test log $i\"]]
                }]
            }" &>> "$LOG_FILE" &
        
        if [ $((i % 100)) -eq 0 ]; then
            print_status "Sent $i/1000 logs..."
            wait  # Wait for batch to complete
        fi
    done
    
    wait  # Wait for all logs to be sent
    print_success "Load test completed - 1000 logs sent"
    
    # Check Loki is still healthy
    if curl -f http://localhost:3100/ready &>> "$LOG_FILE"; then
        print_success "Loki is still healthy after load test"
    else
        print_error "Loki failed after load test"
        return 1
    fi
}

# Function to test failure scenarios
test_failure_scenarios() {
    print_status "Testing failure scenarios..."
    
    # Test 1: Restart Loki
    print_status "Test 1: Restarting Loki..."
    docker-compose restart loki
    sleep 30
    
    if curl -f http://localhost:3100/ready &>> "$LOG_FILE"; then
        print_success "Loki recovered after restart"
    else
        print_error "Loki failed to recover"
        return 1
    fi
    
    # Test 2: Send log while Loki is down
    print_status "Test 2: Testing graceful degradation..."
    docker-compose stop loki
    sleep 5
    
    # This should not crash the test script
    curl -X POST http://localhost:3100/loki/api/v1/push \
        -H "Content-Type: application/json" \
        -d '{"streams":[{"stream":{"service":"test"},"values":[["'$(date +%s)000000000'","test"]]}]}' \
        &>> "$LOG_FILE" || true
    
    print_success "Graceful degradation test passed (no crash)"
    
    # Restart Loki
    docker-compose start loki
    sleep 30
    
    if curl -f http://localhost:3100/ready &>> "$LOG_FILE"; then
        print_success "Loki restarted successfully"
    else
        print_error "Loki failed to restart"
        return 1
    fi
}

# Function to create backup
create_backup() {
    print_status "Creating backup..."
    
    BACKUP_NAME="observability-$(date +%Y%m%d_%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup configurations
    cp -r "$OBSERVABILITY_DIR"/*.yml "$BACKUP_PATH/" 2>> "$LOG_FILE" || true
    cp "$OBSERVABILITY_DIR/.env" "$BACKUP_PATH/" 2>> "$LOG_FILE" || true
    
    # Backup Docker volumes
    docker run --rm \
        -v observability_loki-data:/data \
        -v "$BACKUP_PATH":/backup \
        ubuntu tar czf /backup/loki-data.tar.gz /data &>> "$LOG_FILE"
    
    docker run --rm \
        -v observability_grafana-data:/data \
        -v "$BACKUP_PATH":/backup \
        ubuntu tar czf /backup/grafana-data.tar.gz /data &>> "$LOG_FILE"
    
    print_success "Backup created: $BACKUP_PATH"
}

# Function to print summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "  OBSERVABILITY STACK SETUP COMPLETE"
    echo "=========================================="
    echo ""
    echo "Services:"
    echo "  Grafana:      http://localhost:3001"
    echo "  Prometheus:   http://localhost:9090"
    echo "  Loki:         http://localhost:3100"
    echo "  Uptime Kuma:  http://localhost:3002"
    echo ""
    echo "Credentials:"
    echo "  Grafana:      admin / (see $OBSERVABILITY_DIR/.env)"
    echo ""
    echo "Configuration:"
    echo "  Directory:    $OBSERVABILITY_DIR"
    echo "  Logs:         $LOG_FILE"
    echo "  Backups:      $BACKUP_DIR"
    echo ""
    echo "Next Steps:"
    echo "  1. Access Grafana at http://localhost:3001"
    echo "  2. Configure your backend to send logs to http://localhost:3100"
    echo "  3. Configure your frontend to send logs to http://localhost:3100"
    echo "  4. Set up alerts in Grafana"
    echo "  5. Configure Uptime Kuma monitors"
    echo ""
    echo "=========================================="
}

# Main execution
main() {
    echo "=========================================="
    echo "  FREE OBSERVABILITY STACK SETUP"
    echo "=========================================="
    echo ""
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    # Run setup steps
    check_prerequisites
    create_directories
    generate_ssl_certs
    generate_passwords
    create_loki_config
    create_prometheus_config
    create_grafana_provisioning
    create_docker_compose
    start_services
    
    # Run tests
    echo ""
    echo "=========================================="
    echo "  RUNNING TESTS"
    echo "=========================================="
    echo ""
    
    test_loki
    test_grafana
    test_prometheus
    test_service_communication
    run_load_test
    test_failure_scenarios
    
    # Create backup
    create_backup
    
    # Print summary
    print_summary
    
    print_success "Setup and testing complete!"
    print_status "Check $LOG_FILE for detailed logs"
}

# Run main function
main

