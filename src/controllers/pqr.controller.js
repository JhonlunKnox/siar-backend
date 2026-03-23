const prisma = require('../lib/prisma');

function generarRadicado(id) {
  return `PQR-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;
}

function diasHabiles(dias) {
  const fecha = new Date();
  let agregados = 0;
  while (agregados < dias) {
    fecha.setDate(fecha.getDate() + 1);
    const dia = fecha.getDay();
    if (dia !== 0 && dia !== 6) agregados++;
  }
  return fecha;
}

async function listar(req, res) {
  const { estado, tipo, page, limit } = req.query;

  const where = {};
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;

  const skip = (Number(page) - 1) * Number(limit);

  const [total, pqrs] = await Promise.all([
    prisma.pQR.count({ where }),
    prisma.pQR.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        operador: { select: { id: true, nombre: true } },
      },
    }),
  ]);

  res.json({
    data: pqrs,
    meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
}

async function estadisticas(_req, res) {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [total, enTramite, respondidas, cerradas, quejasSinResolver] = await Promise.all([
    prisma.pQR.count({ where: { createdAt: { gte: inicioMes } } }),
    prisma.pQR.count({ where: { estado: 'EnTramite' } }),
    prisma.pQR.count({ where: { estado: 'Respondida', createdAt: { gte: inicioMes } } }),
    prisma.pQR.count({ where: { estado: 'Cerrada', createdAt: { gte: inicioMes } } }),
    prisma.pQR.count({ where: { tipo: 'Queja', estado: { in: ['Recibida', 'EnTramite'] } } }),
  ]);

  // Tiempo promedio de respuesta (en días)
  const resueltas = await prisma.pQR.findMany({
    where: {
      estado: { in: ['Respondida', 'Cerrada'] },
      fechaCierre: { not: null },
      createdAt: { gte: inicioMes },
    },
    select: { createdAt: true, fechaCierre: true },
  });

  let tiempoPromedio = 0;
  if (resueltas.length > 0) {
    const totalDias = resueltas.reduce((acc, pqr) => {
      const diff = (pqr.fechaCierre - pqr.createdAt) / (1000 * 60 * 60 * 24);
      return acc + diff;
    }, 0);
    tiempoPromedio = +(totalDias / resueltas.length).toFixed(1);
  }

  res.json({
    totalMes: total,
    enTramite,
    respondidas,
    cerradas,
    quejasSinResolver,
    tiempoPromedioRespuesta: tiempoPromedio,
  });
}

async function obtener(req, res) {
  const pqr = await prisma.pQR.findUnique({
    where: { radicado: req.params.radicado },
    include: {
      solicitante: { select: { id: true, nombre: true, email: true } },
      operador: { select: { id: true, nombre: true } },
    },
  });

  if (!pqr) return res.status(404).json({ error: 'PQR no encontrada' });
  res.json(pqr);
}

async function crear(req, res) {
  // Generar ID temporal para el radicado
  const count = await prisma.pQR.count();
  const tempId = count + 1;
  const radicado = generarRadicado(tempId);

  const pqr = await prisma.pQR.create({
    data: {
      ...req.body,
      radicado,
      fechaLimite: diasHabiles(15),
      solicitanteId: req.user?.sub ?? null,
    },
  });

  res.status(201).json(pqr);
}

async function responder(req, res) {
  const pqr = await prisma.pQR.findUnique({ where: { radicado: req.params.radicado } });
  if (!pqr) return res.status(404).json({ error: 'PQR no encontrada' });

  if (pqr.estado === 'Cerrada') {
    return res.status(409).json({ error: 'La PQR ya está cerrada' });
  }

  const actualizada = await prisma.pQR.update({
    where: { radicado: req.params.radicado },
    data: {
      respuesta: req.body.respuesta,
      estado: 'Respondida',
      operadorId: req.user.sub,
      fechaCierre: new Date(),
    },
  });

  res.json(actualizada);
}

async function cerrar(req, res) {
  const pqr = await prisma.pQR.findUnique({ where: { radicado: req.params.radicado } });
  if (!pqr) return res.status(404).json({ error: 'PQR no encontrada' });

  const actualizada = await prisma.pQR.update({
    where: { radicado: req.params.radicado },
    data: { estado: 'Cerrada', fechaCierre: new Date() },
  });

  res.json(actualizada);
}

module.exports = { listar, estadisticas, obtener, crear, responder, cerrar };
