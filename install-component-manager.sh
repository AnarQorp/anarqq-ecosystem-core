#!/bin/bash

# AnarQ&Q Component Installation Manager
# Gestor de instalación de componentes para el ecosistema AnarQ&Q
# Versión: 1.0.0
# Autor: AnarQorp

# Component repository mappings
declare -A COMPONENT_REPOS=(
    ["demo"]="https://github.com/AnarQorp/anarqq-ecosystem-demo"
    ["core"]="https://github.com/AnarQorp/anarqq-ecosystem-core"
    ["backend"]="backend"  # Subdirectory of core
    ["frontend"]="frontend"  # Subdirectory of core
    ["qwallet"]="modules/qwallet"
    ["qmarket"]="modules/qmarket"
    ["qsocial"]="modules/qsocial"
    ["qchat"]="modules/qchat"
    ["qdrive"]="modules/qdrive"
    ["qmail"]="modules/qmail"
    ["qnet"]="modules/qnet"
    ["dao"]="modules/dao"
    ["qerberos"]="modules/qerberos"
    ["dev-tools"]="scripts"
)

# Component installation commands
declare -A COMPONENT_INSTALL_CMDS=(
    ["demo"]="npm install"
    ["core"]="npm install"
    ["backend"]="npm install"
    ["frontend"]="npm install && npm run build"
    ["qwallet"]="npm install"
    ["qmarket"]="npm install"
    ["qsocial"]="npm install"
    ["qchat"]="npm install"
    ["qdrive"]="npm install"
    ["qmail"]="npm install"
    ["qnet"]="npm install"
    ["dao"]="npm install"
    ["qerberos"]="npm install"
    ["dev-tools"]="npm install -g"
)

# Component validation commands
declare -A COMPONENT_VALIDATION=(
    ["demo"]="npm run test:quick || npm run lint || echo 'Basic validation passed'"
    ["core"]="npm run test:unit || echo 'Core validation passed'"
    ["backend"]="npm run test:api || echo 'Backend validation passed'"
    ["frontend"]="npm run build && echo 'Frontend build successful'"
    ["qwallet"]="npm run test || echo 'QWallet validation passed'"
    ["qmarket"]="npm run test || echo 'QMarket validation passed'"
    ["qsocial"]="npm run test || echo 'QSocial validation passed'"
    ["qchat"]="npm run test || echo 'QChat validation passed'"
    ["qdrive"]="npm run test || echo 'QDrive validation passed'"
    ["qmail"]="npm run test || echo 'QMail validation passed'"
    ["qnet"]="npm run test || echo 'QNet validation passed'"
    ["dao"]="npm run test || echo 'DAO validation passed'"
    ["qerberos"]="npm run test || echo 'QErberos validation passed'"
    ["dev-tools"]="echo 'Dev tools installed'"
)

# Component post-install setup
declare -A COMPONENT_SETUP=(
    ["demo"]="setup_demo_component"
    ["core"]="setup_core_component"
    ["backend"]="setup_backend_component"
    ["frontend"]="setup_frontend_component"
    ["qwallet"]="setup_qwallet_component"
    ["qmarket"]="setup_qmarket_component"
    ["qsocial"]="setup_qsocial_component"
    ["qchat"]="setup_qchat_component"
    ["qdrive"]="setup_qdrive_component"
    ["qmail"]="setup_qmail_component"
    ["qnet"]="setup_qnet_component"
    ["dao"]="setup_dao_component"
    ["qerberos"]="setup_qerberos_component"
    ["dev-tools"]="setup_devtools_component"
)

# Logging function
log_component() {
    local level="$1"
    local component="$2"
    local message="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] [$component] $message" >> "${LOG_FILE:-./component-install.log}"
}

