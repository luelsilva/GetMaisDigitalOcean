const { db } = require('../db');
const { courses, courseTeachers, teachers } = require('../db/schema');
const { eq, inArray, and, isNull } = require('drizzle-orm');
const { formatarNome } = require('../utils/utils');

// Listar todos os cursos
// Listar todos os cursos
exports.getAllCourses = async (req, res, next) => {
    try {
        const allCourses = await db.select().from(courses)
            .orderBy(courses.name);

        // Se não houver cursos, retorne vazio
        if (allCourses.length === 0) {
            return res.json([]);
        }

        const courseIds = allCourses.map(c => c.id);

        // Buscar professores vinculados a esses cursos
        const relations = await db.select({
            courseId: courseTeachers.courseId,
            teacherId: teachers.id,
            name: teachers.name,
            registration: teachers.registration,
            email: teachers.email
        })
            .from(courseTeachers)
            .innerJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
            .where(inArray(courseTeachers.courseId, courseIds));

        // Agrupar professores por curso
        const coursesWithTeachers = allCourses.map(course => {
            const courseRelations = relations.filter(r => r.courseId === course.id);
            return {
                ...course,
                teachers: courseRelations.map(r => ({
                    id: r.teacherId,
                    name: r.name,
                    registration: r.registration,
                    email: r.email
                }))
            };
        });

        res.json(coursesWithTeachers);
    } catch (error) {
        next(error);
    }
};



// Obter curso por ID com professores
exports.getCourseById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Buscar curso
        const courseResult = await db.select().from(courses)
            .where(eq(courses.id, id));
        if (courseResult.length === 0) return res.status(404).json({ error: 'Curso não encontrado' });

        const course = courseResult[0];

        // Buscar professores vinculados
        const teachersResult = await db.select({
            id: teachers.id,
            name: teachers.name,
            registration: teachers.registration
        })
            .from(courseTeachers)
            .innerJoin(teachers, eq(courseTeachers.teacherId, teachers.id))
            .where(eq(courseTeachers.courseId, id));

        course.teachers = teachersResult;

        res.json(course);
    } catch (error) {
        next(error);
    }
};

// Criar novo curso
exports.createCourse = async (req, res, next) => {
    try {
        const { name, sigla, shortName, teacherIds } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome do curso é obrigatório' });
        if (!sigla) return res.status(400).json({ error: 'Sigla do curso é obrigatória' });
        if (!shortName) return res.status(400).json({ error: 'Nome curto do curso é obrigatório' });

        const result = await db.transaction(async (tx) => {
            // 1. Criar curso
            const [course] = await tx.insert(courses).values({
                name: formatarNome(name),
                sigla: sigla.toUpperCase(),
                shortName: formatarNome(shortName)
            }).returning();

            // 2. Vincular professores (se houver)
            if (teacherIds && Array.isArray(teacherIds) && teacherIds.length > 0) {
                const relations = teacherIds.map(tId => ({
                    courseId: course.id,
                    teacherId: tId
                }));
                await tx.insert(courseTeachers).values(relations);
            }
            return course;
        });

        res.status(201).json(result);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Curso ou Sigla já cadastrado' });
        }
        next(error);
    }
};

// Atualizar curso
exports.updateCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, sigla, shortName, teacherIds } = req.body;

        if (!name) return res.status(400).json({ error: 'Nome do curso é obrigatório' });
        if (!sigla) return res.status(400).json({ error: 'Sigla do curso é obrigatória' });
        if (!shortName) return res.status(400).json({ error: 'Nome curto do curso é obrigatório' });

        const result = await db.transaction(async (tx) => {
            // 1. Atualizar curso
            const [updatedCourse] = await tx.update(courses)
                .set({
                    name: formatarNome(name),
                    sigla: sigla.toUpperCase(),
                    shortName: formatarNome(shortName),
                    updatedAt: new Date()
                })
                .where(eq(courses.id, id))
                .returning();

            if (!updatedCourse) throw new Error('COURSE_NOT_FOUND');

            // 2. Atualizar relacionamentos (se teacherIds for fornecido)
            if (teacherIds && Array.isArray(teacherIds)) {
                // Remover antigos
                await tx.delete(courseTeachers).where(eq(courseTeachers.courseId, id));

                // Adicionar novos
                if (teacherIds.length > 0) {
                    const relations = teacherIds.map(tId => ({
                        courseId: id,
                        teacherId: tId
                    }));
                    await tx.insert(courseTeachers).values(relations);
                }
            }

            return updatedCourse;
        });

        res.json(result);
    } catch (error) {
        if (error.message === 'COURSE_NOT_FOUND') {
            return res.status(404).json({ error: 'Curso não encontrado' });
        }
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Nome ou Sigla do curso já em uso' });
        }
        next(error);
    }
};

// Deletar curso
exports.deleteCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.delete(courses)
            .where(eq(courses.id, id))
            .returning();

        if (result.length === 0) return res.status(404).json({ error: 'Curso não encontrado' });
        res.status(200).json({ message: 'Curso removido com sucesso' });
    } catch (error) {
        next(error);
    }
};
