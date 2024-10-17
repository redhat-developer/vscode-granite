#!/bin/bash

# Timeout for waiting for Ollama to start (in seconds)
TIMEOUT=60

# Function to check if a command is available
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if we are in a container (GitHub Codespaces or similar)
in_container() {
    # Check if we're running in GitHub Codespaces by checking the environment variable
    [[ -f /.dockerenv || -f /run/.containerenv ]]
}

# Function to start Ollama and check if it's running
start_ollama() {
    if [ "$1" = "service" ]; then
        echo "Starting Ollama service..."
        if in_container; then
            # Use the service command in a container
            service ollama start
        else
            sudo systemctl start ollama
        fi
    else
        echo "Starting Ollama as a background process..."
        nohup ollama serve >/dev/null 2>&1 &
    fi

    # Wait for Ollama to start (max TIMEOUT seconds)
    for i in $(seq 1 $TIMEOUT); do
        if curl -s --max-time 1 http://localhost:11434/api/version >/dev/null; then
            echo "Ollama started successfully."
            return 0
        fi

        # Display a progress indicator
        printf "."
        sleep 1
    done

    echo -e "\nFailed to start Ollama."
    return 1
}

# Main logic
if curl -s --max-time 1 http://localhost:11434/api/version >/dev/null; then
    echo "Ollama already started."
    exit 0
fi

if in_container; then
    echo "Running in a container environment."
    # Check if Ollama is running using the service command
    if service --status-all 2>&1 | grep -q 'ollama'; then
        if service ollama status >/dev/null 2>&1; then
            echo "Ollama service is already running."
            exit 0
        else
            echo "Starting Ollama service..."
            if start_ollama service; then
                exit 0
            else
                exit 1
            fi
        fi
    fi
else
    if command_exists systemctl; then
        if systemctl is-active --quiet ollama; then
            echo "Ollama service is already running."
            exit 0
        elif systemctl list-unit-files ollama.service >/dev/null 2>&1; then
            echo "Starting Ollama service..."
            if start_ollama service; then
                exit 0
            else
                exit 1
            fi
        fi
    fi
fi

if command_exists ollama; then
    if start_ollama; then
        exit 0
    else
        exit 1
    fi
else
    echo "Ollama is not installed or not in the PATH."
    exit 1
fi
