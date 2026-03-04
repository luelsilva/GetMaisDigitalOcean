# Guia: Como Gerar Credenciais do Google (Service Account)

Este guia explica como criar novas credenciais para o arquivo `credentials.json` do backend (/urso).

## Passo 1: Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. No topo da página, selecione o seu projeto (ou crie um novo para cada conta se quiser isolamento total).
3. No menu lateral esquerdo, vá em **APIs e Serviços** > **Biblioteca**.
4. Procure e **Ative** as seguintes APIs (se ainda não estiverem):
   - **Google Drive API**
   - **Google Docs API**

## Passo 2: Criar a Conta de Serviço (Service Account)

1. No menu lateral, vá em **APIs e Serviços** > **Credenciais**.
2. Clique em **+ CRIAR CREDENCIAIS** no topo e escolha **Conta de serviço**.
3. Preencha o nome (ex: `cedup-router-1`) e clique em **CRIAR E CONTINUAR**.
4. Em "Papéis" (Roles), você pode selecionar `Básico` > `Editor` (necessário para criar e editar arquivos).
5. Clique em **CONCLUIR**.

## Passo 3: Gerar a Chave JSON

1. Na lista de credenciais, você verá a conta que acabou de criar na seção "Contas de serviço". Clique no ícone de lápis (Editar) ou no e-mail dela.
2. Vá na aba **CHAVES**.
3. Clique em **ADICIONAR CHAVE** > **Criar nova chave**.
4. Escolha o formato **JSON** e clique em **CRIAR**.
5. Um arquivo será baixado para o seu computador. **Este é o conteúdo que deve ir para dentro da chave `"credentials"` no nosso arquivo JSON do projeto.**

## Passo 4: Configurar a Pasta de Destino

1. Vá ao Google Drive onde quer salvar os documentos.
2. Crie uma pasta ou use uma existente.
3. Copie o ID da pasta da URL (é o código que fica após `/folders/XXXXXXXXX`).
4. **IMPORTANTE:** Compartilhe esta pasta no Google Drive com o e-mail da Conta de Serviço que você criou (o e-mail termina em `.iam.gserviceaccount.com`). Dê a ela permissão de **Editor**.

## Passo 5: Atualizar o Projeto

Adicione um novo bloco no arquivo `urso\src\config\credentials.json`:

```json
{
  "accountEmail": "E-MAIL_DA_CONTA_GERADA",
  "folderId": "ID_DA_PASTA_DO_DRIVE",
  "credentials": {
    // COLE AQUI TODO O CONTEÚDO DO ARQUIVO .JSON BAIXADO NO PASSO 3
  }
}
```

---

**Dica:** Repita o processo para cada conta nova que desejar adicionar para o roteamento.
