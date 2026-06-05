const { db } = require('../db');
const { alunos, observacoesAlunos, courses, situacaoAluno } = require('../db/schema');
const { eq, desc } = require('drizzle-orm');

// Listar todos os alunos com sua sigla de curso e observações
exports.getAllAlunos = async (req, res, next) => {
    try {
        const allAlunos = await db.select({
            id: alunos.id,
            matricula: alunos.matricula,
            estudante: alunos.estudante,
            situacao: alunos.situacao,
            porcentagemDispensa: alunos.porcentagemDispensa,
            cpf: alunos.cpf,
            celularAluno: alunos.celularAluno,
            telefoneResidencial: alunos.telefoneResidencial,
            notaEstagio: alunos.notaEstagio,
            dataEntregaRelatorio: alunos.dataEntregaRelatorio,
            dataInicioEstagio: alunos.dataInicioEstagio,
            dataFimEstagio: alunos.dataFimEstagio,
            anoInicioCurso: alunos.anoInicioCurso,
            semestreInicioCurso: alunos.semestreInicioCurso,
            totalHorasEstagio: alunos.totalHorasEstagio,
            email: alunos.email,
            courseSigla: courses.sigla,
            matriz: alunos.matriz,
            turno: alunos.turno,
            modulo: alunos.modulo,
            turma: alunos.turma,
            turmaCodigo: alunos.turmaCodigo,
            periodo: alunos.periodo,
            sexo: alunos.sexo,
            dataNascimento: alunos.dataNascimento,
            identidade: alunos.identidade,
            celularResponsavel: alunos.celularResponsavel,
            nomeMae: alunos.nomeMae,
            endereco: alunos.endereco,
            complemento: alunos.complemento,
            bairro: alunos.bairro,
            cep: alunos.cep,
            municipio: alunos.municipio
        })
        .from(alunos)
        .leftJoin(courses, eq(alunos.cursoId, courses.id))
        .orderBy(alunos.estudante);

        // Se não houver alunos, retorne vazio
        if (allAlunos.length === 0) {
            return res.json([]);
        }

        // Buscar todas as observações
        const allObs = await db.select()
            .from(observacoesAlunos)
            .orderBy(desc(observacoesAlunos.dataAnotacao));

        // Vincular observações ao aluno correspondente
        const alunosWithObs = allAlunos.map(aluno => {
            const obs = allObs.filter(o => o.alunoId === aluno.id);
            return {
                ...aluno,
                situacao: aluno.situacao ? aluno.situacao.trim() : null,
                observacoes: obs
            };
        });

        res.json(alunosWithObs);
    } catch (error) {
        next(error);
    }
};

// Atualizar dados de estágio de um aluno
exports.updateAluno = async (req, res, next) => {
    try {
        const { id } = req.params;
        const fields = req.body;

        const allowedFields = [
            'porcentagemDispensa', 'notaEstagio', 'dataEntregaRelatorio',
            'dataInicioEstagio', 'dataFimEstagio', 'anoInicioCurso',
            'semestreInicioCurso', 'totalHorasEstagio', 'situacao'
        ];

        const updateData = {};
        allowedFields.forEach(f => {
            if (fields[f] !== undefined) {
                // Tratar conversões de tipos e nulos
                if (fields[f] === '' || fields[f] === null) {
                    updateData[f] = null;
                } else if (f === 'porcentagemDispensa' || f === 'anoInicioCurso' || f === 'totalHorasEstagio') {
                    updateData[f] = parseInt(fields[f], 10);
                } else {
                    updateData[f] = typeof fields[f] === 'string' ? fields[f].trim() : fields[f];
                }
            }
        });

        const [updatedAluno] = await db.update(alunos)
            .set(updateData)
            .where(eq(alunos.id, parseInt(id, 10)))
            .returning();

        if (!updatedAluno) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        res.json(updatedAluno);
    } catch (error) {
        next(error);
    }
};

// Adicionar observação a um aluno
exports.addObservacao = async (req, res, next) => {
    try {
        const { alunoId } = req.params;
        const { texto, nomeProfessor } = req.body;

        if (!texto || !nomeProfessor) {
            return res.status(400).json({ error: 'Texto e nome do professor são obrigatórios' });
        }

        const [newObs] = await db.insert(observacoesAlunos)
            .values({
                alunoId: parseInt(alunoId, 10),
                texto: texto.trim(),
                nomeProfessor: nomeProfessor.trim()
            })
            .returning();

        res.status(201).json(newObs);
    } catch (error) {
        next(error);
    }
};

// Remover observação
exports.deleteObservacao = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.delete(observacoesAlunos)
            .where(eq(observacoesAlunos.id, parseInt(id, 10)))
            .returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Observação não encontrada' });
        }

        res.json({ message: 'Observação removida com sucesso' });
    } catch (error) {
        next(error);
    }
};

// Buscar todas as situações ordenadas por nome
exports.getSituacoes = async (req, res, next) => {
    try {
        const list = await db.select()
            .from(situacaoAluno)
            .orderBy(situacaoAluno.nome);
        res.json(list);
    } catch (error) {
        next(error);
    }
};

