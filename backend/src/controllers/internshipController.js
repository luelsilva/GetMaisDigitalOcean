const { db } = require('../db');
const { internships, profiles } = require('../db/schema');
const { eq, desc, asc, or, ilike, sql, and, isNull } = require('drizzle-orm');
const emailService = require('../services/emailService');
const config = require('../config');

// Listar todos os estágios com suporte a busca e paginação
exports.getAllInternships = async (req, res, next) => {
    try {
        const { page, limit, search, teacher, status, studentName } = req.query;

        const queryFields = {
            id: internships.id,
            userId: internships.userId,
            companyId: internships.companyId,
            studentRegistration: internships.studentRegistration,
            studentName: internships.studentName,
            courseSigla: internships.courseSigla,
            companyName: internships.companyName,
            startDate: internships.startDate,
            endDate: internships.endDate,
            jsonData: internships.jsonData,
            createdAt: internships.createdAt,
            updatedAt: internships.updatedAt,
            lastModifiedBy: internships.lastModifiedBy,
            status: internships.status,
        };

        let query = db.select(queryFields).from(internships);

        const baseFilter = isNull(internships.deletedAt);
        let whereClause = baseFilter;

        // Filtro por Professor (dentro do JSON)
        if (teacher) {
            whereClause = and(
                whereClause,
                sql`${internships.jsonData}->>'nome_professor' = ${teacher}`
            );
        }

        // Filtro por Status
        if (status) {
            whereClause = and(
                whereClause,
                eq(internships.status, status)
            );
        }

        // NOVO: Filtro específico por Nome do Aluno
        if (studentName) {
            whereClause = and(
                whereClause,
                ilike(internships.studentName, `%${studentName}%`)
            );
        }

        // Se houver busca geral (Omnibox)
        if (search) {
            const searchTerm = `%${search}%`;
            whereClause = and(
                whereClause, // Usa as condições anteriores (inclusive o teacher se houver)
                or(
                    ilike(internships.studentName, searchTerm),
                    ilike(internships.companyName, searchTerm),
                    sql`${internships.studentRegistration}::text ILIKE ${searchTerm}`
                )
            );
        }

        // Se for company, filtrar apenas os registros vinculados (como dono ou campo companyId)
        if (req.user.roles === 'company') {
            whereClause = and(
                whereClause,
                or(
                    eq(internships.userId, req.user.id),
                    eq(internships.companyId, req.user.id)
                )
            );
        }

        query = query.where(whereClause);

        // Ordenação estrita por nome (ignora maiúsculas/minúsculas e espaços em branco)
        query = query.orderBy(asc(sql`lower(trim(${internships.studentName}))`));

        // Paginação
        if (page && limit) {
            const offset = (parseInt(page) - 1) * parseInt(limit);
            query = query.limit(parseInt(limit)).offset(offset);

            // Quando paginado, geralmente retornamos o total também
            const allInternships = await query;
            const [{ count }] = await db.select({ count: sql`count(*)` })
                .from(internships)
                .where(whereClause);

            return res.json({
                data: allInternships,
                total: parseInt(count),
                page: parseInt(page),
                limit: parseInt(limit)
            });
        }

        const allInternships = await query;
        res.json(allInternships);
    } catch (error) {
        next(error);
    }
};

// Obter estágio por ID
exports.getInternshipById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const whereConditions = [eq(internships.id, id), isNull(internships.deletedAt)];

        // Acesso liberado por ID para empresas autenticadas (Link mágico/UUID)
        // A segurança é baseada na posse do link único
        /*
        if (req.user.roles === 'company') {
            whereConditions.push(
               eq(internships.userId, req.user.id)
            );
        }
        */

        const queryFields = {
            id: internships.id,
            userId: internships.userId,
            companyId: internships.companyId,
            studentRegistration: internships.studentRegistration,
            studentName: internships.studentName,
            courseSigla: internships.courseSigla,
            companyName: internships.companyName,
            startDate: internships.startDate,
            endDate: internships.endDate,
            jsonData: internships.jsonData,
            createdAt: internships.createdAt,
            updatedAt: internships.updatedAt,
            lastModifiedBy: internships.lastModifiedBy,
            status: internships.status,
        };

        const result = await db.select(queryFields)
            .from(internships)
            .where(and(...whereConditions));

        if (result.length === 0) {
            return res.status(404).json({ error: 'Estágio não encontrado' });
        }

        res.json(result[0]);
    } catch (error) {
        next(error);
    }
};

