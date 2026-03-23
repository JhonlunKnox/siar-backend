const { z } = require('zod');

const crearPQRSchema = z.object({
  tipo: z.enum(['Peticion', 'Queja', 'Reclamo']),
  canal: z.enum(['presencial', 'email', 'telefono', 'web']).default('web'),
  nombreSolicitante: z.string().min(2).max(100).optional(),
  emailSolicitante: z.string().email().optional(),
  telefonoSolicitante: z.string().regex(/^[0-9+\s-]{7,15}$/).optional(),
  descripcion: z.string().min(10).max(1000),
}).refine(
  (data) => data.emailSolicitante || data.telefonoSolicitante,
  { message: 'Debe proveer al menos un medio de contacto (email o teléfono)' }
);

const responderPQRSchema = z.object({
  respuesta: z.string().min(10).max(2000),
});

const listQuerySchema = z.object({
  estado: z.enum(['Recibida', 'EnTramite', 'Respondida', 'Cerrada']).optional(),
  tipo: z.enum(['Peticion', 'Queja', 'Reclamo']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { crearPQRSchema, responderPQRSchema, listQuerySchema };
