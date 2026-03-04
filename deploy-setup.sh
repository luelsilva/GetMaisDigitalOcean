#!/bin/bash

# Script de Instalação e Configuração para DigitalOcean (Ubuntu)
# GetMais Digital Deployment Script

echo "🚀 Iniciando configuração do servidor..."

# 1. Atualizar o sistema
echo "🔄 Atualizando pacotes..."
sudo apt update && sudo apt upgrade -y

# 2. Configurar Swap (2GB)
if [ ! -f /swapfile ]; then
    echo "💾 Configurando Swap de 2GB..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    sudo sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
else
    echo "✅ Swap já configurado."
fi

# 3. Instalar Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install docker-ce -y
    sudo usermod -aG docker $USER
else
    echo "✅ Docker já instalado."
fi

# 4. Instalar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose já instalado."
fi

# 5. Firewall básico
echo "🛡️ Configurando Firewall (UFW)..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "--------------------------------------------------"
echo "✅ Configuração concluída com sucesso!"
echo "⚠️  IMPORTANTE: Você pode precisar sair e entrar novamente no SSH para que as permissões do Docker funcionem para o seu usuário."
echo "🚀 Agora você pode rodar: docker-compose up -d --build"
echo "--------------------------------------------------"
