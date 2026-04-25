<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { user } from '$lib/stores/auth';
	import { fade } from 'svelte/transition';
	import { devNotes } from '$lib/stores/devNotes.svelte';
	import Modal from '$lib/components/Modal.svelte';

	interface Props {
		data: {
			form: any;
			courses: any[];
			teachers: any[];
			internship: any | null;
			mode: 'new' | 'edit';
		};
	}

	let { data: pageData }: Props = $props();
	let form = $derived(pageData.form);
	let formValues = $state<Record<string, any>>({});
	let submitting = $state(false);
	let successLink = $state('');
	let successLinkDocx = $state('');

	let saving = $state(false);
	let saveSuccess = $state(false);
	let formModified = $state(false);
	
	let internshipStatus = $state('DRAFT');
	let isAuthority = $derived(['teacher', 'admin', 'sudo'].includes($user?.roles || $user?.role || ''));

	// Status confirmation variables
	let showStatusModal = $state(false);
	let pendingStatus = $state('');

	let toastMessage = $state('');
	let toastType = $state<'success' | 'error' | 'warning'>('success');

	let showSavedModal = $state(false);
	let sendingEmail = $state(false);
	let lastSavedId = $state('');
	
	const uiState = $derived.by(() => {
		const role = ($user?.roles || $user?.role || '').toString().toLowerCase();
		const status = internshipStatus;
		const isNew = pageData.mode === 'new';

		if (isNew) {
			return {
				line1: "Este documento está no modo de criação.",
				line2: "Após preencher os campos clique em salvar estágio.",
				showSave: true,
				showPdf: false,
				statusButtons: []
			};
		}

		if (status === 'DRAFT') {
			return {
				line1: "Este documento está no modo de edição.",
				line2: "Após editar os campos clique em atualizar estágio.",
				showSave: true,
				showPdf: false,
				statusButtons: isAuthority ? ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'STARTED'] : []
			};
		}

		if (status === 'WAITING_APPROVAL') {
			if (isAuthority) {
				return {
					line1: "Professor, revise, faça as correções que se fizerem necessárias e clique em aprovar.",
					line2: "Caso não seja possível fazer as correções que se fizerem necessárias, altere o status do TCE para \"editando\" e envie um email a empresa para fazer as correções.",
					showSave: true,
					showPdf: false,
					statusButtons: ['DRAFT', 'APPROVED']
				};
			}
			return {
				line1: "Este documento está aguardando revisão e aprovação do professor",
				line2: "e não poderá ser modificado.",
				showSave: false,
				showPdf: false,
				statusButtons: []
			};
		}

		if (status === 'APPROVED') {
			return {
				line1: "Este documento foi revisado e aprovado pelo professor.",
				line2: "Você pode agora gerar os PDFs, imprimir em 3 vias e colher as assinaturas.",
				showSave: false,
				showPdf: true,
				statusButtons: isAuthority ? ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'STARTED'] : []
			};
		}

		if (status === 'STARTED') {
			return {
				line1: "Este documento já foi assinado e registrado.",
				line2: "O aluno já iniciou o estágio.",
				showSave: false,
				showPdf: false,
				statusButtons: isAuthority ? ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'STARTED'] : []
			};
		}

		return { 
            line1: "", 
            line2: "", 
            showSave: false, 
            showPdf: false, 
            statusButtons: isAuthority ? ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'STARTED'] : [] 
        };
	});


	function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
		toastMessage = message;
		toastType = type;
		// Mensagens de erro ou aviso ficam por mais tempo
		const duration = type === 'success' ? 3000 : 6000;
		setTimeout(() => {
			if (toastMessage === message) {
				toastMessage = '';
			}
		}, duration);
	}

	function checkMissingRequiredFields() {
		const missing: string[] = [];
		if (form?.secoes) {
			form.secoes.forEach((secao: any) => {
				secao.rows.forEach((row: any) => {
					row.cols.forEach((col: any) => {
						const inputId = col.id;
						if (!inputId || col.type === 'hidden' || col.type === 'readonly') return;
						
						if (col.required !== false) {
							const val = formValues[inputId];
							if (val === undefined || val === null || String(val).trim() === "") {
								missing.push(col.label);
							}
						}
					});
				});
			});
		}
		return missing;
	}

	function markAsModified() {
		formModified = true;
	}

	onMount(() => {
		// Documentação para Desenvolvedores (Acessível via F2)
		devNotes.setNotes([
			'<strong>Responsabilidade:</strong> Página especialista para o TCE (Modelo 1501). DIFERENTE do `form-show`, esta página **salva os dados** na tabela `internships` (CRUD completo) além de gerar o PDF.',
			'<strong>Regra de Endereços Automáticos:</strong> O sistema varre chaves como `RuaAluno`, `CepEmpresa` e gera automaticamente o campo `EnderCompleto{Sulfixo}`.',
			'<strong>Duplicação de Campos:</strong> Campos `xx` + dígito (ex: `xx1Nome`) copiam o valor do original.',
			'<strong>Autofill Professor:</strong> Seleção de professor preenche e-mail e matrícula.',
			'<strong>IDs Especiais:</strong> `modelo_id` fixo em `1501`. `copyright` e `data_atual` injetados.',
			'<strong>Debug:</strong> Os dados enviados para a geração do PDF são logados no console como `[DEBUG PDF PAYLOAD]`.'
		]);

		// Inicializar campos especiais
		formValues['modelo_id'] = '1501';
		formValues['copyright'] = `© ${new Date().getFullYear()} LCO Systems`;
		formValues['data_atual'] = new Date().toLocaleDateString('pt-BR');

		console.log('🔰 [PAGE MOUNT]: User store state:', $user);

		// Se estiver em modo de edição, preenche o formulário com os dados do estágio
		if (pageData.mode === 'edit' && pageData.internship) {
			internshipStatus = pageData.internship.status || 'DRAFT';
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
					const isTeacherInCourse = course.teachers && course.teachers.some((t: any) => t.name === currentTeacher);
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

	async function handleSave() {
		syncTurno();
		await checkInternshipPeriod();
		if (!formValues['nome_aluno']) {
			showToast('Por favor, preencha o nome do aluno', 'error');
			return;
		}
		if (!formValues['nome_curso']) {
			showToast('Por favor, selecione o curso', 'error');
			return;
		}

		saving = true;
		saveSuccess = false;

		try {
			const cleanVal = (val) => (val === undefined || val === null || String(val).trim() === "") ? null : val;

			const internshipData = {
				studentRegistration: cleanVal(formValues['matricula_aluno'] || formValues['matricula'] || formValues['MatriculaAluno']),
				studentName: cleanVal(formValues['nome_aluno'] || formValues['NomeAluno']) || pageData.internship?.studentName,
				courseSigla: cleanVal(formValues['sigla_curso'] || formValues['nome_curso']) || pageData.internship?.courseSigla,
				companyName: cleanVal(formValues['nome_empresa'] || formValues['NomeEmpresa'] || formValues['razao_social'] || formValues['empresa']) || pageData.internship?.companyName,
				startDate: cleanVal(formValues['dt_inicio'] || formValues['data_inicio'] || formValues['DataInicio']),
				endDate: cleanVal(formValues['dt_fim'] || formValues['data_final'] || formValues['DataFinal']),
				jsonData: formValues,
				status: internshipStatus
			};

			// Converter matrícula para número se existir
			if (internshipData.studentRegistration) {
				internshipData.studentRegistration = Number(internshipData.studentRegistration);
			}

			console.log('📦 [DEBUG SAVE PAYLOAD]:', internshipData);

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
				saveSuccess = true;
				formModified = false; // Reseta depois de salvar
				const savedData = await response.json();

				const missing = checkMissingRequiredFields();
				if (missing.length > 0) {
					showToast(
						`Salvo com sucesso! Porém existem ${missing.length} campo(s) obrigatório(s) pendente(s).`,
						'warning'
					);
				} else {
					showToast(
						pageData.mode === 'edit'
							? 'Estágio atualizado com sucesso!'
							: 'Estágio salvo com sucesso!',
						'success'
					);
				}
				
				lastSavedId = savedData.id;

				console.log('🔍 [DEBUG ROLE CHECK]:', { 
					user: $user, 
					rolePlural: $user?.roles, 
					roleSingular: $user?.role || $user?.roles 
				});

				// Se for empresa, abre o modal de recomendação de envio de e-mail ao professor
				const userRole = ($user?.roles || $user?.role || '').toString().toLowerCase();
				if (userRole === 'company') {
					console.log('✨ [MODAL TRIGGERED]');
					showSavedModal = true;
				} else if (pageData.mode === 'new') {
					console.log('⏭ [NO MODAL - REDIRECTING]');
					window.location.href = `/gotce/v2?id=${savedData.id}`;
				}

			} else {
				const err = await response.json();
				showToast('Erro ao salvar: ' + (err.error || 'Erro desconhecido'), 'error');
			}
		} catch (err) {
			console.error(err);
			showToast('Erro de conexão ao salvar o estágio', 'error');
		} finally {
			saving = false;
		}
	}

	async function handleSubmit(type = 'pdf') {
		/* 
		// Se o formulário tiver modificações pendentes, salve primeiro antes de gerar
		if (formModified) {
			await handleSave();
			// Se encontrou erro ao salvar ou falhou, não prossiga com a geração do documento
			if (!saveSuccess) {
				return;
			}
		}
		*/

		syncTurno();
		await checkInternshipPeriod();

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
		} else {
			if (successLinkDocx) URL.revokeObjectURL(successLinkDocx);
			successLinkDocx = '';
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
								// Agora buscamos de dataToSubmit, que já contém os endereços gerados
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
							// Formatação de Data para o padrão PT-BR (DD/MM/YYYY)
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

			console.log('📄 [DEBUG PAYLOAD]:', payload);
            const endpoint = type === 'pdf' ? '/documentos/gerar-pdf' : '/documentos/gerar-docx';

			const res = await apiFetch(endpoint, {
				method: 'POST',
				body: JSON.stringify(payload)
			}, 60000); // Aumentado para 60 segundos por ser um processo pesado

			if (res.ok) {
				const blob = await res.blob();
				if (type === 'pdf') {
                    if (successLink) URL.revokeObjectURL(successLink);
					successLink = URL.createObjectURL(blob);
				} else {
                    if (successLinkDocx) URL.revokeObjectURL(successLinkDocx);
					successLinkDocx = URL.createObjectURL(blob);
				}
			} else {
				const err = await res.json();
				showToast('Erro ao gerar documento: ' + (err.error || 'Erro desconhecido'), 'error');
			}
		} catch (err) {
			console.error(err);
			showToast('Erro de conexão ao gerar o documento', 'error');
		} finally {
			submitting = false;
		}
	}

	async function handleNotifyProfessor() {
		const professorName = formValues['nome_professor'] || formValues['NomeProfessor'];
		const professorEmail = formValues['email_professor'] || formValues['EmailProfessor'];

		if (!professorEmail) {
			showToast('E-mail do professor não encontrado no formulário', 'error');
			return;
		}

		sendingEmail = true;
		try {
			const res = await apiFetch(`/internships/${lastSavedId || pageData.internship?.id}/notificar-professor`, {
				method: 'POST',
				body: JSON.stringify({
					teacherName: professorName,
					teacherEmail: professorEmail
				})
			});

			if (res.ok) {
				showToast('E-mail enviado ao professor com sucesso!');
				showSavedModal = false;
				// Se for um novo estágio, após fechar o modal (neste caso enviou email), redireciona
				if (pageData.mode === 'new') {
					window.location.href = `/gotce/v2?id=${lastSavedId}`;
				}
			} else {
				const err = await res.json();
				showToast('Erro ao notificar professor: ' + (err.error || 'Erro desconhecido'), 'error');
			}
		} catch (err) {
			console.error(err);
			showToast('Erro de conexão ao enviar e-mail', 'error');
		} finally {
			sendingEmail = false;
		}
	}

	function handleCloseModal() {
		showSavedModal = false;
		// Se for um novo estágio, ao fechar (mesmo sem enviar), redireciona para a edição para carregar o ID correto na URL
		if (pageData.mode === 'new' && lastSavedId) {
			window.location.href = `/gotce/v2?id=${lastSavedId}`;
		}
	}

	async function confirmStatusChange() {
		const previousStatus = internshipStatus;
		internshipStatus = pendingStatus;
		showStatusModal = false;

		if (pageData.mode === 'edit' && pageData.internship?.id) {
			try {
				// Envia apenas o status, mantendo os outros dados no banco intactos (PATCH/PUT parcial)
				const response = await apiFetch(`/internships/${pageData.internship.id}`, {
					method: 'PUT',
					body: JSON.stringify({ status: pendingStatus })
				});

				if (response.ok) {
					showToast('Status aplicado imediatamente com sucesso!');
					pageData.internship.status = pendingStatus;
				} else {
					const err = await response.json();
					showToast('Erro ao aplicar status: ' + (err.error || 'Erro desconhecido'), 'error');
					internshipStatus = previousStatus; // Reverte se falhou
				}
			} catch (err) {
				console.error(err);
				showToast('Erro de conexão ao alterar status', 'error');
				internshipStatus = previousStatus;
			}
		} else {
			// Se o termo nem sequer foi criado no banco ainda, ele só vai segurar a alteração
			markAsModified();
		}
	}

</script>

<Modal bind:show={showSavedModal}>
	<div class="p-6">
		<div class="mb-6 flex flex-col items-center text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
				✅
			</div>
			<h3 class="text-xl font-black text-slate-800">Termo Salvo com Sucesso!</h3>
			<p class="mt-2 text-slate-600">
				Deseja enviar um e-mail agora para o professor orientador solicitando a conferência do documento?
			</p>
		</div>

		<div class="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-200">
			<div class="flex flex-col gap-1">
				<span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Professor Responsável</span>
				<span class="font-bold text-slate-700">{formValues['nome_professor'] || formValues['NomeProfessor'] || 'Não informado'}</span>
				<span class="text-sm text-indigo-600">{formValues['email_professor'] || formValues['EmailProfessor'] || 'E-mail não informado'}</span>
			</div>
		</div>

		<div class="flex flex-col gap-3">
			<button
				onclick={handleNotifyProfessor}
				disabled={sendingEmail}
				class="btn-action w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
			>
				{#if sendingEmail}
					<span class="mr-2 animate-spin">🌀</span> Enviando...
				{:else}
					📧 Enviar e-mail ao professor para conferência
				{/if}
			</button>

			<button
				onclick={handleCloseModal}
				disabled={sendingEmail}
				class="btn-action w-full border-2 border-slate-200 bg-transparent! text-slate-600! hover:bg-slate-50 disabled:opacity-50"
			>
				❌ Não enviar, prefiro eu mesmo mandar o e-mail
			</button>
		</div>
	</div>
</Modal>

<Modal bind:show={showStatusModal}>
	<div class="p-6">
		<div class="mb-4 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
				⚠️
			</div>
			<h3 class="text-xl font-black text-slate-800">Confirmar Alteração de Status</h3>
			<p class="mt-2 text-slate-600">
				Você confirma a alteração do status para<br>
				<strong class="text-indigo-600">
					{pendingStatus === 'DRAFT' ? 'Editando' : 
					 pendingStatus === 'WAITING_APPROVAL' ? 'Aguardando Aprovação' : 
					 pendingStatus === 'APPROVED' ? 'Aprovado' : 
					 pendingStatus === 'STARTED' ? 'Estagiando' : pendingStatus}
				</strong>?<br>
			</p>
			
			{#if pendingStatus === 'APPROVED'}
				<div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm">
					<p class="text-sm font-bold text-emerald-800">
						✅ Quase lá!
					</p>
					<p class="mt-1 text-xs text-emerald-700">
						Caso confirme, não esqueça de avisar a empresa para imprimir em 3 vias e colher as assinaturas.
					</p>
				</div>
			{/if}
		</div>

		<div class="mt-6 flex gap-3">
			<button
				onclick={() => { showStatusModal = false; pendingStatus = ''; }}
				class="btn-action flex-1 border-2 border-slate-200 bg-transparent! text-slate-600! hover:bg-slate-50 focus:ring-0"
			>
				Cancelar
			</button>
			<button
				onclick={confirmStatusChange}
				class="btn-action flex-1 bg-amber-500 hover:bg-amber-600"
			>
				Confirmar
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
																bind:value={formValues[inputId]}
																required={col.required !== false}
																onchange={markAsModified}
																onkeydown={col.nRows ? (e) => handleTextareaKeydown(e, col.nRows) : undefined}
																oninput={col.nRows ? (e) => handleTextareaInput(e, col.nRows) : undefined}
															></textarea>
														{:else if inputType === 'select'}
															<select
																id={inputId}
																class="col-input"
																bind:value={formValues[inputId]}
																required={col.required !== false}
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
																required={col.required !== false}
															/>
														{:else if inputType === 'cep'}
															<input
																id={inputId}
																type="text"
																class="col-input"
																bind:value={formValues[inputId]}
																required={col.required !== false}
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
																	bind:value={formValues[inputId]}
																	required={col.required !== false}
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
					{#if isAuthority && pageData.mode === 'edit' && uiState.statusButtons.length > 0}
						<div class="flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
							<span class="text-xs font-black text-indigo-900 uppercase tracking-wider">Mudar Status do Termo (Uso da Instituição)</span>
							<div class="flex w-full flex-wrap justify-center gap-2">
								{#each uiState.statusButtons as st}
									<button
										type="button"
										disabled={internshipStatus === st}
										onclick={() => { pendingStatus = st; showStatusModal = true; }}
										class="rounded-lg px-3 py-1.5 text-xs font-bold transition-all {internshipStatus === st ? 'bg-indigo-600 text-white shadow-md scale-105 cursor-default opacity-90' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:scale-105'}"
									>
										{st === 'DRAFT' ? 'Mudar para Editando' : st === 'WAITING_APPROVAL' ? 'Aguardando Aprovação' : st === 'APPROVED' ? 'Aprovar' : 'Estagiando'}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if uiState.line1}
						<div class="flex w-full max-w-2xl flex-col items-center text-center gap-1 py-4 border-t border-b border-gray-100">
							<p class="text-lg font-bold text-slate-800">{uiState.line1}</p>
							<p class="text-sm text-slate-500">{uiState.line2}</p>
						</div>
					{/if}

					<div class="flex w-full max-w-2xl gap-4 flex-col sm:flex-row">
						{#if uiState.showSave}
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
									💾 {pageData.mode === 'edit' ? 'Atualizar' : 'Salvar'} Estágio
								{/if}
							</button>
						{/if}

						{#if uiState.showPdf}
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

						<!-- 
						<button
							type="button"
                            onclick={() => handleSubmit('docx')}
							disabled={submitting}
							class="btn-submit flex-1"
							style="background-color: #2b579a"
						>
							{#if submitting}
								<span class="mr-2 animate-spin">🌀</span> Processando...
							{:else}
								📘 Gerar Word
							{/if}
						</button>
						-->
					</div>

					{#if successLink || successLinkDocx}
						<div
							class="w-full max-w-md rounded-2xl border-2 border-blue-500 bg-white p-6 text-center shadow-xl gap-4 flex flex-col"
							in:fade
						>
							<p class="mb-4 font-bold text-blue-700">✨ Documento pronto!</p>
							<div class="flex flex-col sm:flex-row justify-center gap-3">
                                {#if successLink}
								<a
									href={successLink}
									download={`1501-${formValues['nome_aluno'] || formValues['NomeAluno'] || 'documento'}.pdf`}
									class="btn-action bg-red-600 hover:bg-red-700 w-full"
                                >
                                    📥 Baixar PDF
                                </a>
                                {/if}
                                <!-- 
                                {#if successLinkDocx}
								<a
									href={successLinkDocx}
									download={`1501-${formValues['nome_aluno'] || formValues['NomeAluno'] || 'documento'}.docx`}
									class="btn-action bg-blue-600 hover:bg-blue-700 w-full"
                                >
                                    📥 Baixar Word
                                </a>
                                {/if}
                                -->
							</div>
						</div>
					{/if}
				</div>
			</form>
		</div>
	</div>

	{#if toastMessage}
		<div
			class="fixed right-4 bottom-4 z-50 rounded-lg px-6 py-3 text-white shadow-lg transition-all"
			style="background-color: {toastType === 'success' ? '#10B981' : toastType === 'warning' ? '#f59e0b' : '#EF4444'};"
			in:fade
		>
			<p class="font-bold">{toastMessage}</p>
		</div>
	{/if}


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
		text-transform: uppercase;
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
