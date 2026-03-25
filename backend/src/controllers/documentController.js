const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const os = require('os');
const libre = require('libreoffice-convert');
const util = require('util');

libre.convertAsync = util.promisify(libre.convert);

/**
 * Controller para geração de documentos locais (.docx)
 * Esta é a única via de geração de documentos agora, eliminando dependência do Google.
 */

const generateDocx = async (req, res) => {
    const { template_id, nome_documento, data } = req.body;

    if (!template_id || !nome_documento || !data) {
        return res.status(400).json({
            error: 'Parâmetros ausentes: template_id, nome_documento ou data',
        });
    }

    try {
        // O template_id mapeia para o nome do arquivo na pasta src/templates (ex: 1508.docx)
        const templatePath = path.resolve(__dirname, '../templates', `${template_id}.docx`);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                error: `O modelo '${template_id}.docx' não foi encontrado na pasta de templates do servidor.`
            });
        }

        // Ler o conteúdo do arquivo
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '[[', end: ']]' }
        });

        // Injetar os dados do formulário no template
        doc.render(data);

        // Gerar o buffer final do Word
        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // Configurar headers para download do arquivo
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(nome_documento)}.docx`
        );

        res.send(buf);

    } catch (error) {
        console.error('Erro ao gerar DOCX:', error);
        res.status(500).json({ error: 'Erro interno ao processar o documento Word' });
    }
};

const generatePdf = async (req, res) => {
    const { template_id, nome_documento, data } = req.body;

    if (!template_id || !nome_documento || !data) {
        return res.status(400).json({
            error: 'Parâmetros ausentes: template_id, nome_documento ou data',
        });
    }

    try {
        const templatePath = path.resolve(__dirname, '../templates', `${template_id}.docx`);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                error: `O modelo '${template_id}.docx' não foi encontrado.`
            });
        }

        // 1. Gera o DOCX em memória usando a mesma lógica com o Docxtemplater
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '[[', end: ']]' }
        });

        doc.render(data);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // 2. Converte o buffer gerado (.docx) diretamente para PDF localmente com o LibreOffice
        const pdfBuffer = await libre.convertAsync(buf, '.pdf', undefined);

        // 7. Envia pro navegado baixar
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(nome_documento)}.pdf`
        );

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Erro ao gerar PDF localmente:', error);
        res.status(500).json({ error: 'Falha ao processar PDF via LibreOffice: ' + (error.message || 'Erro desconhecido') });
    }
};

module.exports = {
    generateDocx,
    generatePdf
};
