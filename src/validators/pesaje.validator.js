const { z } = require('zod');

const materialPesajeSchema = z.object({
  materialId: z.number().int().positive(),
  pesoNeto: z.number().positive('El peso neto debe ser mayor a 0'),
  rechazo: z.number().min(0).default(0),
});

const crearPesajeSchema = z.object({
  recicladorId: z.number().int().positive(),
  rutaId: z.number().int().positive(),
  horaEntrada: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  horaSalida: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).optional(),
  materiales: z.array(materialPesajeSchema).min(1, 'Debe incluir al menos un material'),
  observaciones: z.string().max(500).optional(),
});

const actualizarEstadoSchema = z.object({
  estado: z.enum(['OK', 'Rechazo', 'Pendiente']),
  observaciones: z.string().max(500).optional(),
});

const listQuerySchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  recicladorId: z.coerce.number().int().positive().optional(),
  rutaId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['OK', 'Rechazo', 'Pendiente']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { crearPesajeSchema, actualizarEstadoSchema, listQuerySchema };
