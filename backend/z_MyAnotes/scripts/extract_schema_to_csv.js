const fs = require('fs');
const path = require('path');

const sqlPath = path.resolve('c:/Users/LuizCarlos/Desktop/luelsilva/urso/src/db/migrations/create_database.sql');
const csvPath = path.resolve('c:/Users/LuizCarlos/Desktop/luelsilva/urso/z_MyAnotes/database_schema.csv');

const sql = fs.readFileSync(sqlPath, 'utf8');

const tables = {};
const tableComments = {};
const columnComments = {};

// 1. Extract comments
const commentRegex = /COMMENT ON (TABLE|COLUMN) ([\w\.]+)\s+IS\s+'(.*?)';/gi;
let match;
while ((match = commentRegex.exec(sql)) !== null) {
    const type = match[1].toUpperCase();
    const name = match[2].replace(/"/g, '');
    const text = match[3];

    if (type === 'TABLE') {
        tableComments[name] = text;
    } else {
        columnComments[name] = text; // e.g., profiles.is_verified
    }
}

// 2. Extract tables and columns
// Simplified regex to match CREATE TABLE blocks
const tableBlocks = sql.match(/CREATE TABLE IF NOT EXISTS (["\w]+)\s*\(([\s\S]*?)\);/gi);

if (tableBlocks) {
    tableBlocks.forEach(block => {
        const headerMatch = block.match(/CREATE TABLE IF NOT EXISTS (["\w]+)/i);
        if (!headerMatch) return;

        const tableName = headerMatch[headerMatch.length - 1].replace(/"/g, '');
        const body = block.substring(block.indexOf('(') + 1, block.lastIndexOf(')'));

        const lines = body.split('\n');
        tables[tableName] = [];

        lines.forEach(line => {
            line = line.trim();
            if (!line || line.toUpperCase().startsWith('CONSTRAINT') || line.toUpperCase().startsWith('PRIMARY KEY') || line.toUpperCase().startsWith('FOREIGN KEY')) return;

            // Match column name and the rest
            const colMatch = line.match(/^"?([\w]+)"?\s+([\w\s\(\)]+)(?:,)?$/i);
            if (colMatch) {
                const colName = colMatch[1];
                const parts = colMatch[2].trim().split(/\s+/);
                const dataType = parts[0];
                const constraints = parts.slice(1).join(' ');

                tables[tableName].push({
                    name: colName,
                    type: dataType,
                    constraints: constraints
                });
            }
        });
    });
}

// 3. Generate CSV
const csvRows = [['table_name', 'column_name', 'data_type', 'constraints', 'comment']];

Object.keys(tables).forEach(tableName => {
    // Add a row for the table itself if it has a comment? 
    // Usually CSV for schema maps columns.

    tables[tableName].forEach(col => {
        const fullColName = `${tableName}.${col.name}`;
        const comment = columnComments[fullColName] || (col.name === 'id' ? tableComments[tableName] : '') || '';

        csvRows.push([
            tableName,
            col.name,
            col.type,
            col.constraints,
            comment.replace(/"/g, '""')
        ]);
    });
});

const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

fs.mkdirSync(path.dirname(csvPath), { recursive: true });
fs.writeFileSync(csvPath, csvContent);

console.log('CSV generated at:', csvPath);
