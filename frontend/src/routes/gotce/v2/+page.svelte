<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api';
	import { fade } from 'svelte/transition';
	import Modal from '$lib/components/Modal.svelte';
	import InternshipHistory from '$lib/components/InternshipHistory.svelte';
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
		const isProf = ['teacher', 'admin', 'sudo'].includes(user_role);

		let config = {
			message: '',
			canSave: false,
			canPDF: false,
			canSubmitForApproval: false,
			canApprove: false,
			canReject: false,
			canStart: false,
			canFinish: false,
			readonly: true,
			saveLabel: mode === 'new' ? 'Salvar Estágio' : 'Atualizar Estágio'
		};

		if (mode === 'new') {
			config.canSave = true;
			config.readonly = false;
			config.message = `
				<p class="text-lg font-bold text-slate-800">Este TCE encontra-se em criação.</p>
				<p class="text-lg font-bold text-slate-800">Preencha os dados solicitados e clique em Salvar Estágio.</p>
			`;
			return config;
		}

		// --- MODO EDIÇÃO ---

		if (internship_status === 'DRAFT_BY_TEACHER') {
			config.canPDF = true;
			if (isProf) {
				config.canSave = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">Professor, o TCE está em modo de edição.</p>
					<p class="text-lg font-bold text-slate-800">Copie o link da barra de endereços e envie-o à empresa para preenchimento.</p>
				`;
			} else {
				config.canSave = true;
				config.canSubmitForApproval = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">O TCE encontra-se em edição.</p>
					<p class="text-lg font-bold text-slate-800">Preencha os dados solicitados e clique em Atualizar Estágio.</p>
					<p class="text-lg font-bold text-slate-800">Depois, clique em Enviar para o professor avaliar.</p>
				`;
			}
		} else if (internship_status === 'DRAFT') {
			config.canPDF = true;
			if (isProf) {
				config.canSave = true;
				config.canStart = true;
				config.canFinish = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">Professor, este TCE está sendo editado pela empresa e posterior envio para avaliação.</p>
					<p class="text-lg font-bold text-slate-800">Caso esteja fora do prazo, por favor, verifique a situação e adote as providências pertinentes.</p>
					<p class="text-lg font-bold text-slate-800">Se necessário, altere o status do TCE para Iniciado ou Finalizado.</p>
				`;
			} else {
				config.canSave = true;
				config.canSubmitForApproval = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">O TCE encontra-se em edição.</p>
					<p class="text-lg font-bold text-slate-800">Preencha os dados solicitados e clique em Atualizar Estágio.<p>
					<p class="text-lg font-bold text-slate-800">Depois, clique em Enviar para o professor avaliar.</p>
				`;
			}
		} else if (internship_status === 'WAITING_APPROVAL') {
			if (isProf) {
				config.canSave = true;
				config.canPDF = true;
				config.canApprove = true;
				config.canReject = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">Professor, o TCE aguarda sua aprovação.</p>
					<p class="text-lg font-bold text-slate-800">Revise as informações e clique em Aprovar Estágio ou Devolver.</p>
				`;
			} else {
				config.message = `
					<p class="text-lg font-bold text-slate-800">O TCE foi enviado para aprovação do professor.</p>
					<p class="text-lg font-bold text-slate-800">Aguarde a avaliação.</p>
				`;
			}
		} else if (internship_status === 'REVISION_REQUESTED') {
			config.canPDF = true;
			if (isProf) {
				config.canSave = true;
				config.canStart = true;
				config.canFinish = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">Foi solicitada revisão deste TCE. Aguarde o reenvio pela empresa após as correções.</p>
					<p class="text-lg font-bold text-slate-800">Caso esteja fora do prazo, por favor, verifique a situação e adote as providências pertinentes.</p>
					<p class="text-lg font-bold text-slate-800">Se necessário, altere o status do TCE para Iniciado ou Finalizado.</p>
				`;
			} else {
				config.canSave = true;
				config.canSubmitForApproval = true;
				config.readonly = false;
				config.message = `
					<p class="text-lg font-bold text-slate-800">O TCE foi devolvido para correção.</p>
					<p class="text-lg font-bold text-slate-800">Realize os ajustes solicitados e clique em Atualizar Estágio e envie para o professor avaliar.</p>
				`;
			}
		} else if (internship_status === 'APPROVED') {
			config.canPDF = true;
			if (isProf) {
				config.canStart = true;
				config.canFinish = true;
				config.readonly = true;
				config.message = `
					<p class="text-lg font-bold text-slate-800">O TCE foi aprovado com sucesso. O estágio pode ser iniciado conforme o cronograma.</p>
					<p class="text-lg font-bold text-slate-800">Se necessário, altere o status do TCE para Iniciado ou Finalizado.</p>
				`;
			} else {
				config.message = `
					<p class="text-lg font-bold text-slate-800">O TCE foi aprovado.</p>
					<p class="text-lg font-bold text-slate-800">Agora é possível gerar o documento oficial do estágio.</p>
				`;
			}
		} else if (internship_status === 'STARTED') {
			config.canPDF = true;
			if (isProf) {
				config.canFinish = true;
				config.readonly = true;
				config.message = `
					<p class="text-lg font-bold text-slate-800">O estágio foi iniciado. Acompanhe as atividades conforme previsto.</p>
					<p class="text-lg font-bold text-slate-800">Se necessário, altere o status do TCE para Finalizado.</p>
				`;
			} else {
				config.message = `
					<p class="text-lg font-bold text-slate-800">O estágio encontra-se em andamento.</p>
				`;
			}
		} else if (internship_status === 'FINISHED') {
			config.canPDF = true;
			config.message = `
				<p class="text-lg font-bold text-slate-800">O estágio foi ${isProf ? 'concluído com sucesso' : 'finalizado'}.</p>
			`;
		} else if (internship_status === 'ARCHIVED') {
			config.canPDF = true;
			config.message = `
				<p class="text-lg font-bold text-slate-800">Este TCE foi arquivado${isProf ? ' para registro institucional' : ' e não pode mais ser editado'}.</p>
			`;
		}

		return config;
	});
	let formValues = $state<Record<string, any>>({});
	let submitting = $state(false);
	let successLink = $state('');

	let saving = $state(false);
	let formModified = $state(false);

	let showSaveResultModal = $state(false);
	let showValidationModal = $state(false);
	let missingFieldsList = $state<string[]>([]);
	let lastSavedId = $state('');
	let showRejectModal = $state(false);
	let rejectObservations = $state('');

	// Efeito para redirecionar para o modo edição após salvar um novo documento
	// Isso garante que o ID seja pego na URL seja em salvamento silencioso ou após fechar o modal
	$effect(() => {
		if (lastSavedId && !showSaveResultModal && pageData.mode === 'new') {
			window.location.href = `/gotce/v2?id=${lastSavedId}`;
		}
	});

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
							if (val === undefined || val === null || String(val).trim() === '') {
								missing.push(col.label);
							}
						}
					});
				});
			});
		}
		return missing;
	}

	async function handleSave(silent = false) {
		// Se nada foi modificado e é um salvamento automático, não precisa chamar a API
		if (silent && !formModified) return true;

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
		if (!formValues['nome_professor'] && !formValues['NomeProfessor']) {
			alert('Por favor, selecione o Professor antes de salvar.');
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
				status:
					pageData.mode === 'edit'
						? pageData.internship_status
						: ['teacher', 'admin', 'sudo'].includes(pageData.user_role)
							? 'DRAFT_BY_TEACHER'
							: 'DRAFT'
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

				if (!silent) {
					showSaveResultModal = true;
				}

				lastSavedId = savedData.id;
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

	async function handleSendForApproval() {
		// Verificar pendências antes de tudo
		const missing = checkMissingRequiredFields();
		if (missing.length > 0) {
			missingFieldsList = missing;
			showValidationModal = true;
			return;
		}

		await executeSubmission();
	}

	async function executeSubmission() {
		if (
			!confirm(
				'Deseja enviar este estágio para avaliação do professor? Após o envio, você não poderá editá-lo até que seja revisado.'
			)
		)
			return;

		showValidationModal = false;

		// Salva os dados atuais primeiro
		const saved = await handleSave(true);
		if (!saved) return;

		submitting = true;
		try {
			const response = await apiFetch(`/internships/${pageData.internship.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					...pageData.internship,
					jsonData: formValues,
					status: 'WAITING_APPROVAL'
				})
			});

			if (response.ok) {
				alert('Enviado para avaliação com sucesso!');
				window.location.reload();
			} else {
				const err = await response.json();
				alert('Erro ao enviar para avaliação: ' + (err.message || 'Erro desconhecido'));
			}
		} catch (err) {
			console.error(err);
			alert('Erro de conexão ao enviar para avaliação.');
		} finally {
			submitting = false;
		}
	}

	async function handleApprove() {
		if (!confirm('Deseja realmente APROVAR este estágio?')) return;

		submitting = true;
		try {
			const response = await apiFetch(`/internships/${pageData.internship.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					...pageData.internship,
					jsonData: formValues,
					status: 'APPROVED'
				})
			});

			if (response.ok) {
				// Envia email de aprovação para a empresa (endpoint já faz join com profiles e loga o email)
				const notifyRes = await apiFetch(
					`/internships/${pageData.internship.id}/notificar-aprovacao`,
					{
						method: 'POST'
					}
				);

				if (notifyRes.ok) {
					alert('Estágio aprovado com sucesso! Um e-mail foi enviado para a empresa.');
				} else {
					const notifyErr = await notifyRes.json();
					alert(
						'Estágio aprovado, mas houve um erro ao enviar o e-mail: ' +
							(notifyErr.error || 'Erro desconhecido')
					);
				}
				window.location.reload();
			} else {
				const err = await response.json();
				alert('Erro ao aprovar: ' + (err.message || 'Erro desconhecido'));
			}
		} catch (err) {
			console.error(err);
			alert('Erro de conexão ao aprovar.');
		} finally {
			submitting = false;
		}
	}

	function handleReject() {
		rejectObservations = '';
		showRejectModal = true;
	}

	async function executeReject() {
		showRejectModal = false;
		submitting = true;
		try {
			const response = await apiFetch(`/internships/${pageData.internship.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					...pageData.internship,
					jsonData: formValues,
					status: 'REVISION_REQUESTED'
				})
			});

			if (response.ok) {
				// Envia email de reprovação com as observações do professor
				const notifyRes = await apiFetch(
					`/internships/${pageData.internship.id}/notificar-reprovacao`,
					{
						method: 'POST',
						body: JSON.stringify({ observations: rejectObservations })
					}
				);

				if (notifyRes.ok) {
					alert('Estágio devolvido para revisão! Um e-mail foi enviado para a empresa.');
				} else {
					const notifyErr = await notifyRes.json();
					alert(
						'Estágio devolvido, mas houve um erro ao enviar o e-mail: ' +
							(notifyErr.error || 'Erro desconhecido')
					);
				}
				window.location.reload();
			} else {
				const err = await response.json();
				alert('Erro ao reprovar: ' + (err.message || 'Erro desconhecido'));
			}
		} catch (err) {
			console.error(err);
			alert('Erro de conexão ao reprovar.');
		} finally {
			submitting = false;
		}
	}

	async function handleStart() {
		if (!confirm('Deseja marcar este estágio como INICIADO?')) return;
		submitting = true;
		try {
			const response = await apiFetch(`/internships/${pageData.internship.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					status: 'STARTED'
				})
			});
			if (response.ok) {
				alert('Estágio iniciado com sucesso!');
				window.location.reload();
			} else {
				const err = await response.json();
				alert('Erro ao iniciar estágio: ' + (err.message || 'Erro desconhecido'));
			}
		} catch (err) {
			console.error(err);
			alert('Erro de conexão.');
		} finally {
			submitting = false;
		}
	}

	async function handleFinish() {
		if (!confirm('Deseja marcar este estágio como FINALIZADO?')) return;
		submitting = true;
		try {
			const response = await apiFetch(`/internships/${pageData.internship.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					status: 'FINISHED'
				})
			});
			if (response.ok) {
				alert('Estágio finalizado com sucesso!');
				window.location.reload();
			} else {
				const err = await response.json();
				alert('Erro ao finalizar estágio: ' + (err.message || 'Erro desconhecido'));
			}
		} catch (err) {
			console.error(err);
			alert('Erro de conexão.');
		} finally {
			submitting = false;
		}
	}

	function handleCloseModal() {
		showSaveResultModal = false;
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
			<button onclick={handleCloseModal} class="btn-action w-full bg-slate-700 hover:bg-slate-800">
				OK
			</button>
		</div>
	</div>
</Modal>

<!-- Modal de Validação de Pendências -->
<Modal bind:show={showValidationModal}>
	<div class="p-6" style="min-width: 340px; max-width: 480px;">
		<div class="mb-4 flex flex-col items-center text-center">
			<div
				class="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl"
			>
				⚠️
			</div>
			<h3 class="text-xl font-black text-slate-800">Campos Pendentes</h3>
			<p class="mt-2 text-sm text-slate-600">
				O documento possui pendências que precisam ser corrigidas antes do envio:
			</p>
		</div>

		<div class="mb-6 rounded-lg bg-slate-50 p-4">
			<ul class="space-y-2">
				{#each missingFieldsList.slice(0, 3) as field}
					<li class="flex items-center text-sm text-slate-700">
						<span class="mr-2 text-amber-500">•</span>
						{field}
					</li>
				{/each}
				{#if missingFieldsList.length > 3}
					<li class="pt-2 text-xs font-bold text-slate-500">
						... e mais {missingFieldsList.length - 3} pendência(s).
					</li>
				{/if}
			</ul>
		</div>

		<button
			onclick={() => (showValidationModal = false)}
			class="btn-action w-full bg-slate-700 hover:bg-slate-800"
		>
			Entendido, vou corrigir
		</button>

		<div class="mt-8 border-t border-slate-100 pt-6 text-center">
			<p class="mb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
				E-mail do Professor Orientador
			</p>
			<p class="text-sm font-medium text-slate-600">
				{formValues['email_professor'] || formValues['EmailProfessor'] || 'E-mail não informado'}
			</p>

			<button
				type="button"
				onclick={executeSubmission}
				class="btn-action mt-6 w-full bg-amber-600 text-white hover:bg-amber-700"
			>
				Desejo enviar mesmo com pendências
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
																disabled={pageConfig.readonly}
															></textarea>
														{:else if inputType === 'select'}
															<select
																id={inputId}
																class="col-input"
																required={col.required}
																bind:value={formValues[inputId]}
																onchange={markAsModified}
																disabled={pageConfig.readonly}
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
																disabled={pageConfig.readonly}
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
																	disabled={pageConfig.readonly}
																/>
																{#if inputType === 'date' && (inputId
																		.toLowerCase()
																		.includes('fim') || inputId.toLowerCase().includes('final'))}
																	<button
																		type="button"
																		onclick={() => suggestEndDate(inputId)}
																		disabled={pageConfig.readonly}
																		class="ml-1 text-xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-30"
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

				<div class="mt-8 flex w-full flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
					<div
						class="flex w-full flex-col items-center gap-1 rounded-xl border border-amber-100 bg-amber-50 p-4 text-center shadow-sm"
					>
						{@html pageConfig.message}
					</div>

					<div class="flex w-full flex-col gap-4 p-2 sm:flex-row">
						{#if pageConfig.canSave}
							<button
								type="button"
								onclick={() => handleSave()}
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

						{#if pageConfig.canSubmitForApproval && pageData.user_role === 'company'}
							<button
								type="button"
								onclick={handleSendForApproval}
								disabled={submitting || saving}
								class="btn-submit flex-1"
								style="background-color: #f59e0b"
							>
								{#if submitting}
									<span class="mr-2 animate-spin">🌀</span> Enviando...
								{:else}
									📤 Enviar para o professor avaliar
								{/if}
							</button>
						{/if}

						{#if pageConfig.canApprove}
							<button
								type="button"
								onclick={handleApprove}
								disabled={submitting || saving}
								class="btn-submit flex-1"
								style="background-color: #059669"
							>
								{#if submitting}
									<span class="mr-2 animate-spin">🌀</span> Processando...
								{:else}
									✅ Aprovar Estágio
								{/if}
							</button>
						{/if}

						{#if pageConfig.canReject}
							<button
								type="button"
								onclick={handleReject}
								disabled={submitting || saving}
								class="btn-submit flex-1"
								style="background-color: #dc2626"
							>
								{#if submitting}
									<span class="mr-2 animate-spin">🌀</span> Processando...
								{:else}
									❌ Devolver
								{/if}
							</button>
						{/if}

						{#if pageConfig.canStart}
							<button
								type="button"
								onclick={handleStart}
								disabled={submitting || saving}
								class="btn-submit flex-1"
								style="background-color: #2563eb"
							>
								{#if submitting}
									<span class="mr-2 animate-spin">🌀</span> Processando...
								{:else}
									🚀 Alterar status para Estagiando
								{/if}
							</button>
						{/if}

						{#if pageConfig.canFinish}
							<button
								type="button"
								onclick={handleFinish}
								disabled={submitting || saving}
								class="btn-submit flex-1"
								style="background-color: #059669"
							>
								{#if submitting}
									<span class="mr-2 animate-spin">🌀</span> Processando...
								{:else}
									🏁 Alterar status para Finalizado
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

            {#if pageData.internship && pageData.internship.id}
                <div class="w-full max-w-4xl mx-auto mt-8">
                    <InternshipHistory internshipId={pageData.internship.id} />
                </div>
            {/if}
		</div>
	</div>
{:else}
	<div class="flex min-h-[70vh] items-center justify-center">
		<p class="animate-pulse text-gray-500">Carregando formulário...</p>
	</div>
{/if}

<!-- Modal de Reprovação com Observações -->
<Modal
	bind:show={showRejectModal}
	onCancel={() => (showRejectModal = false)}
	onConfirm={executeReject}
>
	<div class="px-6 pt-8 pb-2 text-center">
		<div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
			<span class="text-3xl">❌</span>
		</div>
		<h3 class="text-xl font-black tracking-tight text-slate-800 uppercase">
			Devolver para Revisão
		</h3>
	</div>
	<div class="px-6 pb-2">
		<p class="mb-3 text-center text-base font-semibold text-slate-700">
			✏️ Professor, informe quais correções a empresa precisa fazer no TCE?
		</p>
		<textarea
			bind:value={rejectObservations}
			rows="5"
			placeholder="Ex: O CPF da empresa está incorreto. Verifique também as datas do estágio..."
			class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 transition outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
		></textarea>
		<p class="mt-2 text-xs text-slate-400">
			* As orientações serão enviadas por e-mail para a empresa junto com o aviso de devolução.
		</p>
	</div>
	<div class="flex flex-col gap-2 p-6 sm:flex-row">
		<button
			type="button"
			onclick={() => (showRejectModal = false)}
			class="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 active:scale-95"
		>
			Cancelar
		</button>
		<button
			type="button"
			onclick={executeReject}
			disabled={!rejectObservations.trim()}
			class="flex-[1.5] rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-600 disabled:active:scale-100"
		>
			Confirmar Devolução
		</button>
	</div>
</Modal>

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