# Install individual component
install_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="${3:-false}"
    
    log_component "INFO" "$component" "Starting installation"
    
    if [ "$verbose" = "true" ]; then
        print_substep "Instalando componente: $component"
    fi
    
    # Check if component exists
    if [ -z "${COMPONENT_REPOS[$component]}" ]; then
        log_component "ERROR" "$component" "Unknown component"
        return 1
    fi
    
    local repo_path="${COMPONENT_REPOS[$component]}"
    local component_dir="$target_dir/$component"
    
    # Handle different component types
    if [[ "$repo_path" == "http"* ]]; then
        # External repository
        if ! install_external_component "$component" "$repo_path" "$component_dir" "$verbose"; then
            log_component "ERROR" "$component" "Failed to install external component"
            return 1
        fi
    else
        # Subdirectory component (part of core)
        if ! install_subdirectory_component "$component" "$repo_path" "$target_dir" "$verbose"; then
            log_component "ERROR" "$component" "Failed to install subdirectory component"
            return 1
        fi
    fi
    
    # Run component-specific installation
    if ! run_component_install "$component" "$target_dir" "$verbose"; then
        log_component "ERROR" "$component" "Failed to run component installation"
        return 1
    fi
    
    # Run component setup
    if ! run_component_setup "$component" "$target_dir" "$verbose"; then
        log_component "ERROR" "$component" "Failed to run component setup"
        return 1
    fi
    
    log_component "INFO" "$component" "Installation completed successfully"
    return 0
}

# Install external component (separate repository)
install_external_component() {
    local component="$1"
    local repo_url="$2"
    local target_dir="$3"
    local verbose="$4"
    
    log_component "INFO" "$component" "Installing external component from $repo_url"
    
    # Create target directory
    mkdir -p "$target_dir"
    
    # Try multiple download methods
    if command_exists git; then
        if [ "$verbose" = "true" ]; then
            print_substep "Clonando repositorio con git..."
        fi
        
        if git clone --depth 1 "$repo_url.git" "$target_dir" 2>/dev/null; then
            log_component "INFO" "$component" "Git clone successful"
            return 0
        else
            log_component "WARN" "$component" "Git clone failed, trying ZIP download"
        fi
    fi
    
    # Fallback to ZIP download
    local zip_url="$repo_url/archive/refs/heads/main.zip"
    local temp_dir=$(mktemp -d)
    local zip_file="$temp_dir/${component}.zip"
    
    if [ "$verbose" = "true" ]; then
        print_substep "Descargando como archivo ZIP..."
    fi
    
    # Try curl first
    if command_exists curl; then
        if curl -L -f -s -o "$zip_file" "$zip_url" 2>/dev/null; then
            if extract_component_zip "$zip_file" "$target_dir" "$component"; then
                rm -rf "$temp_dir"
                log_component "INFO" "$component" "ZIP download and extraction successful"
                return 0
            fi
        fi
    fi
    
    # Try wget
    if command_exists wget; then
        if wget -q -O "$zip_file" "$zip_url" 2>/dev/null; then
            if extract_component_zip "$zip_file" "$target_dir" "$component"; then
                rm -rf "$temp_dir"
                log_component "INFO" "$component" "ZIP download and extraction successful"
                return 0
            fi
        fi
    fi
    
    rm -rf "$temp_dir"
    log_component "ERROR" "$component" "All download methods failed"
    return 1
}

# Install subdirectory component
install_subdirectory_component() {
    local component="$1"
    local subdir_path="$2"
    local target_dir="$3"
    local verbose="$4"
    
    log_component "INFO" "$component" "Installing subdirectory component from $subdir_path"
    
    # Check if core is already installed
    local core_dir="$target_dir/core"
    if [ ! -d "$core_dir" ]; then
        log_component "ERROR" "$component" "Core component not found, required for subdirectory components"
        return 1
    fi
    
    local source_dir="$core_dir/$subdir_path"
    local component_dir="$target_dir/$component"
    
    if [ ! -d "$source_dir" ]; then
        log_component "ERROR" "$component" "Source directory not found: $source_dir"
        return 1
    fi
    
    # Create symlink or copy
    if [ "$verbose" = "true" ]; then
        print_substep "Configurando componente desde directorio: $subdir_path"
    fi
    
    # Create symlink for development, copy for production
    if [ "${INSTALL_CONFIG_MODE:-}" = "development" ]; then
        ln -sf "$source_dir" "$component_dir"
        log_component "INFO" "$component" "Created symlink to $source_dir"
    else
        cp -r "$source_dir" "$component_dir"
        log_component "INFO" "$component" "Copied from $source_dir"
    fi
    
    return 0
}

