const prisma = require('../lib/prisma');

async function listar(req, res) {
  const { rutaId, estado, q, page, limit } = req.query;

  const where = {};
  if (rutaId) where.rutaId = Number(rutaId);
  if (estado) where.estado = estado;
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { codigo: { contains: q, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, recicladores] = await Promise.all([
    prisma.reciclador.count({ where }),
    prisma.reciclador.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { nombre: 'asc' },
      include: {
        ruta: { select: { id: true, numero: true, nombre: true } },
        _count: { select: { pesajes: true } },
      },
    }),
  ]);

  // Agregar kg del mes actual
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const kgPorReciclador = await prisma.pesajeMaterial.groupBy({
    by: ['pesajeId'],
    where: {
      pesaje: {
        recicladorId: { in: recicladores.map((r) => r.id) },
        horaEntrada: { gte: inicioMes },
        estado: 'OK',
      },
    },
    _sum: { pesoNeto: true },
  });

  // Necesitamos mapear pesajeId → recicladorId
  const pesajesIds = kgPorReciclador.map((k) => k.pesajeId);
  const pesajes = pesajesIds.length
    ? await prisma.pesaje.findMany({
        where: { id: { in: pesajesIds } },
        select: { id: true, recicladorId: true },
      })
    : [];

  const kgMap = {};
  for (const k of kgPorReciclador) {
    const p = pesajes.find((pe) => pe.id === k.pesajeId);
    if (p) {
      kgMap[p.recicladorId] = (kgMap[p.recicladorId] ?? 0) + Number(k._sum.pesoNeto ?? 0);
    }
  }

  const data = recicladores.map((r) => ({
    ...r,
    kgMes: kgMap[r.id] ?? 0,
    totalPesajes: r._count.pesajes,
    _count: undefined,
  }));

  res.json({
    data,
    meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
}

async function obtener(req, res) {
  const id = Number(req.params.id);
  const reciclador = await prisma.reciclador.findUnique({
    where: { id },
    include: {
      ruta: true,
      usuario: { select: { id: true, email: true, activo: true } },
    },
  });

  if (!reciclador) return res.status(404).json({ error: 'Reciclador no encontrado' });

  // Estadísticas del mes
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [kgMes, visitasMes, pesajesRecientes] = await Promise.all([
    prisma.pesajeMaterial.aggregate({
      where: {
        pesaje: { recicladorId: id, horaEntrada: { gte: inicioMes }, estado: 'OK' },
      },
      _sum: { pesoNeto: true },
    }),
    prisma.pesaje.count({
      where: { recicladorId: id, horaEntrada: { gte: inicioMes } },
    }),
    prisma.pesaje.findMany({
      where: { recicladorId: id },
      take: 10,
      orderBy: { horaEntrada: 'desc' },
      include: {
        materiales: { include: { material: { select: { nombre: true, icono: true } } } },
        ruta: { select: { numero: true, nombre: true } },
      },
    }),
  ]);

  res.json({
    ...reciclador,
    estadisticas: {
      kgMes: Number(kgMes._sum.pesoNeto ?? 0),
      visitasMes,
    },
    actividadReciente: pesajesRecientes,
  });
}

async function crear(req, res) {
  // Generar código único
  const ultimo = await prisma.reciclador.findFirst({ orderBy: { id: 'desc' } });
  const nuevoNum = (ultimo ? parseInt(ultimo.codigo.split('-')[1]) + 1 : 1)
    .toString()
    .padStart(4, '0');
  const codigo = `ID-${nuevoNum}`;

  const reciclador = await prisma.reciclador.create({
    data: { ...req.body, codigo },
    include: { ruta: true },
  });

  res.status(201).json(reciclador);
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existe = await prisma.reciclador.findUnique({ where: { id } });
  if (!existe) return res.status(404).json({ error: 'Reciclador no encontrado' });

  const reciclador = await prisma.reciclador.update({
    where: { id },
    data: req.body,
    include: { ruta: true },
  });

  res.json(reciclador);
}

async function historial(req, res) {
  const id = Number(req.params.id);
  const { page = 1, limit = 20 } = req.query;

  const existe = await prisma.reciclador.findUnique({ where: { id } });
  if (!existe) return res.status(404).json({ error: 'Reciclador no encontrado' });

  const skip = (Number(page) - 1) * Number(limit);

  const [total, pesajes] = await Promise.all([
    prisma.pesaje.count({ where: { recicladorId: id } }),
    prisma.pesaje.findMany({
      where: { recicladorId: id },
      skip,
      take: Number(limit),
      orderBy: { horaEntrada: 'desc' },
      include: {
        ruta: { select: { numero: true, nombre: true } },
        materiales: {
          include: { material: { select: { nombre: true, icono: true, codigo: true } } },
        },
      },
    }),
  ]);

  res.json({
    data: pesajes,
    meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
}

async function cuentaCobro(req, res) {
  const id = Number(req.params.id);
  const { mes, anio } = req.query;

  const a = anio ? Number(anio) : new Date().getFullYear();
  const m = mes ? Number(mes) : new Date().getMonth() + 1;

  const inicio = new Date(a, m - 1, 1);
  const fin = new Date(a, m, 1);

  const reciclador = await prisma.reciclador.findUnique({
    where: { id },
    include: { ruta: true },
  });
  if (!reciclador) return res.status(404).json({ error: 'Reciclador no encontrado' });

  const pesajes = await prisma.pesaje.findMany({
    where: { recicladorId: id, horaEntrada: { gte: inicio, lt: fin }, estado: 'OK' },
    include: {
      materiales: {
        include: {
          material: {
            include: {
              precios: {
                where: { vigenciaHasta: null },
                orderBy: { vigenciaDesde: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  let totalKg = 0;
  let totalValor = 0;
  const detalles = [];

  for (const pesaje of pesajes) {
    for (const pm of pesaje.materiales) {
      const precio = pm.material.precios[0]?.precio ?? 0;
      const kg = Number(pm.pesoNeto);
      const valor = kg * Number(precio);
      totalKg += kg;
      totalValor += valor;
      detalles.push({
        fecha: pesaje.horaEntrada,
        material: pm.material.nombre,
        kg,
        precioPorKg: Number(precio),
        valor,
      });
    }
  }

  res.json({
    reciclador: { id: reciclador.id, codigo: reciclador.codigo, nombre: reciclador.nombre },
    periodo: `${a}-${String(m).padStart(2, '0')}`,
    totalKg,
    totalValor,
    visitas: pesajes.length,
    detalles,
  });
}

module.exports = { listar, obtener, crear, actualizar, historial, cuentaCobro };
