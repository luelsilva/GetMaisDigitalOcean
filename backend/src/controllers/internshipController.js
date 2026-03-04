const { db } = require('../db');
const { internships, profiles } = require('../db/schema');
const { eq, desc, asc, or, ilike, sql, and, isNull } = require('drizzle-orm');

// Listar todos os estágios com suporte a busca e paginação
exports.getAllInternships = async (req, res, next) => {
    try {
        const { page, limit, search } = req.query;

        const queryFields = {
            id: internships.id,
            userId: internships.userId,
            studentRegistration: internships.studentRegistration,
            studentName: internships.studentName,
            courseSigla: internships.courseSigla,
            companyName: internships.companyName,
            companyCnpj: internships.companyCnpj,
            startDate: internships.startDate,
            endDate: internships.endDate,
            jsonData: internships.jsonData,
            createdAt: internships.createdAt,
            updatedAt: internships.updatedAt,
            lastModifiedBy: internships.lastModifiedBy,
        };

        let query = db.select(queryFields).from(internships);

        const baseFilter = isNull(internships.deletedAt);
        let whereClause = baseFilter;

        // Se houver busca
        if (search) {
            const searchTerm = `%${search}%`;
            whereClause = and(
                baseFilter,
                or(
                    ilike(internships.studentName, searchTerm),
                    ilike(internships.companyName, searchTerm),
                    ilike(internships.companyCnpj, searchTerm),
                    sql`${internships.studentRegistration}::text ILIKE ${searchTerm}`
                )
            );
        }

        // Se for company, filtrar apenas os registros que ele é DONO
        if (req.user.roles === 'company') {
            whereClause = and(
                whereClause,
                eq(internships.userId, req.user.id)
            );
        }

        query = query.where(whereClause);

        query = query.orderBy(asc(internships.studentName), desc(internships.createdAt));

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
            studentRegistration: internships.studentRegistration,
            studentName: internships.studentName,
            courseSigla: internships.courseSigla,
            companyName: internships.companyName,
            companyCnpj: internships.companyCnpj,
            startDate: internships.startDate,
            endDate: internships.endDate,
            jsonData: internships.jsonData,
            createdAt: internships.createdAt,
            updatedAt: internships.updatedAt,
            lastModifiedBy: internships.lastModifiedBy,
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
            companyCnpj,
            startDate,
            endDate,
            jsonData
        } = req.body;

        // Validações básicas
        if (!studentName) return res.status(400).json({ error: 'Nome do aluno é obrigatório' });
        if (!courseSigla) return res.status(400).json({ error: 'Sigla do curso é obrigatória' });
        if (!companyName) return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
        if (!companyCnpj) return res.status(400).json({ error: 'CNPJ da empresa é obrigatório' });

        const [newInternship] = await db.insert(internships).values({
            userId: req.user.id, // Salva o ID do usuário que criou (responsável)
            studentRegistration,
            studentName,
            courseSigla,
            companyName,
            companyCnpj,
            startDate: startDate || null,
            endDate: endDate || null,
            jsonData,
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
            companyCnpj,
            startDate,
            endDate,
            jsonData
        } = req.body;

        const updateSet = {
            studentRegistration,
            studentName,
            courseSigla,
            companyName,
            companyCnpj,
            startDate: startDate || null,
            endDate: endDate || null,
            jsonData,
            updatedAt: new Date(),
            lastModifiedBy: req.user.id
        };
        const whereConditions = [eq(internships.id, id), isNull(internships.deletedAt)];

        const [internship] = await db.select()
            .from(internships)
            .where(and(...whereConditions));

        if (!internship) {
            return res.status(404).json({ error: 'Estágio não encontrado' });
        }

        // Se for company e não for o dono, verifica se tem permissão (já que removemos compartilhamento, só dono pode editar via API, mas na prática podemos liberar edição por pose do ID se desejado)
        // Por enquanto, vou manter a restrição de que apenas o dono ou admin pode editar, ou liberar se for company (assumindo posse do link)
        /*
        if (req.user.roles === 'company' && internship.userId !== req.user.id) {
             return res.status(403).json({ error: 'Você não tem permissão para editar este estágio' });
        }
        */
        // Liberamos edição para company que tem o ID (Link Mágico), similar ao GET

        const [updatedInternship] = await db.update(internships)
            .set(updateSet)
            .where(eq(internships.id, id))
            .returning();

        if (!updatedInternship) {
            return res.status(404).json({ error: 'Estágio não encontrado' });
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

        // Se for company, só pode deletar o dele
        if (req.user.roles === 'company') {
            whereConditions.push(eq(internships.userId, req.user.id));
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

// Obter ID do estágio por detalhes (público)
exports.getInternshipIdByDetails = async (req, res, next) => {
    try {
        const { registration, cnpj } = req.query;

        if (!registration || !cnpj) {
            return res.status(400).json({ error: 'Parâmetros registration e cnpj são obrigatórios' });
        }

        const result = await db.select({ id: internships.id })
            .from(internships)
            .where(and(
                eq(internships.studentRegistration, Number(registration)),
                eq(internships.companyCnpj, cnpj),
                isNull(internships.deletedAt)
            ))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Estágio não encontrado com os dados fornecidos' });
        }

        res.json({ id: result[0].id });
    } catch (error) {
        next(error);
    }
};
