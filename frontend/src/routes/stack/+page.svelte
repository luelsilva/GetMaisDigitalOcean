<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	let activeTab = $state('geral');

	const infraItems = [
		{
			name: 'Registro.br',
			role: 'Domínio',
			desc: 'Registro oficial do domínio principal da aplicação (.com.br).',
			details: 'Gerencia a propriedade do domínio e delegação de autoridade dos servidores DNS.',
			icon: '🌐',
			color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
		},
		{
			name: 'Cloudflare',
			role: 'DNS, CDN & Segurança',
			desc: 'Servidor de DNS rápido, proxy reverso, proteção DDoS e cache global.',
			details: 'Resolve o domínio em milissegundos, gerencia a criptografia SSL/TLS (HTTPS) de ponta a ponta e otimiza a entrega de recursos estáticos.',
			icon: '☁️',
			color: 'bg-orange-50 text-orange-700 border-orange-100'
		},
		{
			name: 'Oracle Cloud',
			role: 'Servidor VPS',
			desc: 'Instância VPS rodando no Oracle Free Tier.',
			details: 'Máquina virtual executando Ubuntu Linux, hospedando os containers da aplicação. A comunicação externa ocorre via IP público e rede interna de containers.',
			icon: '🏢',
			color: 'bg-red-50 text-red-700 border-red-100'
		},
		{
			name: 'Supabase',
			role: 'Banco de Dados PostgreSQL',
			desc: 'Banco de dados relacional hospedado na nuvem (AWS São Paulo).',
			details: 'PostgreSQL altamente escalável que armazena os esquemas de dados da aplicação. Integrado via connection pooling para gerenciar conexões concorrentes eficientemente.',
			icon: '⚡',
			color: 'bg-teal-50 text-teal-700 border-teal-100'
		},
		{
			name: 'Resend',
			role: 'Email Gateway & Webhooks',
			desc: 'Envio de emails transacionais, notificações e códigos OTP de login.',
			details: 'Serviço robusto de entrega de e-mails com webhooks integrados que notificam a API em tempo real sobre o status do envio (entregue, aberto, rejeitado).',
			icon: '✉️',
			color: 'bg-purple-50 text-purple-700 border-purple-100'
		}
	];

	const appItems = [
		{
			name: 'Svelte 5 & SvelteKit',
			role: 'Frontend Framework',
			desc: 'Desenvolvimento reativo baseado em compilação, usando a nova sintaxe de Runes.',
			details: 'Permite uma experiência rica e SPA (Single Page Application) com roteamento inteligente, SSR (Server-Side Rendering) e pré-carregamento de dados.',
			icon: '🧡',
			color: 'bg-orange-50 text-orange-700 border-orange-100'
		},
		{
			name: 'Node.js',
			role: 'Runtime do Servidor',
			desc: 'Ambiente de execução Javascript do backend e frontend (v20-slim).',
			details: 'Roda o servidor Express e gerencia a lógica interna do SvelteKit em produção.',
			icon: '🟢',
			color: 'bg-green-50 text-green-700 border-green-100'
		},
		{
			name: 'Express',
			role: 'Backend API Framework',
			desc: 'Roteamento robusto e middleware de autenticação da API.',
			details: 'Controla todos os endpoints REST da aplicação, gerenciamento de sessões, upload de arquivos e interações com o banco de dados.',
			icon: '⚙️',
			color: 'bg-gray-50 text-gray-700 border-gray-100'
		},
		{
			name: 'TailwindCSS v4',
			role: 'Estilização Base',
			desc: 'Biblioteca CSS de classes utilitárias para interfaces modernas e responsivas.',
			details: 'Utiliza a nova versão v4 baseada em compilador nativo (rápido) e carregamento otimizado de plugins diretamente no CSS.',
			icon: '🎨',
			color: 'bg-sky-50 text-sky-700 border-sky-100'
		},
		{
			name: 'Drizzle ORM & Kit',
			role: 'Mapeamento SQL & Migrações',
			desc: 'ORM TypeScript leve e rápido para banco de dados relacional.',
			details: 'Permite definir esquemas de dados em código TypeScript puro e gera automaticamente arquivos de migração SQL seguros, mantendo o banco e o código síncronos.',
			icon: '💧',
			color: 'bg-blue-50 text-blue-700 border-blue-100'
		},
		{
			name: 'Zod',
			role: 'Validação de Dados',
			desc: 'Validação de esquemas de dados em tempo de execução.',
			details: 'Valida parâmetros de entrada do usuário nas APIs do backend e no frontend, garantindo integridade das informações antes de salvar no banco.',
			icon: '🛡️',
			color: 'bg-indigo-50 text-indigo-700 border-indigo-100'
		}
	];

	const toolItems = [
		{
			name: 'Docker & Compose',
			role: 'Containerização & Orquestração',
			desc: 'Ambientes isolados e replicáveis para backend, frontend e proxy.',
			details: 'Padroniza as dependências em produção, permitindo subir toda a stack com um único comando do docker-compose.',
			icon: '🐳',
			color: 'bg-blue-50 text-blue-700 border-blue-100'
		},
		{
			name: 'Nginx',
			role: 'Proxy Reverso & Roteador',
			desc: 'Web server de alta performance que distribui as requisições.',
			details: 'Recebe as requisições HTTP na porta 80 e direciona o tráfego para os containers corretos do frontend (porta 3000) e backend (porta 3000 interna).',
			icon: '🚦',
			color: 'bg-emerald-50 text-emerald-700 border-emerald-100'
		},
		{
			name: 'LibreOffice',
			role: 'Conversor de Documentos PDF',
			desc: 'Executável LibreOffice nativo rodando dentro do container.',
			details: 'Converte os contratos editados no formato Word (.docx) diretamente para formato PDF (.pdf) em segundos e sem depender de APIs externas pagas.',
			icon: '📄',
			color: 'bg-amber-50 text-amber-700 border-amber-100'
		},
		{
			name: 'VS Code & Git',
			role: 'Edição & Controle de Versão',
			desc: 'Ferramentas de produtividade para desenvolvimento e versionamento.',
			details: 'Editor preferido com extensões de suporte e repositório Git para rastreabilidade de código.',
			icon: '💻',
			color: 'bg-violet-50 text-violet-700 border-violet-100'
		},
		{
			name: 'Antigravity AI (Gemini)',
			role: 'Copiloto de IA da DeepMind',
			desc: 'Assistente inteligente que ajuda a planejar, codificar e otimizar o sistema.',
			details: 'Fornece soluções técnicas avançadas, refatoração de código, escrita de testes e manutenção da arquitetura baseada nos padrões recomendados.',
			icon: '🤖',
			color: 'bg-purple-50 text-purple-700 border-purple-100'
		}
	];

	const steps = [
		{ title: '1. Cliente / Navegador', desc: 'Acessa o site cedup.getmais.com.br' },
		{ title: '2. Registro.br & Cloudflare', desc: 'Direciona e protege a requisição com SSL/HTTPS' },
		{ title: '3. Nginx (Proxy Reverso)', desc: 'Identifica o endpoint (/api ou rotas SvelteKit) e roteia' },
		{ title: '4. Frontend ou Backend', desc: 'Processa a lógica de negócio via Node.js em containers' },
		{ title: '5. Supabase & Resend', desc: 'Consulta banco de dados e envia e-mails se necessário' }
	];
