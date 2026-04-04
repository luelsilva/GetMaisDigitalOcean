
Passo 1: Acessar o servidor
Abra seu terminal e acesse a máquina com sua chave SSH (mesmo comando que você usou antes):

ssh -i "caminho/para/sua/chave.pem" ubuntu@seu_ip_da_oci

Passo 2: Atualizar o sistema
Logo após conectar, vamos garantir que a máquina está atualizada:

sudo apt update && sudo apt upgrade -y

Passo 3: Instalar o Docker e o Docker Compose
Rode os seguintes comandos no terminal do servidor para instalar a engine do Docker:

# Baixa e roda o script oficial de instalação do Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adiciona o usuário "ubuntu" ao grupo docker para rodar sem precisar de "sudo" toda hora
sudo usermod -aG docker ubuntu

# Instala o plugin do Docker Compose
sudo apt install docker-compose-plugin -y

(Após rodar o comando do usermod, você precisará sair com exit e
 entrar no SSH novamente para a permissão aplicar).

Passo 4: Liberar as portas no Firewall
Na OCI, você terá duas barreiras de firewall:

Firewall do Servidor (Iptables/UFW):
No próprio servidor ubuntu da OCI, certifique-se de
liberar as portas 80 (HTTP) e 443 (HTTPS se for usar no futuro):

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

Security List da OCI (Painel Web):
Acesse o painel da Oracle Cloud.
Vá em Compute > Instances e selecione sua instância.
Na aba "Primary VNIC", clique na sua Sub-rede (Subnet).
Clique na sua Security List.
Adicione uma Ingress Rule:
Source CIDR: 0.0.0.0/0
Destination Port Range: 80 (e repita para a porta 443).

Passo 5: Transferir o projeto
Você de enviar esta pasta (GetMaisDigitalOcean) do seu Windows para o Linux.

Opção A: Usando o Git (Recomendado)
Se o seu código já estiver no GitHub:

git clone url-do-seu-repositorio
cd GetMaisDigitalOcean

Passo 6: Subir o projeto (Docker Compose)
No terminal do servidor OCI, após navegar para a pasta
onde o docker-compose.yml está usando o comando cd,
você não pode esquecer de criar e preencher o
arquivo ./backend/.env que seu Docker Compose pede:

nano backend/.env
# preencha com as variáveis do seu servidor,
depois Ctrl+O, Enter, Ctrl+X para salvar e sair

Em seguida, basta subir todos os contêineres:
docker compose up -d --build





