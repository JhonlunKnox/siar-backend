const { z } = require('zod');

const mesParamSchema = z.object({
  yyyymm: z.string().regex(/^\d{4}-\d{2}$/, 'Formato: YYYY-MM'),
});

const ajusteManualSchema = z.object({
  materialId: z.number().int().positive(),
  anio: z.number().int().min(2020).max(2099),
  mes: z.number().int().min(1).max(12),
  cantidad: z.number().positive(),
  tipo: z.enum(['entrada', 'salida']),
  motivo: z.string().min(5).max(300),
});

module.exports = { mesParamSchema, ajusteManualSchema };
