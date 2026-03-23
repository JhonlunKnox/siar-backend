/**
 * Middleware de validación con Zod.
 * @param {import('zod').ZodSchema} schema - Schema a validar
 * @param {'body'|'query'|'params'} source - Fuente de los datos
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message,
      }));
      return res.status(422).json({ error: 'Datos inválidos', detalles: errors });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