// Criar novo estágio
exports.createInternship = async (req, res, next) => {
    try {
        const {
            studentRegistration,
            studentName,
            courseSigla,
            companyName,
            startDate,
            endDate,
            jsonData,
            status
        } = req.body;

        if (!studentName) return res.status(400).json({ error: 'Nome do aluno é obrigatório' });
        if (!courseSigla) return res.status(400).json({ error: 'Sigla do curso é obrigatória' });

        const [newInternship] = await db.insert(internships).values({
            userId: req.user.id,
            companyId: req.user.roles === 'company' ? req.user.id : null,
            studentRegistration: studentRegistration || null,
            studentName: studentName?.trim(),
            courseSigla: courseSigla?.trim(),
            companyName: companyName?.trim(),
            startDate: startDate || null,
            endDate: endDate || null,
            jsonData,
            status: status || 'DRAFT',
            lastModifiedBy: req.user.id
        }).returning();

        res.status(201).json(newInternship);
    } catch (error) {
        next(error);
    }
};

// Atualizar estágio
exports.updateInternship = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            studentRegistration,
            studentName,
            courseSigla,
            companyName,
            startDate,
            endDate,
            jsonData,
            status
        } = req.body;


        const updateSet = {};
        
        // Função de limpeza profunda: remove espaços e converte vazios em NULL real
        const clean = (val) => {
            if (val === undefined || val === null) return null;
            if (typeof val === 'string') {
                const trimmed = val.trim();
                return trimmed === '' ? null : trimmed;
            }
            return val;
        };


        if (studentRegistration !== undefined) {
            const val = clean(studentRegistration);
            // Se for nulo ou não for um número válido, enviamos NULL real
            updateSet.studentRegistration = (val === null || isNaN(Number(val))) ? null : Number(val);
        }
        
        if (studentName !== undefined) {
            const val = clean(studentName);
            if (val) updateSet.studentName = val;
        }
        
        if (courseSigla !== undefined) {
            const val = clean(courseSigla);
            if (val) updateSet.courseSigla = val;
        }
        
        if (companyName !== undefined) updateSet.companyName = clean(companyName);
        if (startDate !== undefined) updateSet.startDate = clean(startDate);
        if (endDate !== undefined) updateSet.endDate = clean(endDate);
        if (jsonData !== undefined) updateSet.jsonData = jsonData;

        // BUSCAR DADOS ATUAIS PARA PERMISSÕES E LOG DE STATUS (Fora do if (status) para evitar ReferenceError)
        const [currentInternship] = await db.select()
            .from(internships)
            .where(eq(internships.id, id));

        if (!currentInternship) {
            return res.status(404).json({ error: 'Estágio não encontrado' });
        }

        const oldStatus = currentInternship.status;
        const userRole = req.user.roles;
        const isOwner = String(currentInternship.userId) === String(req.user.id);
        const isAuthority = ['teacher', 'admin', 'sudo'].includes(userRole);

        if (status !== undefined) {
            const newStatus = clean(status) || 'DRAFT';
            
            // BLOQUEIO DE EDIÇÃO DE DADOS:
            // Se não for autoridade e o estágio não estiver em edição (DRAFT/REVISION_REQUESTED),
            // permitir APENAS a mudança de status (ex: cancelar submissão voltando para DRAFT)
            // mas NÃO a mudança de dados do formulário (jsonData, etc)
            const isEditableState = ['DRAFT', 'REVISION_REQUESTED'].includes(oldStatus);
            
            if (!isAuthority && !isEditableState) {
                // Se tentou mudar qualquer campo que não seja 'status'
                const fieldsBeingUpdated = Object.keys(updateSet).filter(k => k !== 'status' && k !== 'updatedAt' && k !== 'lastModifiedBy');
                if (fieldsBeingUpdated.length > 0) {
                    return res.status(403).json({ 
                        error: `O estágio está no status ${oldStatus} e não pode mais ser editado. Volte para DRAFT para fazer alterações.` 
                    });
                }
            }

            // Se o status não mudou, ok
            if (newStatus !== oldStatus) {
                // REGRAS DE TRANSIÇÃO:
                let allowed = false;

                // 1. Autoridades podem fazer qualquer transição (por agora)
                if (isAuthority) {
                    allowed = true;
                } 
                // 2. Aluno/Empresa (Dono ou Empresa colaborando no preenchimento)
                else if (isOwner || (userRole === 'company' && isEditableState)) {
                    if ((oldStatus === 'DRAFT' || oldStatus === 'REVISION_REQUESTED') && newStatus === 'WAITING_APPROVAL') {
                        allowed = true;
                    }
                    // Permitir voltar para DRAFT se ainda não foi aprovado? 
                    // Geralmente sim, se quiser editar algo antes do professor ver.
                    if (oldStatus === 'WAITING_APPROVAL' && newStatus === 'DRAFT') {
                        allowed = true;
                    }
                }

                if (!allowed) {
                    return res.status(403).json({ 
                        error: `Você não tem permissão para mudar o status de ${oldStatus} para ${newStatus}.` 
                    });
                }

                updateSet.status = newStatus;
            }
        }
        
        if (req.user.roles === 'company') {
            updateSet.companyId = req.user.id;
        }

        updateSet.updatedAt = new Date();
        updateSet.lastModifiedBy = req.user.id;

        const whereConditions = [eq(internships.id, id), isNull(internships.deletedAt)];

        // O Select inicial já foi feito para validação de status, mas mantemos o filtro de deletedAt aqui no update final por segurança
        const [updatedInternship] = await db.update(internships)
            .set(updateSet)
            .where(and(...whereConditions))
            .returning();

        if (!updatedInternship) {
            return res.status(404).json({ error: 'Estágio não encontrado ou não atualizado' });
        }

        // DISPARO DE E-MAILS (Gatilho: Submissão para Aprovação)
        if (updateSet.status === 'WAITING_APPROVAL' && oldStatus !== 'WAITING_APPROVAL') {
            const studentName = updatedInternship.studentName;
            const companyName = updatedInternship.companyName;
            const teacherName = updatedInternship.jsonData?.nome_professor || updatedInternship.jsonData?.NomeProfessor;
            const baseUrl = config.corsOrigin[0] || 'http://localhost:5173';
            const link = `${baseUrl}/gotce?id=${id}`;

            // 1. Notificar a Empresa (Solicitante)
            const companyEmail = req.user.email;
            if (companyEmail) {
                emailService.sendTCEWaitingApprovalToCompany(companyEmail, studentName, teacherName, link)
                    .catch(err => console.error('[EMAIL ERROR] Falha ao notificar empresa:', err));
            }

            // 2. Notificar o Professor (Orientador)
            if (teacherName) {
                // Tenta pegar o e-mail do professor diretamente do formulário (mais robusto)
                const formTeacherEmail = updatedInternship.jsonData?.email_professor || updatedInternship.jsonData?.EmailProfessor;

                // E-mail da empresa (caso não esteja no req.user, pode buscar no form também)
                const finalCompanyEmail = companyEmail || updatedInternship.jsonData?.email_concedente;

                if (formTeacherEmail && formTeacherEmail.includes('@')) {
                    emailService.sendTCEWaitingApprovalToTeacher(formTeacherEmail, studentName, companyName, link, finalCompanyEmail)
                        .catch(err => console.error('[EMAIL ERROR] Falha ao notificar professor (pelo e-mail do form):', err));
                } else {
                    // Fallback: busca no banco pelo nome completo se não houver e-mail no formulário
                    db.select({ email: profiles.email })
                        .from(profiles)
                        .where(eq(profiles.fullName, teacherName))
                        .limit(1)
                        .then(([prof]) => {
                            if (prof && prof.email) {
                                emailService.sendTCEWaitingApprovalToTeacher(prof.email, studentName, companyName, link, finalCompanyEmail)
                                    .catch(err => console.error('[EMAIL ERROR] Falha ao notificar professor (pelo banco):', err));
                            } else {
                                console.warn(`[EMAIL WARNING] E-mail do professor ${teacherName} não encontrado no form nem no banco.`);
                            }
                        })
                        .catch(err => console.error('[DB ERROR] Falha ao buscar e-mail do professor no banco:', err));
                }
            }
        }

        res.json(updatedInternship);
    } catch (error) {
        next(error);
    }
};

