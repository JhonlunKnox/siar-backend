const prisma = require('../lib/prisma');

async function listar(_req, res) {
  const rutas = await prisma.ruta.findMany({
    orderBy: { numero: 'asc' },
    include: {
      _count: { select: { recicladores: true, pesajes: true } },
    },
  });

  // Kg del mes actual por ruta
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const kgPorRuta = await prisma.pesaje.groupBy({
    by: ['rutaId'],
    where: { horaEntrada: { gte: inicioMes }, estado: 'OK' },
    _count: { id: true },
  });

  // Necesitamos el peso por ruta a través de PesajeMaterial
  const pesajesDelMes = await prisma.pesaje.findMany({
    where: { horaEntrada: { gte: inicioMes }, estado: 'OK' },
    select: { id: true, rutaId: true },
  });

  const pesosMes = await prisma.pesajeMaterial.groupBy({
    by: ['pesajeId'],
    where: { pesaje: { horaEntrada: { gte: inicioMes }, estado: 'OK' } },
    _sum: { pesoNeto: true },
  });

  const kgMap = {};
  for (const pm of pesosMes) {
    const p = pesajesDelMes.find((pe) => pe.id === pm.pesajeId);
    if (p) {
      kgMap[p.rutaId] = (kgMap[p.rutaId] ?? 0) + Number(pm._sum.pesoNeto ?? 0);
    }
  }

  const data = rutas.map((r) => ({
    ...r,
    numRecicladores: r._count.recicladores,
    kgMes: kgMap[r.id] ?? 0,
    _count: undefined,
  }));

  res.json(data);
}

async function resumenCobertura(_req, res) {
  const [totalRutas, totalBarrios, recicladoresActivos] = await Promise.all([
    prisma.ruta.count({ where: { estado: { not: 'Inactiva' } } }),
    prisma.ruta.findMany({ select: { barrios: true } }),
    prisma.reciclador.count({ where: { estado: 'Activa' } }),
  ]);

  const numBarrios = totalBarrios.reduce((acc, r) => acc + r.barrios.length, 0);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const kgMes = await prisma.pesajeMaterial.aggregate({
    where: { pesaje: { horaEntrada: { gte: inicioMes }, estado: 'OK' } },
    _sum: { pesoNeto: true },
  });

  res.json({
    totalRutas,
    totalBarrios: numBarrios,
    recicladoresActivos,
    kgMes: Number(kgMes._sum.pesoNeto ?? 0),
  });
}

async function obtener(req, res) {
  const id = Number(req.params.id);
  const ruta = await prisma.ruta.findUnique({
    where: { id },
    include: {
      recicladores: {
        select: { id: true, codigo: true, nombre: true, estado: true, color: true },
      },
    },
  });

  if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });
  res.json(ruta);
}

async function crear(req, res) {
  const existe = await prisma.ruta.findUnique({ where: { numero: req.body.numero } });
  if (existe) return res.status(409).json({ error: `La ruta ${req.body.numero} ya existe` });

  const ruta = await prisma.ruta.create({ data: req.body });
  res.status(201).json(ruta);
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const existe = await prisma.ruta.findUnique({ where: { id } });
  if (!existe) return res.status(404).json({ error: 'Ruta no encontrada' });

  const ruta = await prisma.ruta.update({ where: { id }, data: req.body });
  res.json(ruta);
}

module.exports = { listar, resumenCobertura, obtener, crear, actualizar };
