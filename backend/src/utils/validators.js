const { z } = require('zod');

const registerSchema = z.object({
    email: z.string().email({ message: "E-mail inválido" }),
    password: z.string().min(8, { message: "Senha deve ter pelo menos 8 caracteres" }),
    full_name: z.string().min(5, { message: "Nome muito curto" }).optional()
});

const loginSchema = z.object({
    email: z.string().email({ message: "E-mail inválido" }),
    password: z.string().min(1, { message: "Senha é obrigatória" })
});

const otpSchema = z.object({
    email: z.string().email({ message: "E-mail inválido" }),
    code: z.string().length(6, { message: "Código deve ter 6 dígitos" })
});

const resetPasswordSchema = z.object({
    email: z.string().email({ message: "E-mail inválido" }),
    code: z.string().length(6, { message: "Código deve ter 6 dígitos" }),
    newPassword: z.string().min(8, { message: "Nova senha deve ter pelo menos 8 caracteres" })
});

const emailOnlySchema = z.object({
    email: z.string().email({ message: "E-mail inválido" })
});

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: "Erro de validação",
            details: result.error.errors.map(e => e.message)
        });
    }
    next();
};

module.exports = {
    registerSchema,
    loginSchema,
    otpSchema,
    resetPasswordSchema,
    emailOnlySchema,
    validate
};
