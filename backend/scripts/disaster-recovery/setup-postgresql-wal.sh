#!/bin/bash

# PostgreSQL WAL Archiving Setup Script
# This script configures PostgreSQL for continuous WAL archiving to enable point-in-time recovery

set -e

echo "🔧 PostgreSQL WAL Archiving Setup"
echo "=================================="
echo ""

# Check if running as postgres user
if [ "$USER" != "postgres" ]; then
    echo "⚠️  This script should be run as the postgres user"
    echo "Run: sudo -u postgres bash $0"
    exit 1
fi

# Get PostgreSQL data directory
PG_DATA_DIR=$(psql -t -c "SHOW data_directory;" | xargs)
echo "PostgreSQL data directory: $PG_DATA_DIR"

# Get PostgreSQL config file
PG_CONFIG="$PG_DATA_DIR/postgresql.conf"
echo "PostgreSQL config file: $PG_CONFIG"

# Create WAL archive directory
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/lib/postgresql/wal_archive}"
echo "WAL archive directory: $WAL_ARCHIVE_DIR"

if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
    echo "Creating WAL archive directory..."
    mkdir -p "$WAL_ARCHIVE_DIR"
    chmod 700 "$WAL_ARCHIVE_DIR"
    echo "✅ Created: $WAL_ARCHIVE_DIR"
else
    echo "✅ WAL archive directory already exists"
fi

# Backup original config
echo ""
echo "Backing up postgresql.conf..."
cp "$PG_CONFIG" "$PG_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Update PostgreSQL configuration
echo ""
echo "Updating PostgreSQL configuration..."

# Function to update or add config parameter
update_config() {
    local param=$1
    local value=$2
    
    if grep -q "^#*${param}" "$PG_CONFIG"; then
        # Parameter exists, update it
        sed -i "s|^#*${param}.*|${param} = ${value}|" "$PG_CONFIG"
    else
        # Parameter doesn't exist, add it
        echo "${param} = ${value}" >> "$PG_CONFIG"
    fi
}

# Configure WAL settings
update_config "wal_level" "replica"
update_config "archive_mode" "on"
update_config "archive_command" "'test ! -f ${WAL_ARCHIVE_DIR}/%f && cp %p ${WAL_ARCHIVE_DIR}/%f'"
update_config "archive_timeout" "300"  # 5 minutes

# Configure checkpoint settings for better recovery
update_config "checkpoint_timeout" "15min"
update_config "max_wal_size" "2GB"
update_config "min_wal_size" "80MB"

# Configure connection settings
update_config "max_connections" "100"
update_config "shared_buffers" "256MB"

echo "✅ Configuration updated"

# Show changes
echo ""
echo "Configuration changes:"
echo "======================"
grep -E "^(wal_level|archive_mode|archive_command|archive_timeout)" "$PG_CONFIG"

# Verify configuration
echo ""
echo "Verifying configuration..."
if psql -c "SELECT pg_reload_conf();" > /dev/null 2>&1; then
    echo "✅ Configuration syntax is valid"
else
    echo "❌ Configuration syntax error"
    echo "Restoring backup..."
    cp "$PG_CONFIG.backup."* "$PG_CONFIG"
    exit 1
fi

# Restart PostgreSQL
echo ""
echo "⚠️  PostgreSQL needs to be restarted for changes to take effect"
echo ""
read -p "Restart PostgreSQL now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Restarting PostgreSQL..."
    
    # Try systemctl first
    if command -v systemctl &> /dev/null; then
        sudo systemctl restart postgresql
    # Try pg_ctl
    elif command -v pg_ctl &> /dev/null; then
        pg_ctl restart -D "$PG_DATA_DIR"
    else
        echo "❌ Could not find systemctl or pg_ctl"
        echo "Please restart PostgreSQL manually"
        exit 1
    fi
    
    echo "✅ PostgreSQL restarted"
    
    # Verify WAL archiving is working
    echo ""
    echo "Verifying WAL archiving..."
    sleep 2
    
    WAL_LEVEL=$(psql -t -c "SHOW wal_level;" | xargs)
    ARCHIVE_MODE=$(psql -t -c "SHOW archive_mode;" | xargs)
    
    echo "wal_level: $WAL_LEVEL"
    echo "archive_mode: $ARCHIVE_MODE"
    
    if [ "$WAL_LEVEL" = "replica" ] && [ "$ARCHIVE_MODE" = "on" ]; then
        echo "✅ WAL archiving is enabled"
    else
        echo "❌ WAL archiving is not enabled correctly"
        exit 1
    fi
    
    # Force a WAL switch to test archiving
    echo ""
    echo "Testing WAL archiving..."
    psql -c "SELECT pg_switch_wal();" > /dev/null
    sleep 2
    
    WAL_COUNT=$(ls -1 "$WAL_ARCHIVE_DIR" | wc -l)
    if [ "$WAL_COUNT" -gt 0 ]; then
        echo "✅ WAL archiving is working ($WAL_COUNT files in archive)"
    else
        echo "⚠️  No WAL files in archive yet (this may be normal if database is idle)"
    fi
else
    echo ""
    echo "⚠️  PostgreSQL was not restarted"
    echo "Run this command to restart:"
    echo "  sudo systemctl restart postgresql"
fi

# Print summary
echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Configuration:"
echo "  WAL Level: replica"
echo "  Archive Mode: on"
echo "  Archive Directory: $WAL_ARCHIVE_DIR"
echo "  Archive Timeout: 5 minutes"
echo ""
echo "Next steps:"
echo "  1. Update .env file:"
echo "     WAL_ARCHIVE_DIR=$WAL_ARCHIVE_DIR"
echo ""
echo "  2. Test backup creation:"
echo "     npm run backup:create"
echo ""
echo "  3. Run DR test suite:"
echo "     npm run dr:test"
echo ""
echo "  4. Schedule quarterly DR tests"
echo ""

