#!/bin/bash

# Auto-Deployment for recapp

# Konfiguration
if [ $# -eq 0 ]; then
    REPO_PATH="/home/cloud/recapp"
    LOG_FILE="/home/cloud/recapp/deploy.log"
else
    REPO_PATH="$1"
    LOG_FILE="$1/deploy.log"
fi

PM2_PROCESS_NAME="backend"

# Funktion zum Loggen
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$1"
}

# Funktion zum Prüfen von Änderungen im Remote
check_remote_changes() {
    git fetch origin
    local_branch=$(git rev-parse --abbrev-ref HEAD)
    remote_branch="origin/$local_branch"
    
    if git diff --quiet "$local_branch" "$remote_branch"; then
        log "No remote changes for current branch ($local_branch)."
        return 1
    else
        log "New commits detected for current branch ($local_branch)."
        return 0
    fi
}

# Funktion zum Pullen von Änderungen
pull_changes() {
    if git pull origin "$(git rev-parse --abbrev-ref HEAD)"; then
        log "Pulling changes was successful."
        return 0
    else
        log "Error on pulling changes."
        return 1
    fi
}

# Funktion zum Bauen der Projekte
build_projects() {
    log "Starting rebuild"
    
    # Installiere Abhängigkeiten
    if npm ci; then
        log "Installed dependencies successfully."
    else
        log "Error on dependent package installation."
        return 1
    fi
    
    # Führe Lerna build aus
    if npx lerna run build; then
        log "Build all packages."
        return 0
    else
        log "Error on building packages."
        return 1
    fi
}

# Funktion zum Neustarten des PM2-Prozesses
restart_pm2() {
    if pm2 restart "$PM2_PROCESS_NAME"; then
        log "Restartet backend."
        return 0
    else
        log "Error on restarting the backend."
        return 1
    fi
}

# Funktion zum Kopieren der Frontend-Dateien und Setzen der Rechte
change_frontend_permissions() {
    if chmod -R o+r ./packages/frontend/dist/*; then
        log "Made frontend build accessible by webserver."
        return 0
    else
        log "Could not change frontend access rights for webserver"
        return 1
    fi
}

# Funktion zum Zurücksetzen auf den letzten funktionierenden Stand
rollback() {
    log "Errors occured. Rolling back."
    git reset --hard HEAD~1
    build_projects
    restart_pm2
    copy_frontend_files
    log "Rollback finished."
}

# Hauptfunktion
main() {
    cd "$REPO_PATH" || { log "Fehler: Konnte nicht in das Repository-Verzeichnis wechseln."; exit 1; }

    if [ "$1" = "build-force" ]; then
        log "Forced deployment."
        if build_projects; then
            log "New version was deployed"
        else
            log "An error occured"
            exit 1
        fi
        return
    fi  

    if check_remote_changes; then
        if pull_changes && build_projects && restart_pm2 && change_frontend_permissions; then
            log "New version was deployed"
        else
            log "An error occured"
            rollback
            exit 1
        fi
    else
        log "No action neccessary."
    fi
}

# Ausführung der Hauptfunktion
main $2
