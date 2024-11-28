#!/bin/bash
TIMEOUT=60

# Simplified environment detection
is_container() {
    [[ -f /.dockerenv || -f /run/.containerenv || -n "$CODESPACES" ]]
}

# Unified service start mechanism
start_ollama_service() {
    local method="${1:-auto}"

    if is_container; then
        service ollama start || systemctl start ollama
    elif [[ "$method" == "service" ]]; then
        systemctl start ollama
    else
        nohup ollama serve >/dev/null 2>&1 &
    fi

    # Consolidated startup check
    local elapsed=0
    while ((elapsed < TIMEOUT)); do
        curl -s --max-time 1 http://localhost:11434/api/version && return 0
        sleep 1
        ((elapsed++))
        printf "."
    done

    echo -e "\nFailed to start Ollama."
    return 1
}

# Main execution
main() {
    # Quick exit if already running
    curl -s --max-time 1 http://localhost:11434/api/version && return 0

    if is_container || command -v systemctl >/dev/null; then
        systemctl is-active ollama || start_ollama_service service
    elif command -v ollama >/dev/null; then
        start_ollama_service
    else
        echo "Ollama not installed."
        return 1
    fi
}

main "$@"