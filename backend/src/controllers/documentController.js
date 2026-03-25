const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const CloudConvert = require('cloudconvert');
const os = require('os');

// Instancia CloudConvert: você vai precisar colocar a sua chave real no .env (CLOUDCONVERT_API_KEY)
// Ou substituir a string 'SUA_CHAVE_AQUI' abaixo pela chave copiada do site
const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || 'SUA_CHAVE_AQUI');

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

        // 2. Salva o DOCX processado no disco temporário para enviar pro CloudConvert
        const tempDocxPath = path.join(os.tmpdir(), `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}.docx`);
        fs.writeFileSync(tempDocxPath, buf);

        // 3. Monta e dispara a rotina (Job) do CloudConvert
        let job = await cloudConvert.jobs.create({
            tasks: {
                'import-my-file': {
                    operation: 'import/upload'
                },
                'convert-my-file': {
                    operation: 'convert',
                    input: 'import-my-file',
                    output_format: 'pdf'
                },
                'export-my-file': {
                    operation: 'export/url',
                    input: 'convert-my-file'
                }
            }
        });

        // 4. Faz o upload do arquivo temporário pra tarefa
        const uploadTask = job.tasks.filter(t => t.name === 'import-my-file')[0];
        await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(tempDocxPath), 'document.docx');

        // 5. Aguarda o trabalho do CloudConvert finalizar e clica o exportUrl
        job = await cloudConvert.jobs.wait(job.id);
        const exportTask = job.tasks.filter(t => t.name === 'export-my-file')[0];
        
        const fileResultUrl = exportTask.result.files[0].url;

        // 6. Faz o download do PDF pronto pro Buffer 
        const pdfResponse = await fetch(fileResultUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

        // Limpa o arquivo temporário silenciosamente
        try { fs.unlinkSync(tempDocxPath); } catch (e) { }

        // 7. Envia pro navegado baixar
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(nome_documento)}.pdf`
        );

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Erro ao gerar PDF CloudConvert:', error);
        
        let errorMessage = error.message || 'Erro desconhecido';
        // Se for erro da API do CloudConvert, ele pode vir com uma estrutura de resposta
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
        }

        res.status(500).json({ error: 'Falha ao processar PDF via CloudConvert: ' + errorMessage });
    }
};

module.exports = {
    generateDocx,
    generatePdf
};