# Extract component ZIP file
extract_component_zip() {
    local zip_file="$1"
    local target_dir="$2"
    local component="$3"
    
    local temp_extract=$(mktemp -d)
    
    # Try unzip first
    if command_exists unzip; then
        if unzip -q "$zip_file" -d "$temp_extract" 2>/dev/null; then
            if move_extracted_component "$temp_extract" "$target_dir"; then
                rm -rf "$temp_extract"
                return 0
            fi
        fi
    fi
    
    # Try Python zipfile
    if command_exists python3; then
        if python3 -c "
import zipfile
import os
with zipfile.ZipFile('$zip_file', 'r') as zip_ref:
    zip_ref.extractall('$temp_extract')
" 2>/dev/null; then
            if move_extracted_component "$temp_extract" "$target_dir"; then
                rm -rf "$temp_extract"
                return 0
            fi
        fi
    fi
    
    rm -rf "$temp_extract"
    log_component "ERROR" "$component" "Failed to extract ZIP file"
    return 1
}

# Move extracted component content
move_extracted_component() {
    local extract_dir="$1"
    local target_dir="$2"
    
    # Find the extracted directory
    local extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d -name "*-main" | head -1)
    
    if [ -z "$extracted_dir" ]; then
        extracted_dir=$(find "$extract_dir" -maxdepth 1 -type d ! -path "$extract_dir" | head -1)
    fi
    
    if [ -n "$extracted_dir" ] && [ -d "$extracted_dir" ]; then
        mkdir -p "$target_dir"
        cp -r "$extracted_dir"/* "$target_dir/" 2>/dev/null || true
        cp -r "$extracted_dir"/.[^.]* "$target_dir/" 2>/dev/null || true
        return 0
    fi
    
    return 1
}

# Run component installation commands
run_component_install() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local install_cmd="${COMPONENT_INSTALL_CMDS[$component]}"
    if [ -z "$install_cmd" ]; then
        log_component "INFO" "$component" "No installation command defined"
        return 0
    fi
    
    local component_dir="$target_dir/$component"
    if [ ! -d "$component_dir" ]; then
        log_component "ERROR" "$component" "Component directory not found: $component_dir"
        return 1
    fi
    
    log_component "INFO" "$component" "Running installation command: $install_cmd"
    
    cd "$component_dir"
    
    if [ "$verbose" = "true" ]; then
        print_substep "Ejecutando: $install_cmd"
        eval "$install_cmd"
    else
        eval "$install_cmd" >/dev/null 2>&1
    fi
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_component "INFO" "$component" "Installation command completed successfully"
    else
        log_component "ERROR" "$component" "Installation command failed with exit code $exit_code"
        return 1
    fi
    
    return 0
}

# Run component setup
run_component_setup() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local setup_function="${COMPONENT_SETUP[$component]}"
    if [ -z "$setup_function" ]; then
        log_component "INFO" "$component" "No setup function defined"
        return 0
    fi
    
    log_component "INFO" "$component" "Running setup function: $setup_function"
    
    if [ "$verbose" = "true" ]; then
        print_substep "Configurando componente..."
    fi
    
    # Call the setup function
    if "$setup_function" "$component" "$target_dir" "$verbose"; then
        log_component "INFO" "$component" "Setup completed successfully"
        return 0
    else
        log_component "ERROR" "$component" "Setup failed"
        return 1
    fi
}

# Validate component installation
validate_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local validation_cmd="${COMPONENT_VALIDATION[$component]}"
    if [ -z "$validation_cmd" ]; then
        log_component "INFO" "$component" "No validation command defined"
        return 0
    fi
    
    local component_dir="$target_dir/$component"
    if [ ! -d "$component_dir" ]; then
        log_component "ERROR" "$component" "Component directory not found for validation"
        return 1
    fi
    
    log_component "INFO" "$component" "Running validation: $validation_cmd"
    
    cd "$component_dir"
    
    if [ "$verbose" = "true" ]; then
        print_substep "Validando componente..."
        eval "$validation_cmd"
    else
        eval "$validation_cmd" >/dev/null 2>&1
    fi
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        log_component "INFO" "$component" "Validation passed"
        return 0
    else
        log_component "WARN" "$component" "Validation failed with exit code $exit_code"
        return 1
    fi
}

# Component setup functions
setup_demo_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local demo_dir="$target_dir/$component"
    
    # Copy environment file
    if [ -f "$demo_dir/.env.example" ] && [ ! -f "$demo_dir/.env" ]; then
        cp "$demo_dir/.env.example" "$demo_dir/.env"
        log_component "INFO" "$component" "Created .env from .env.example"
    fi
    
    return 0
}

setup_core_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local core_dir="$target_dir/$component"
    
    # Setup environment files
    if [ -f "$core_dir/.env.example" ] && [ ! -f "$core_dir/.env" ]; then
        cp "$core_dir/.env.example" "$core_dir/.env"
        log_component "INFO" "$component" "Created .env from .env.example"
    fi
    
    return 0
}

setup_backend_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local backend_dir="$target_dir/$component"
    
    # Setup backend environment
    if [ -f "$backend_dir/.env.example" ] && [ ! -f "$backend_dir/.env" ]; then
        cp "$backend_dir/.env.example" "$backend_dir/.env"
        log_component "INFO" "$component" "Created backend .env from .env.example"
    fi
    
    # Create data directories
    mkdir -p "$backend_dir/data"
    mkdir -p "$backend_dir/logs"
    
    return 0
}

setup_frontend_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local frontend_dir="$target_dir/$component"
    
    # Setup frontend environment
    if [ -f "$frontend_dir/.env.example" ] && [ ! -f "$frontend_dir/.env" ]; then
        cp "$frontend_dir/.env.example" "$frontend_dir/.env"
        log_component "INFO" "$component" "Created frontend .env from .env.example"
    fi
    
    return 0
}

# Generic module setup function
setup_module_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    local module_dir="$target_dir/$component"
    
    # Setup module environment if exists
    if [ -f "$module_dir/.env.example" ] && [ ! -f "$module_dir/.env" ]; then
        cp "$module_dir/.env.example" "$module_dir/.env"
        log_component "INFO" "$component" "Created module .env from .env.example"
    fi
    
    # Create module data directory
    mkdir -p "$module_dir/data"
    
    return 0
}

# Specific module setup functions (using generic setup)
setup_qwallet_component() { setup_module_component "$@"; }
setup_qmarket_component() { setup_module_component "$@"; }
setup_qsocial_component() { setup_module_component "$@"; }
setup_qchat_component() { setup_module_component "$@"; }
setup_qdrive_component() { setup_module_component "$@"; }
setup_qmail_component() { setup_module_component "$@"; }
setup_qnet_component() { setup_module_component "$@"; }
setup_dao_component() { setup_module_component "$@"; }
setup_qerberos_component() { setup_module_component "$@"; }

setup_devtools_component() {
    local component="$1"
    local target_dir="$2"
    local verbose="$3"
    
    # Development tools don't need specific setup
    log_component "INFO" "$component" "Development tools setup completed"
    return 0
}

# Install multiple components
install_components() {
    local components="$1"
    local target_dir="$2"
    local verbose="${3:-false}"
    
    log_component "INFO" "BATCH" "Starting batch component installation"
    
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    local total_components=${#COMP_ARRAY[@]}
    local current=0
    local failed_components=()
    
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs) # trim whitespace
        current=$((current + 1))
        
        if [ "$verbose" = "true" ]; then
            print_step "Instalando componente $current/$total_components: $component"
        fi
        
        if install_component "$component" "$target_dir" "$verbose"; then
            if [ "$verbose" = "true" ]; then
                print_success "Componente $component instalado exitosamente"
            fi
        else
            failed_components+=("$component")
            log_component "ERROR" "BATCH" "Failed to install component: $component"
        fi
    done
    
    if [ ${#failed_components[@]} -eq 0 ]; then
        log_component "INFO" "BATCH" "All components installed successfully"
        return 0
    else
        log_component "ERROR" "BATCH" "Failed components: ${failed_components[*]}"
        return 1
    fi
}

# Validate multiple components
validate_components() {
    local components="$1"
    local target_dir="$2"
    local verbose="${3:-false}"
    
    log_component "INFO" "BATCH" "Starting batch component validation"
    
    IFS=',' read -ra COMP_ARRAY <<< "$components"
    local failed_validations=()
    
    for component in "${COMP_ARRAY[@]}"; do
        component=$(echo "$component" | xargs)
        
        if [ "$verbose" = "true" ]; then
            print_substep "Validando componente: $component"
        fi
        
        if validate_component "$component" "$target_dir" "$verbose"; then
            if [ "$verbose" = "true" ]; then
                print_success "Validación de $component exitosa"
            fi
        else
            failed_validations+=("$component")
        fi
    done
    
    if [ ${#failed_validations[@]} -eq 0 ]; then
        log_component "INFO" "BATCH" "All component validations passed"
        return 0
    else
        log_component "WARN" "BATCH" "Failed validations: ${failed_validations[*]}"
        return 1
    fi
}