</script>

<svelte:head>
	<title>Stack de Tecnologia | GetMais</title>
</svelte:head>

<div class="min-h-screen bg-gray-50/50 py-12">
	<div class="container mx-auto px-4 max-w-6xl">
		<!-- Header -->
		<div class="text-center mb-12">
			<span class="px-3 py-1 text-xs font-bold tracking-wider text-blue-600 bg-blue-50 border border-blue-100 rounded-full uppercase">
				Mapa de Arquitetura
			</span>
			<h1 class="text-4xl sm:text-5xl font-black text-gray-900 mt-4 tracking-tight">
				Tecnologias & Infraestrutura
			</h1>
			<p class="text-lg text-gray-500 mt-3 max-w-2xl mx-auto">
				Uma visão detalhada e interativa do ecossistema que compõe o portal e o sistema do <strong>GetMais</strong>.
			</p>
		</div>

		<!-- Tabs -->
		<div class="flex flex-wrap justify-center gap-2 mb-10 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
			<button
				class="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer {activeTab === 'geral' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => activeTab = 'geral'}
			>
				🌐 Visão Geral
			</button>
			<button
				class="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer {activeTab === 'infra' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => activeTab = 'infra'}
			>
				☁️ Infraestrutura
			</button>
			<button
				class="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer {activeTab === 'app' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => activeTab = 'app'}
			>
				⚙️ Aplicação
			</button>
			<button
				class="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer {activeTab === 'tools' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
				onclick={() => activeTab = 'tools'}
			>
				🛠️ Ferramentas & DevOps
			</button>
		</div>

		<!-- Tab Contents -->
		{#if activeTab === 'geral'}
			<div in:fade={{ duration: 150 }} class="space-y-12">
				<!-- Request Flow Visualization -->
				<div class="bg-white border border-gray-200 rounded-3xl p-6 sm:p-10 shadow-sm">
					<h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Fluxo de Requisições</h2>
					
					<div class="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
						{#each steps as step, index}
							<div class="flex flex-col items-center text-center p-4 bg-gray-50 border border-gray-100 rounded-2xl relative">
								<div class="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-3 text-sm shadow-md">
									{index + 1}
								</div>
								<h3 class="font-bold text-gray-800 text-sm mb-1">{step.title}</h3>
								<p class="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
								
								<!-- Arrow separator between items (desktop) -->
								{#if index < steps.length - 1}
									<div class="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-gray-300 text-xl font-mono select-none z-10">
										➔
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Overview Grid -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Infra Card Summary -->
					<div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 mb-4">
							<span class="text-2xl">☁️</span>
							<h3 class="text-lg font-bold text-gray-900">Infraestrutura Básica</h3>
						</div>
						<p class="text-sm text-gray-500 mb-6 leading-relaxed">
							Hospedagem, DNS, bancos e envio de emails externos. Foco em servidores seguros e alta disponibilidade.
						</p>
						<div class="flex flex-wrap gap-2">
							{#each infraItems as item}
								<span class="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">{item.name}</span>
							{/each}
						</div>
						<button 
							class="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
							onclick={() => activeTab = 'infra'}
						>
							Ver detalhes da Infraestrutura ➔
						</button>
					</div>

					<!-- App Card Summary -->
					<div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 mb-4">
							<span class="text-2xl">⚙️</span>
							<h3 class="text-lg font-bold text-gray-900">Aplicação & Linguagens</h3>
						</div>
						<p class="text-sm text-gray-500 mb-6 leading-relaxed">
							Código frontend, backend, schemas, validações de requisições e banco de dados rodando em Node.js.
						</p>
						<div class="flex flex-wrap gap-2">
							{#each appItems as item}
								<span class="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">{item.name}</span>
							{/each}
						</div>
						<button 
							class="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
							onclick={() => activeTab = 'app'}
						>
							Ver detalhes da Aplicação ➔
						</button>
					</div>

					<!-- Tools Card Summary -->
					<div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
						<div class="flex items-center gap-3 mb-4">
							<span class="text-2xl">🛠️</span>
							<h3 class="text-lg font-bold text-gray-900">Ferramentas & DevOps</h3>
						</div>
						<p class="text-sm text-gray-500 mb-6 leading-relaxed">
							Orquestração de ambientes, deploy em produção, geração local de PDFs, ferramentas de build e desenvolvimento com IA.
						</p>
						<div class="flex flex-wrap gap-2">
							{#each toolItems as item}
								<span class="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">{item.name}</span>
							{/each}
						</div>
						<button 
							class="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
							onclick={() => activeTab = 'tools'}
						>
							Ver detalhes de Ferramentas ➔
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if activeTab === 'infra'}
			<div in:fade={{ duration: 150 }} class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each infraItems as item}
					<div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3">
									<span class="text-3xl p-2 bg-gray-50 border border-gray-100 rounded-2xl">{item.icon}</span>
									<div>
										<h3 class="text-lg font-bold text-gray-900">{item.name}</h3>
										<span class="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border {item.color}">
											{item.role}
										</span>
									</div>
								</div>
							</div>
							<p class="text-sm text-gray-700 font-medium mb-3 leading-relaxed">
								{item.desc}
							</p>
							<p class="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3 mt-3">
								{item.details}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if activeTab === 'app'}
			<div in:fade={{ duration: 150 }} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each appItems as item}
					<div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3">
									<span class="text-3xl p-2 bg-gray-50 border border-gray-100 rounded-2xl">{item.icon}</span>
									<div>
										<h3 class="text-lg font-bold text-gray-900">{item.name}</h3>
										<span class="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border {item.color}">
											{item.role}
										</span>
									</div>
								</div>
							</div>
							<p class="text-sm text-gray-700 font-medium mb-3 leading-relaxed">
								{item.desc}
							</p>
							<p class="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3 mt-3">
								{item.details}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if activeTab === 'tools'}
			<div in:fade={{ duration: 150 }} class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each toolItems as item}
					<div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3">
									<span class="text-3xl p-2 bg-gray-50 border border-gray-100 rounded-2xl">{item.icon}</span>
									<div>
										<h3 class="text-lg font-bold text-gray-900">{item.name}</h3>
										<span class="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border {item.color}">
											{item.role}
										</span>
									</div>
								</div>
							</div>
							<p class="text-sm text-gray-700 font-medium mb-3 leading-relaxed">
								{item.desc}
							</p>
							<p class="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3 mt-3">
								{item.details}
							</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