// Deletar estágio
exports.deleteInternship = async (req, res, next) => {
    try {
        const { id } = req.params;
        const whereConditions = [eq(internships.id, id), isNull(internships.deletedAt)];

        // Se for company, só pode deletar se for vinculado a ele
        if (req.user.roles === 'company') {
            whereConditions.push(
                or(
                    eq(internships.userId, req.user.id),
                    eq(internships.companyId, req.user.id)
                )
            );
        }

        const [deletedInternship] = await db.update(internships)
            .set({ deletedAt: new Date(), updatedAt: new Date(), lastModifiedBy: req.user.id })
            .where(and(...whereConditions))
            .returning();

        if (!deletedInternship) {
            return res.status(404).json({ error: 'Estágio não encontrado ou já deletado' });
        }

		res.status(204).send();
	} catch (error) {
		next(error);
	}
};

// Notificar Professor para Conferência (Manual)
exports.notifyTeacherConference = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { teacherName, teacherEmail } = req.body;

        const [internship] = await db.select()
            .from(internships)
            .where(eq(internships.id, id));

        if (!internship) {
            return res.status(404).json({ error: 'Estágio não encontrado' });
        }

        const studentName = internship.studentName;
        const companyName = internship.companyName;
        const name = teacherName || internship.jsonData?.nome_professor || internship.jsonData?.NomeProfessor;
        const email = teacherEmail || internship.jsonData?.email_professor || internship.jsonData?.EmailProfessor;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'E-mail do professor não encontrado ou inválido' });
        }

        const baseUrl = config.corsOrigin[0] || 'http://localhost:5173';
        const link = `${baseUrl}/gotce?id=${id}`;

        const companyEmail = (req.user && req.user.email) ? req.user.email : internship.jsonData?.email_concedente;

        // 1. Notificar Professor (Orientador)
        await emailService.sendTCEWaitingApprovalToTeacher(email, studentName, companyName, link, companyEmail);

        // 3. ATUALIZAR STATUS DO ESTÁGIO (Novo Requisito: Só muda status se e-mail for enviado)
        // Isso oficializa a submissão para o professor
        const [updatedInternship] = await db.update(internships)
            .set({ 
                status: 'WAITING_APPROVAL', 
                updatedAt: new Date(),
                lastModifiedBy: req.user.id 
            })
            .where(eq(internships.id, id))
            .returning();

        // 2. Notificar a Empresa / Solicitante (Comprovante de Envio)
        if (req.user && req.user.email) {
            await emailService.sendTCEWaitingApprovalToCompany(req.user.email, studentName, name, link)
                .catch(err => console.error('[EMAIL ERROR] Falha ao notificar empresa (comprovante):', err));
        }

        res.json({ 
            message: 'E-mail enviado com sucesso ao professor e status atualizado para Aguardando Aprovação',
            internship: updatedInternship 
        });
    } catch (error) {
        console.error('[NOTIFY ERROR]', error);
        res.status(500).json({ error: 'Falha ao enviar e-mail' });
    }
};



