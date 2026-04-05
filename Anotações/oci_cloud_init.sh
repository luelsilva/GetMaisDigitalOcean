#!/bin/bash
# Script de Inicialização (Cloud-init / User Data) para a Oracle Cloud
# Esse log ajuda a debugar se algo falhar (ficará salvo em /var/log/user-data.log)
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Iniciando as configurações preparatórias na nova instância OCI..."

# --- 1. Atualizar Pacotes ---
echo "Atualizando sistema..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# --- 2. Criar e Ativar Swap (2GB) ---
echo "Configurando Swap de 2GB..."
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Tornar Swap permanente no boot
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Ajustar swappiness
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl vm.vfs_cache_pressure=50
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

# --- 3. Instalar Dependências e Firewall ---
echo "Liberando as portas HTTP e HTTPS no firewall local..."
DEBIAN_FRONTEND=noninteractive apt-get install -y netfilter-persistent iptables-persistent git

# Oracle Cloud usa iptables por padrão, adicionando as portas na regra 6
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

# --- 4. Instalar Docker e Docker Compose ---
echo "Instalando Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install docker-compose-plugin -y

# Adiciona o usuário padrão do Ubuntu (na OCI geralmente é 'ubuntu') ao grupo docker
usermod -aG docker ubuntu

echo "=== Configuração automática finalizada com sucesso! ==="
