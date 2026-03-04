# Configuração de Swap na DigitalOcean

Este guia ajudará você a criar um arquivo de swap de 2GB para garantir que o seu Droplet tenha memória suficiente para compilar e rodar os containers Docker.

## Passo a Passo

Execute os seguintes comandos no terminal do seu Droplet:

### 1. Criar o arquivo de swap
Vamos criar um arquivo de 2GB (costuma ser suficiente para droplets pequenos).
```bash
sudo fallocate -l 2G /swapfile
```

### 2. Definir as permissões corretas
Apenas o usuário root deve ter permissão de leitura e escrita.
```bash
sudo chmod 600 /swapfile
```

### 3. Formatar o arquivo como swap
```bash
sudo mkswap /swapfile
```

### 4. Ativar o swap
```bash
sudo swapon /swapfile
```

### 5. Tornar a alteração permanente
Para que o swap seja ativado automaticamente após um reinício, adicione-o ao arquivo `/etc/fstab`.

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 6. Ajustar o Swappiness (Opcional, mas recomendado)
O valor de `swappiness` define com que frequência o sistema usa o swap. Para servidores, um valor em torno de 10 é ideal.

```bash
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### 7. Ajustar a pressão do cache (Opcional)
```bash
sudo sysctl vm.vfs_cache_pressure=50
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
```

## Como Verificar
Para verificar se o swap está ativo, use o comando:
```bash
sudo free -h
```
Ou:
```bash
sudo swapon --show
```
