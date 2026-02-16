#!/bin/bash

BACKUP_DIR="/srv/samba/privado/yugi-forge-arena/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

echo "Iniciando backup em $TIMESTAMP..."

# Executa o dump do banco de dados dentro do container e comprime
docker exec supabase-db pg_dump -U postgres postgres | gzip > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "Backup concluido com sucesso: $FILENAME"
else
    echo "Erro ao realizar o backup!"
    rm -f "$FILENAME"
    exit 1
fi

# Remove backups mais antigos que 14 dias para economizar espaco
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +14 -delete

echo "Limpeza de backups antigos concluida."
