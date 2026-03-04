# Guia: Sistema de DevNotes (Anotações do Desenvolvedor)

O sistema **DevNotes** permite adicionar lembretes técnicos e regras de negócio "invisíveis" diretamente nas páginas, acessíveis via atalho **F2**.

---

## 1. Como incluir anotações em uma NOVA página

Se a página ainda não tem anotações, siga estes passos:

1.  Abra o arquivo `.svelte` da página (ex: `src/routes/minha-pagina/+page.svelte`).
2.  No topo do `<script>`, faça os imports necessários:
    ```typescript
    import { onMount } from 'svelte';
    import { devNotes } from '$lib/stores/devNotes.svelte';
    ```
3.  Dentro da função `onMount`, chame o `devNotes.setNotes` passando um array de strings (pode usar HTML básico como `<strong>`):
    ```typescript
    onMount(() => {
        devNotes.setNotes([
            "<strong>Lógica Importante:</strong> Esta página faz X e Y automaticamente.",
            "<strong>Atenção:</strong> O ID usado aqui é fixo.",
            "Qualquer outra anotação técnica útil para o futuro..."
        ]);
        
        // ... restante do seu código onMount ...
    });
    ```
    
    *Dica: Se a página não tiver `onMount`, você pode criar o bloco `onMount(() => { ... })` apenas para isso.*

---

## 2. Como EDITAR anotações existentes

Para alterar notas de uma página que já possui documentação:

1.  Abra o arquivo `.svelte` da página.
2.  Procure por `devNotes.setNotes`.
3.  Edite, adicione ou remova as linhas de texto dentro dos colchetes `[]`.
4.  Salve o arquivo. A mudança é imediata (não requer rebuild).

---

## Funcionamento Global
*   **Atalho:** Pressione **F2** em qualquer lugar da aplicação para ver as notas da página atual.
*   **Onde fica o código central?**
    *   Store: `src/lib/stores/devNotes.svelte.ts`
    *   Componente Visual: `src/lib/components/DevNotes.svelte`
