const { z } = require('zod');

const crearMaterialSchema = z.object({
  nombre: z.string().min(2).max(50),
  codigo: z.string().regex(/^[A-Z]{2,4}-\d{2}$/, 'Formato: CAR-01'),
  icono: z.string().optional(),
  unidad: z.string().default('kg'),
});

const actualizarPrecioSchema = z.object({
  precio: z.number().positive('El precio debe ser mayor a 0'),
  tendencia: z.enum(['subida', 'bajada', 'estable']).default('estable'),
  vigenciaDesde: z.string().datetime({ offset: true }).optional(),
});

const crearCompradorSchema = z.object({
  empresa: z.string().min(2).max(100),
  materialId: z.number().int().positive(),
  precio: z.number().positive(),
  activo: z.boolean().default(true),
});

module.exports = { crearMaterialSchema, actualizarPrecioSchema, crearCompradorSchema };
