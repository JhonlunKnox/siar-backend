const { z } = require('zod');

const crearRecicladorSchema = z.object({
  nombre: z.string().min(2).max(100),
  documento: z.string().min(5).max(20).optional(),
  telefono: z.string().regex(/^[0-9+\s-]{7,15}$/).optional(),
  email: z.string().email().optional(),
  rutaId: z.number().int().positive().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#4caf7d'),
  usuarioId: z.number().int().positive().optional(),
});

const actualizarRecicladorSchema = crearRecicladorSchema.partial().extend({
  estado: z.enum(['Activa', 'Inactivo']).optional(),
});

const listQuerySchema = z.object({
  rutaId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['Activa', 'Inactivo']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { crearRecicladorSchema, actualizarRecicladorSchema, listQuerySchema };
