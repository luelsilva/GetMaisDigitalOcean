<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { fade } from 'svelte/transition';
	import Modal from '$lib/components/Modal.svelte';
	interface Props {
		data: {
			form: any;
			courses: any[];
			teachers: any[];
			internship: any | null;
			mode: 'new' | 'edit';
			internship_status: string;
			user_role: string;
		};
	}

	let { data: pageData }: Props = $props();
	let form = $derived(pageData.form);

	let pageConfig = $derived.by(() => {
		const { mode, internship_status, user_role } = pageData;

		let config = {
			message: '',
			canSave: true,
			canPDF: true,
			saveLabel: mode === 'new' ? 'Salvar Estágio' : 'Atualizar Estágio',
		};

		if (mode === 'new') {
			config.canPDF = false; // Somente o botão Salvar Estágio deve aparecer no modo criação
			config.message = `
				<p class="text-lg font-bold text-slate-800">Este documento está no modo de CRIAÇÃO.</p>
				<p class="text-lg font-bold text-slate-800">Após preencher os campos clique em salvar estágio.</p>
			`;
			return config;
		}

		// Mensagens padrão para modo de edição
		let title = 'Este documento está no modo de EDIÇÃO.';
		let subtitle = 'Após editar os campos clique em atualizar estágio.';

		// Customização baseada em status
		if (internship_status === 'FINISHED') {
			title = 'Este estágio está <span class="text-emerald-600">FINALIZADO</span>.';
			subtitle = 'O documento não pode mais ser alterado.';
			config.canSave = false;
		} else if (internship_status === 'APPROVED') {
			title = 'Este estágio está <span class="text-indigo-600">APROVADO</span>.';
		} else if (internship_status === 'WAITING_APPROVAL') {
			title = 'Este estágio está <span class="text-amber-600">AGUARDANDO APROVAÇÃO</span>.';
		}



		config.message = `
			<p class="text-lg font-bold text-slate-800">${title}</p>
			<p class="text-lg font-bold text-slate-800">${subtitle}</p>
		`;

		return config;
	});
	let formValues = $state<Record<string, any>>({});
	let submitting = $state(false);
	let successLink = $state('');

	let saving = $state(false);
	let formModified = $state(false);



	let showSaveResultModal = $state(false);
	let lastSavedId = $state('');









	function markAsModified() {
		formModified = true;
	}

	onMount(() => {
		formValues['modelo_id'] = '1501';
		formValues['copyright'] = '© 2026 LCO Systems';
		formValues['data_atual'] = new Date().toLocaleDateString('pt-BR');

		// Se estiver em modo de edição, preenche o formulário com os dados do estágio
		if (pageData.mode === 'edit' && pageData.internship) {
			if (pageData.internship.jsonData) {
				formValues = {
					...formValues,
					...pageData.internship.jsonData
				};
			}
		}
	});

	// Lógica para preencher Email, Matrícula e CPF quando o Professor é selecionado
	$effect(() => {
		const selectedTeacherName = formValues['nome_professor'] || formValues['NomeProfessor'];
		if (selectedTeacherName) {
			const teacher = pageData.teachers.find((t: any) => t.name == selectedTeacherName);
			if (teacher) {
				formValues['email_professor'] = teacher.email;
				formValues['matricula_professor'] = teacher.registration;
				if (teacher.cpf) {
					formValues['cpf_professor'] = teacher.cpf.replace(
						/(\d{3})(\d{3})(\d{3})(\d{2})/,
						'$1.$2.$3-$4'
					);
				}
			}
		}
	});

	// Lógica para preencher sigla_curso e limpar professor quando o curso é selecionado ou alterado
	$effect(() => {
		const selectedCourse =
			formValues['nome_curso'] || formValues['NomeCurso'] || formValues['sigla_curso'];
		if (selectedCourse) {
			// Procura o curso tanto pelo nome quanto pela sigla (caso o valor já seja a sigla)
			const course = pageData.courses.find(
				(c: any) => c.name == selectedCourse || c.sigla == selectedCourse
			);
			if (course) {
				if (formValues['sigla_curso'] !== course.sigla) {
					formValues['sigla_curso'] = course.sigla;
				}

				// Limpar selecionado se o professor atual não pertencer a este curso
				const currentTeacher = formValues['nome_professor'] || formValues['NomeProfessor'];
				if (currentTeacher) {
					const isTeacherInCourse =
						course.teachers && course.teachers.some((t: any) => t.name === currentTeacher);
					if (!isTeacherInCourse) {
						formValues['nome_professor'] = '';
						if (formValues['NomeProfessor'] !== undefined) formValues['NomeProfessor'] = '';
						formValues['email_professor'] = '';
						if (formValues['EmailProfessor'] !== undefined) formValues['EmailProfessor'] = '';
						formValues['matricula_professor'] = '';
						formValues['cpf_professor'] = '';
					}
				}
			}
		}
	});

	function getOptions(id: string) {
		const normalizedId = (id || '').toLowerCase().trim();
		let colLabel = '';
		if (form?.secoes) {
			for (const secao of form.secoes) {
				for (const row of secao.rows) {
					const col = row.cols.find((c: any) => c.id === id);
					if (col) {
						colLabel = (col.label || '').toLowerCase();
						break;
					}
				}
				if (colLabel) break;
			}
		}

		const isCourseField =
			normalizedId === 'sigla_curso' || normalizedId === 'nome_curso' || colLabel.includes('curso');

		const isTeacherField = normalizedId === 'nome_professor' || colLabel.includes('professor');

		if (isCourseField && pageData.courses && pageData.courses.length > 0) {
			return pageData.courses.map((c: any) => ({
				value: normalizedId === 'sigla_curso' ? c.sigla : c.name,
				label: c.name
			}));
		}

		if (isTeacherField) {
			let allowedTeachers = pageData.teachers;
			const selectedCourse =
				formValues['nome_curso'] || formValues['NomeCurso'] || formValues['sigla_curso'];

			if (selectedCourse && pageData.courses) {
				const course = pageData.courses.find(
					(c: any) => c.name == selectedCourse || c.sigla == selectedCourse
				);
				if (course) {
					allowedTeachers = course.teachers || [];
				}
			}

			if (allowedTeachers && allowedTeachers.length > 0) {
				return allowedTeachers.map((t: any) => ({ value: t.name, label: t.name }));
			}
			return [];
		}

		if (!form?.secoes) return [];
		for (const secao of form.secoes) {
			for (const row of secao.rows) {
				const foundCol = row.cols.find((c: any) => c.id === id);
				if (foundCol && foundCol.options) {
					if (Array.isArray(foundCol.options)) return foundCol.options;
					if (typeof foundCol.options === 'string') {
						try {
							const parsed = JSON.parse(foundCol.options);
							if (Array.isArray(parsed)) return parsed;
						} catch (e) {
							return foundCol.options
								.split(',')
								.map((o: string) => ({ value: o.trim(), label: o.trim() }));
						}
					}
				}
			}
		}
		return [];
	}

	// Função para prevenir entrada de caracteres não numéricos em campos numéricos
	function handleNumericKeydown(event: KeyboardEvent) {
		const key = event.key;

		// Permite: backspace, delete, tab, escape, enter, home, end, setas
		const allowedKeys = [
			'Backspace',
			'Delete',
			'Tab',
			'Escape',
			'Enter',
			'Home',
			'End',
			'ArrowLeft',
			'ArrowRight',
			'ArrowUp',
			'ArrowDown'
		];

		if (allowedKeys.includes(key)) {
			return; // Permite essas teclas
		}

		// Permite Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
		if (event.ctrlKey || event.metaKey) {
			return;
		}

		// Bloqueia se não for um dígito (0-9)
		if (!/^\d$/.test(key)) {
			event.preventDefault();
		}
	}

	function handleTextareaKeydown(event: KeyboardEvent, maxRows: number) {
		const textarea = event.currentTarget as HTMLTextAreaElement;
		const lines = textarea.value.split('\n');
		if (event.key === 'Enter' && lines.length >= maxRows) {
			event.preventDefault();
		}
	}

	function handleTextareaInput(event: Event, maxRows: number) {
		const textarea = event.currentTarget as HTMLTextAreaElement;
		const lines = textarea.value.split('\n');
		if (lines.length > maxRows) {
			textarea.value = lines.slice(0, maxRows).join('\n');
		}
	}

	async function handleCepLookup(inputId: string, cepValue: string) {
		const cep = cepValue.replace(/\D/g, '');
		let suffix = '';
		if (inputId.startsWith('Cep')) {
			suffix = inputId.substring(3);
		} else if (inputId.startsWith('cep_')) {
			suffix = inputId.substring(4);
		} else if (inputId === 'cep') {
			suffix = '';
		}

		const snakeSuffix = suffix ? `_${suffix.toLowerCase()}` : '';

		const setAddressFields = (valueOrData: any) => {
			const isData = typeof valueOrData === 'object' && valueOrData !== null;
			const logradouro = isData ? valueOrData.logradouro : valueOrData;
			const bairro = isData ? valueOrData.bairro : valueOrData;
			const localidade = isData ? valueOrData.localidade : valueOrData;
			const uf = isData ? valueOrData.uf : valueOrData;

			const targets = [
				{ key: `rua${snakeSuffix}`, val: logradouro },
				{ key: `bairro${snakeSuffix}`, val: bairro },
				{ key: `cidade${snakeSuffix}`, val: localidade },
				{ key: `estado${snakeSuffix}`, val: uf }
			];

			targets.forEach(({ key, val }) => {
				formValues[key] = val;
			});

			if (!suffix) {
				formValues['rua'] = logradouro;
				formValues['bairro'] = bairro;
				formValues['cidade'] = localidade;
				formValues['estado'] = uf;
			}
		};

		if (cep.length === 0) {
			setAddressFields('');
			return;
		}

		if (cep.length !== 8) return;
		setAddressFields('...');

		try {
			const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
			const data = await res.json();
			if (!data.erro) {
				setAddressFields(data);
			} else {
				throw new Error('CEP não encontrado');
			}
		} catch (error) {
			console.error('Erro ao buscar CEP:', error);
			setAddressFields('');
		}
	}

	function parseTimeValue(val: any): number {
		if (!val) return 0;
		if (typeof val === 'string' && val.includes(':')) {
			const [h, m] = val.split(':');
			return Number(h) + Number(m) / 60;
		}
		return Number(val) || 0;
	}

	function formatTimeValue(hours: number): string {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}

	async function checkInternshipPeriod() {
		const start = formValues['dt_inicio'] || formValues['data_inicio'] || formValues['DataInicio'];
		const end = formValues['dt_fim'] || formValues['data_final'] || formValues['DataFinal'];
		const totalHours = parseTimeValue(formValues['carga_total'] || formValues['CargaTotal']);
		const dailyHours = parseTimeValue(formValues['carga_diaria'] || formValues['CargaDiaria']);

		if (dailyHours) {
			formValues['carga_semanal'] = formatTimeValue(dailyHours * 5);
		}

		if (!start || !end || !totalHours || !dailyHours) {
			return;
		}

		try {
			const dateStart = new Date(start + 'T00:00:00');
			const dateEnd = new Date(end + 'T00:00:00');

			if (dateEnd < dateStart) {
				formValues['information'] = '❌ Erro: A data final é anterior à data de início.';
				return;
			}

			const years = [...new Set([dateStart.getFullYear(), dateEnd.getFullYear()])];
			let holidays: any[] = [];
			for (const year of years) {
				try {
					const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
					if (res.ok) {
						const data = await res.json();
						holidays = [...holidays, ...data];
					}
				} catch (e) {
					console.error(`Erro ao buscar feriados de ${year}:`, e);
				}
			}

			let workingDays = 0;
			let current = new Date(dateStart);
			while (current <= dateEnd) {
				const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
				const dateStr = current.toISOString().split('T')[0];
				const isHoliday = holidays.some((h: any) => h.date === dateStr);

				if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
					workingDays++;
				}
				current.setDate(current.getDate() + 1);
			}

			const neededDays = Math.ceil(totalHours / dailyHours);
			if (workingDays >= neededDays) {
				formValues['information'] =
					`✅ O período possui ${workingDays} dias úteis. Suficiente para completar as ${totalHours}h (necessário ${neededDays} dias).`;
			} else {
				const missingDays = neededDays - workingDays;
				formValues['information'] =
					`❌ Alerta: O período possui apenas ${workingDays} dias úteis, mas são necessários ${neededDays} dias para completar ${totalHours}h. Faltam ${missingDays} dias.`;
			}
		} catch (error) {
			console.error('Erro na validação do período:', error);
			formValues['information'] = '⚠️ Erro ao calcular período de estágio.';
		}
	}

	async function suggestEndDate(targetId?: string) {
		const start = formValues['dt_inicio'] || formValues['data_inicio'] || formValues['DataInicio'];
		const totalHours = parseTimeValue(formValues['carga_total'] || formValues['CargaTotal']);
		const dailyHours = parseTimeValue(formValues['carga_diaria'] || formValues['CargaDiaria']);

		if (!start || !totalHours || !dailyHours) {
			alert('Preencha a Carga Total, Carga Diária e Data de Início para sugerir uma data final.');
			return;
		}

		const neededDays = Math.ceil(totalHours / dailyHours);
		let workingDaysFound = 0;
		let currentDate = new Date(start + 'T00:00:00');

		try {
			// Buscar feriados para o ano atual e o próximo
			const currentYear = currentDate.getFullYear();
			const years = [currentYear, currentYear + 1];
			let holidays: any[] = [];
			for (const year of years) {
				const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
				if (res.ok) {
					const data = await res.json();
					holidays = [...holidays, ...data];
				}
			}

			// Loop para encontrar a data final (Incluindo o dia de início no cálculo)
			while (true) {
				const dayOfWeek = currentDate.getDay();
				const dateStr = currentDate.toISOString().split('T')[0];
				const isHoliday = holidays.some((h: any) => h.date === dateStr);

				if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
					workingDaysFound++;
				}

				if (workingDaysFound >= neededDays) break;

				currentDate.setDate(currentDate.getDate() + 1);
			}

			const suggestedDate = currentDate.toISOString().split('T')[0];

			// Atualiza todas as possíveis variações de ID para o campo de data final
			const endId =
				targetId ||
				['dt_fim', 'data_final', 'DataFinal'].find((id) => formValues[id] !== undefined) ||
				'data_final';
			formValues[endId] = suggestedDate;

			// Força atualização em outros campos que possam existir no JSON do formulário
			Object.keys(formValues).forEach((key) => {
				if (
					key.toLowerCase().includes('datafinal') ||
					key.toLowerCase() === 'dt_fim' ||
					key.toLowerCase() === 'data_final'
				) {
					formValues[key] = suggestedDate;
				}
			});

			// Se o targetId foi passado, garante que ele está marcado como modificado
			markAsModified();

			alert(`Data sugerida: ${currentDate.toLocaleDateString('pt-BR')} (${neededDays} dias úteis)`);
		} catch (error) {
			console.error('Erro ao sugerir data:', error);
			alert('Erro ao calcular data sugerida.');
		}
	}

	function syncTurno() {
		const selectTurno = formValues['select_turno'];
		if (selectTurno === 'Matutino') {
			formValues['turno'] = '( X ) M    (    ) V     (    ) N';
		} else if (selectTurno === 'Vespertino') {
			formValues['turno'] = '(    ) M    ( X ) V     (    ) N';
		} else if (selectTurno === 'Noturno') {
			formValues['turno'] = '(    ) M    (    ) V     ( X ) N';
		}
	}

	async function handleSave(silent = false) {
		syncTurno();
		await checkInternshipPeriod();
		if (!formValues['nome_aluno'] && !formValues['NomeAluno']) {
			alert('Por favor, preencha o Nome do Aluno antes de salvar.');
			return false;
		}
		if (!formValues['nome_curso'] && !formValues['NomeCurso'] && !formValues['sigla_curso']) {
			alert('Por favor, selecione o Curso antes de salvar.');
			return false;
		}

		saving = true;

		try {
			const cleanVal = (val) =>
				val === undefined || val === null || String(val).trim() === '' ? null : val;

			const internshipData = {
				studentRegistration: cleanVal(
					formValues['matricula_aluno'] || formValues['matricula'] || formValues['MatriculaAluno']
				),
				studentName:
					cleanVal(formValues['nome_aluno'] || formValues['NomeAluno']) ||
					pageData.internship?.studentName,
				courseSigla:
					cleanVal(formValues['sigla_curso'] || formValues['nome_curso']) ||
					pageData.internship?.courseSigla,
				companyName:
					cleanVal(
						formValues['nome_empresa'] ||
							formValues['NomeEmpresa'] ||
							formValues['razao_social'] ||
							formValues['empresa']
					) || pageData.internship?.companyName,
				startDate: cleanVal(
					formValues['dt_inicio'] || formValues['data_inicio'] || formValues['DataInicio']
				),
				endDate: cleanVal(
					formValues['dt_fim'] || formValues['data_final'] || formValues['DataFinal']
				),
				jsonData: formValues,
				status: 'DRAFT'
			};

			// Converter matrícula para número se existir
			if (internshipData.studentRegistration) {
				internshipData.studentRegistration = Number(internshipData.studentRegistration);
			}

			

			let response;
			if (pageData.mode === 'edit' && pageData.internship) {
				response = await apiFetch(`/internships/${pageData.internship.id}`, {
					method: 'PUT',
					body: JSON.stringify(internshipData)
				});
			} else {
				response = await apiFetch('/internships', {
					method: 'POST',
					body: JSON.stringify(internshipData)
				});
			}

			if (response.ok) {
				formModified = false;
				const savedData = await response.json();
				lastSavedId = savedData.id;

				if (!silent) {
					showSaveResultModal = true;
				}
				return true;
			} else {
				const err = await response.json();
				console.error('Erro ao salvar:', err);
				return false;
			}
		} catch (err) {
			console.error(err);
			return false;
		} finally {
			saving = false;
		}
	}

	async function handleSubmit(type = 'pdf') {
		// Salva automaticamente antes de gerar o documento
		const saved = await handleSave(true);
		if (!saved) return;

		if (type === 'pdf') {
			const now = new Date();
			formValues['data_hora_conversao'] = now.toLocaleString('pt-BR');
			formValues['data_conversao'] = now.toLocaleDateString('pt-BR');
			formValues['hora_conversao'] = now.toLocaleTimeString('pt-BR');
		}

		submitting = true;
		if (type === 'pdf') {
			if (successLink) URL.revokeObjectURL(successLink);
			successLink = '';
		}
		try {
			const dataToSubmit = { ...formValues };
			const allKeys = Object.keys(formValues);
			const suffixes = new Set<string>();
			allKeys.forEach((key) => {
				const snakeMatch = key.match(/^(rua|cep|bairro|cidade|estado|uf|num_ender)_(.+)$/i);
				if (snakeMatch && snakeMatch[2]) {
					suffixes.add(snakeMatch[2]);
				}
			});

			suffixes.forEach((suffix) => {
				const suffixLower = suffix.toLowerCase();
				const suffixCap = suffix.charAt(0).toUpperCase() + suffix.slice(1);
				const getVal = (prefix: string, snakePrefix: string) => {
					return (
						formValues[`${prefix}${suffix}`] ||
						formValues[`${prefix}${suffixCap}`] ||
						formValues[`${prefix}${suffixLower}`] ||
						formValues[`${snakePrefix}_${suffixLower}`] ||
						''
					);
				};
				const rua = getVal('Rua', 'rua');
				const numero = getVal('Numero', 'num_ender');
				const bairro = getVal('Bairro', 'bairro');
				const cidade = getVal('Cidade', 'cidade');
				const uf = getVal('Estado', 'estado') || getVal('Uf', 'uf');
				const cep = getVal('Cep', 'cep');
				if (rua || numero || bairro || cidade || uf || cep) {
					const value = `${rua}, ${numero} ${bairro} - ${cidade}/${uf}${cep ? ` - CEP: ${cep}` : ''}`;
					dataToSubmit[`ender_completo_${suffixLower}`] = value;
				}
			});

			if (form?.secoes) {
				form.secoes.forEach((secao) => {
					secao.rows.forEach((row) => {
						row.cols.forEach((col) => {
							const inputId = col.id;
							if (!inputId) return;
							const xxMatch = inputId.match(/^xx\d(.+)$/);
							if (xxMatch) {
								const sourceId = xxMatch[1];
								if (dataToSubmit[sourceId] !== undefined) {
									dataToSubmit[inputId] = dataToSubmit[sourceId];
								} else if (formValues[sourceId] !== undefined) {
									dataToSubmit[inputId] = formValues[sourceId];
								}
							}
							let val = dataToSubmit[inputId];
							if (val === undefined || val === null || val === '') {
								dataToSubmit[inputId] = ' '.repeat(inputId.length);
								return;
							}
							if (
								(col.type === 'date' || xxMatch) &&
								typeof val === 'string' &&
								/^\d{4}-\d{2}-\d{2}$/.test(val)
							) {
								const parts = val.split('-');
								dataToSubmit[inputId] = `${parts[2]}/${parts[1]}/${parts[0]}`;
							}
						});
					});
				});
			}

			const nomeAluno = formValues['nome_aluno'] || formValues['NomeAluno'] || 'Novo_Documento';
			const nomeDocumento = `1501 - ${nomeAluno}`;

			const payload = {
				template_id: '1501',
				nome_documento: nomeDocumento,
				data: dataToSubmit
			};

			
			const endpoint = type === 'pdf' ? '/documentos/gerar-pdf' : '/documentos/gerar-docx';

			const res = await apiFetch(
				endpoint,
				{
					method: 'POST',
					body: JSON.stringify(payload)
				},
				60000
			); 

			if (res.ok) {
				const blob = await res.blob();
				if (type === 'pdf') {
					if (successLink) URL.revokeObjectURL(successLink);
					successLink = URL.createObjectURL(blob);
				}
			} else {
				const err = await res.json();
				console.error('Erro ao gerar documento:', err);
			}
		} catch (err) {
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	function handleCloseModal() {
		showSaveResultModal = false;
		showSavedModal = false;
		if (pageData.mode === 'new' && lastSavedId) {
			window.location.href = `/gotce/v4?id=${lastSavedId}`;
		}
	}
</script>

<!-- Modal Unificado de Resultado do Salvamento (V2 - NEW/DRAFT) -->
<Modal bind:show={showSaveResultModal}>
	<div class="p-6" style="min-width: 340px; max-width: 480px;">
		<!-- Ícone de sucesso -->
		<div class="mb-4 flex flex-col items-center text-center">
			<div
				class="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl"
			>
				✅
			</div>
			<h3 class="text-xl font-black text-slate-800">Documento salvo com sucesso!</h3>
		</div>



		<!-- Botões contextuais -->
		<div class="flex flex-col gap-3">
			<button
					onclick={handleCloseModal}
					class="btn-action w-full bg-slate-700 hover:bg-slate-800"
				>
					OK
				</button>
			</div>
		</div>
	</Modal>



<svelte:head>
	<title>{form?.titulo || 'Carregando...'} | Cedup</title>
</svelte:head>

{#if form && form.secoes}
	<div class="myform-container" style="background-color: {form.bgColor}">
		<div class="myform-card" style="background-color: {form.cardBgColor}">
			<h4 class="myform-titulo" style="color: {form.tituloColor}">
				{form.titulo}
			</h4>

			<!-- Status Badge movido para o final -->

			{#if form.description}
				<p class="myform-description" style="color: {form.tituloColor}; opacity: 0.8;">
					{@html form.description}
				</p>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit('pdf');
				}}
				class="myform-form"
			>
				<div class="secoes-container">
					{#each form.secoes as secao}
						<div
							class="secao-card"
							style={secao.active ? `border-left: 8px solid ${secao.color}` : ''}
						>
							<h5 class="secao-titulo" style="color: {secao.color}">
								{secao.titulo}
							</h5>
							<div class="secao-body">
								{#each secao.rows as row}
									<div class="row-container">
										<div class="row-cols">
											{#each row.cols as col, colIdx}
												{@const inputId = col.id || `in-${secao.titulo}-${row.id}-${colIdx}`}
												{@const inputType = col.type || 'text'}
												{#if inputType === 'hidden'}
													<input id={inputId} type="hidden" bind:value={formValues[inputId]} />
												{:else}
													<div
														class="col-item"
														style={col.width ? `width: ${col.width}; flex: none;` : ''}
													>
														<label for={inputId} class="col-label" style="color: {secao.color}"
															>{col.label}</label
														>
														{#if inputType === 'textarea'}
															<textarea
																id={inputId}
																class="col-input"
																style="min-height: {col.nRows ? col.nRows * 1.6 + 'rem' : '6rem'}"
																rows={col.nRows || undefined}
																maxlength={col.totalChar || undefined}
																required={col.required}
																bind:value={formValues[inputId]}
																onchange={markAsModified}
																onkeydown={col.nRows
																	? (e) => handleTextareaKeydown(e, col.nRows)
																	: undefined}
																oninput={col.nRows
																	? (e) => handleTextareaInput(e, col.nRows)
																	: undefined}
															></textarea>
														{:else if inputType === 'select'}
															<select
																id={inputId}
																class="col-input"
																required={col.required}
																bind:value={formValues[inputId]}
																onchange={markAsModified}
															>
																<option value="" disabled selected>Selecione...</option>
																{#each getOptions(inputId) as opt}
																	<option value={opt.value}>{opt.label}</option>
																{/each}
															</select>
														{:else if inputType === 'readonly'}
															<input
																id={inputId}
																type="text"
																class="col-input cursor-not-allowed bg-gray-50"
																readonly
																bind:value={formValues[inputId]}
															/>
														{:else if inputType === 'cep'}
															<input
																id={inputId}
																type="text"
																class="col-input"
																required={col.required}
																bind:value={formValues[inputId]}
																maxlength="9"
																placeholder="00000-000"
																onchange={markAsModified}
																onblur={(e) => handleCepLookup(inputId, e.currentTarget.value)}
															/>
														{:else}
															<div class="relative flex items-center">
																<input
																	id={inputId}
																	type={inputType}
																	class="col-input"
																	required={col.required}
																	bind:value={formValues[inputId]}
																	onchange={markAsModified}
																	onkeydown={inputType === 'number'
																		? handleNumericKeydown
																		: undefined}
																/>
																{#if inputType === 'date' && (inputId
																		.toLowerCase()
																		.includes('fim') || inputId.toLowerCase().includes('final'))}
																	<button
																		type="button"
																		onclick={() => suggestEndDate(inputId)}
																		class="ml-1 text-xl transition-transform hover:scale-110 active:scale-95"
																		title="Sugerir data final baseada em dias úteis"
																	>
																		💡
																	</button>
																{/if}
															</div>
														{/if}
													</div>
												{/if}
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-8 flex w-full flex-col items-center gap-4">
					<div
						class="flex w-full max-w-2xl flex-col items-center gap-1 border-t border-b border-gray-100 py-4 text-center"
					>
						{@html pageConfig.message}
					</div>

					<div class="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
						{#if pageConfig.canSave}
							<button
								type="button"
								onclick={handleSave}
								disabled={!formModified || saving}
								class="btn-submit flex-1"
								style="background-color: {form.tituloColor}; opacity: {!formModified || saving
									? 0.5
									: 1}; cursor: {!formModified || saving ? 'not-allowed' : 'pointer'};"
							>
								{#if saving}
									<span class="mr-2 animate-spin">🌀</span> Salvando...
								{:else}
									💾 {pageConfig.saveLabel}
								{/if}
							</button>
						{/if}

						{#if pageConfig.canPDF}
							<button
								type="submit"
								disabled={submitting}
								class="btn-submit flex-1"
								style="background-color: #dc2626"
							>
								{#if submitting}
									<span class="mr-2 animate-spin">🌀</span> Processando...
								{:else}
									📕 Gerar PDF
								{/if}
							</button>
						{/if}
					</div>
					{#if successLink}
						<div
							class="flex w-full max-w-md flex-col gap-4 rounded-2xl border-2 border-blue-500 bg-white p-6 text-center shadow-xl"
							in:fade
						>
							<p class="mb-4 font-bold text-blue-700">✨ Documento pronto!</p>
							<div class="flex flex-col justify-center gap-3 sm:flex-row">
								<a
									href={successLink}
									download={`1501-${formValues['nome_aluno'] || formValues['NomeAluno'] || 'documento'}.pdf`}
									class="btn-action w-full bg-red-600 hover:bg-red-700"
								>
									📥 Baixar PDF
								</a>
							</div>
						</div>
					{/if}
				</div>
			</form>
		</div>
	</div>


{:else}
	<div class="flex min-h-[70vh] items-center justify-center">
		<p class="animate-pulse text-gray-500">Carregando formulário...</p>
	</div>
{/if}

<style>
	.row-container {
		display: flex;
		flex-direction: column;
	}
	.row-cols {
		display: flex;
		gap: 0.75rem;
		width: 100%;
		flex-wrap: wrap;
	}
	.col-item {
		flex: 1;
		min-width: 150px;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background-color: white;
		padding: 0.5rem;
	}
	@media (max-width: 768px) {
		.myform-container {
			padding: 1rem;
		}
		.myform-card {
			width: 100%;
			padding: 1.5rem 1rem;
		}
		.myform-titulo {
			font-size: 1.75rem;
		}
		.col-item {
			width: 100% !important;
			flex: none;
		}
	}
	.col-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}
	.col-input {
		width: 100%;
		border: 1px solid #abacad;
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		outline: none;
	}
	.secoes-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 0.5rem;
	}
	.secao-card {
		background-color: #ffffff;
		padding: 0.5rem;
		border-radius: 1rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		width: 100%;
	}
	.secao-titulo {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
	}
	.secao-body {
		color: #6b7280;
		font-size: 0.875rem;
	}
	.myform-container {
		display: flex;
		flex: 1;
		width: 100%;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		min-height: 70vh;
	}
	.myform-card {
		width: 90%;
		border-radius: 1.5rem;
		box-shadow: 0 25px 50px -12px rgba(244, 114, 182, 0.25);
		padding: 2.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.myform-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.myform-titulo {
		font-size: 2.25rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}
	.myform-description {
		font-size: 1.125rem;
		margin-bottom: 2rem;
		text-align: justify;
		max-width: 800px;
	}
	.btn-submit {
		width: 100%;
		max-width: 400px;
		color: white;
		font-weight: 800;
		font-size: 1.125rem;
		padding: 1rem 2rem;
		border-radius: 1rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-submit:hover:not(:disabled) {
		transform: translateY(-2px);
		filter: brightness(110%);
	}
	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-action {
		flex: 1;
		color: white;
		font-weight: 700;
		padding: 0.75rem 1.5rem;
		border-radius: 0.75rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
</style>
