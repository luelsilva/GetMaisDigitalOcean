const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../te.json');

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(rawData);

    if (json.data && typeof json.data === 'object') {
        const sortedData = {};
        Object.keys(json.data).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
        ).forEach(key => {
            sortedData[key] = json.data[key];
        });

        json.data = sortedData;

        fs.writeFileSync(filePath, JSON.stringify(json, null, 4), 'utf8');
        console.log('✅ Chaves de "data" em te.json ordenadas com sucesso!');
    } else {
        console.log('⚠️ O arquivo te.json não possui a chave "data" ou ela não é um objeto.');
    }

} catch (err) {
    console.error('❌ Erro ao processar o arquivo:', err);
}
