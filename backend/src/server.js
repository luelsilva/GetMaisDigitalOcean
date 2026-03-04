const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares de Segurança e Configuração
app.use(helmet());
app.use(cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Movido para cima do rate limiter para permitir leitura do corpo
app.use(globalLimiter);

const menuRoutes = require('./routes/menuRoutes');
const adminMenuRoutes = require('./routes/adminMenuRoutes');
const documentRoutes = require('./routes/documentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const keepAliveRoutes = require('./routes/keepAliveRoutes');
const dbRoutes = require('./routes/dbRoutes');
// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admin/menu', adminMenuRoutes);
app.use('/api/documentos', documentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/system', keepAliveRoutes);
app.use('/api/db', dbRoutes);


// Rota de Teste
app.get('/', (req, res) => {
    res.json({ message: 'API de Autenticação OTP Rodando! 23/02 as 22:13' });
});

// Rota para capturar 404 (deve ser a última antes do errorHandler)
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratamento de Erros
app.use(errorHandler);

// Inicialização
app.listen(config.port, () => {
    console.log(`Servidor rodando em: http://localhost:${config.port}`);
    console.log('='.repeat(50));

});
