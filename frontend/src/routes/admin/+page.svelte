<script lang="ts">
    import { fade } from 'svelte/transition';

    const adminModules = [
        { title: 'Usuários', description: 'Gerenciar contas e permissões', link: '/admin/users', icon: '👥', color: '#3b82f6' },
        { title: 'Menu', description: 'Configurar seções e itens do menu', link: '/admin/menu', icon: '📋', color: '#10b981' },
        { title: 'Modelos de Formulário', description: 'Editar configurações de TCEs', link: '/admin/form-models', icon: '📝', color: '#f59e0b' },
        { title: 'Cursos', description: 'Gerenciar cursos técnicos', link: '/admin/courses', icon: '🎓', color: '#8b5cf6' },
        { title: 'Professores', description: 'Cadastro de orientadores', link: '/admin/teachers', icon: '👨‍🏫', color: '#ec4899' },
        { title: 'Configurações', description: 'Feature Flags e ajustes do sistema', link: '/admin/settings', icon: '⚙️', color: '#64748b' },
    ];
</script>

<svelte:head>
    <title>Painel Administrativo</title>
</svelte:head>

<div class="admin-dashboard" in:fade>
    <header class="dashboard-header">
        <h1>Painel de Controle</h1>
        <p>Bem-vindo ao centro de administração do GetMais.</p>
    </header>

    <div class="modules-grid">
        {#each adminModules as module}
            <a href={module.link} class="module-card">
                <div class="icon-wrapper" style="background-color: {module.color}15; color: {module.color}">
                    <span class="icon">{module.icon}</span>
                </div>
                <div class="module-info">
                    <h3>{module.title}</h3>
                    <p>{module.description}</p>
                </div>
                <div class="arrow">→</div>
            </a>
        {/each}
    </div>
</div>

<style>
    .admin-dashboard {
        padding: 2rem;
        max-width: 1000px;
        margin: 0 auto;
    }

    .dashboard-header {
        margin-bottom: 3rem;
    }

    .dashboard-header h1 {
        font-size: 2.5rem;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 0.5rem;
    }

    .dashboard-header p {
        color: #64748b;
        font-size: 1.1rem;
    }

    .modules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .module-card {
        background: white;
        padding: 1.5rem;
        border-radius: 16px;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 1.25rem;
        border: 1px solid #e2e8f0;
        transition: all 0.3s ease;
        position: relative;
    }

    .module-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        border-color: #cbd5e1;
    }

    .icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        flex-shrink: 0;
    }

    .module-info h3 {
        color: #1e293b;
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
    }

    .module-info p {
        color: #64748b;
        font-size: 0.9rem;
        line-height: 1.4;
    }

    .arrow {
        position: absolute;
        right: 1.5rem;
        color: #cbd5e1;
        font-size: 1.25rem;
        transition: transform 0.3s ease, color 0.3s ease;
    }

    .module-card:hover .arrow {
        transform: translateX(4px);
        color: #64748b;
    }

    @media (max-width: 640px) {
        .modules-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
