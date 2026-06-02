const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Multer em memória — recebe o arquivo do frontend GetMais
const upload = multer({ storage: multer.memoryStorage() });

// Middleware global: JWT válido + role admin ou sudo
router.use(authenticateToken, authorizeRoles('sudo', 'admin'));

/**
 * POST /api/alunos/importar
 * 
 * Recebe o arquivo XLSX/CSV do frontend GetMais e faz proxy
 * para o microserviço processador-alunos (rede Docker interna).
 * Apenas admins e sudos autenticados chegam até aqui.
 */
router.post(
    '/importar',
    upload.single('file'),
    async (req, res) => {
        try {
            const { ano_inicio_curso, semestre_inicio_curso, total_horas_estagio } = req.body;

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }

            const processadorUrl = process.env.PROCESSADOR_URL || 'http://processador-alunos:8000';
            const internalToken = process.env.INTERNAL_TOKEN;

            if (!internalToken) {
                console.error('[alunosImportRoutes] INTERNAL_TOKEN não configurado!');
                return res.status(500).json({ error: 'Configuração interna ausente.' });
            }

            // Montar FormData para reencaminhar ao serviço Python
            const form = new FormData();
            form.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype,
            });
            form.append('ano_inicio_curso', ano_inicio_curso || String(new Date().getFullYear()));
            form.append('semestre_inicio_curso', semestre_inicio_curso || '1');
            form.append('total_horas_estagio', total_horas_estagio || '300');

            const response = await fetch(`${processadorUrl}/api/upload`, {
                method: 'POST',
                headers: {
                    'X-Internal-Token': internalToken,
                    ...form.getHeaders(),
                },
                body: form,
            });

            const data = await response.json();

            return res.status(response.status).json(data);

        } catch (error) {
            console.error('[alunosImportRoutes] Erro ao chamar processador-alunos:', error);
            return res.status(502).json({
                error: 'Não foi possível contactar o serviço de importação. Tente novamente.'
            });
        }
    }
);

module.exports = router;
