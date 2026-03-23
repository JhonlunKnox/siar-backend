const prisma = require('../lib/prisma');

function getMesActual() {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
}

async function kpis(req, res) {
  const { anio, mes } = getMesActual();
  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 1);

  const [pesajesMes, recicladoresActivos, pesajesMesDetalle] = await Promise.all([
    prisma.pesajeMaterial.aggregate({
      where: { pesaje: { horaEntrada: { gte: inicio, lt: fin }, estado: 'OK' } },
      _sum: { pesoNeto: true, rechazo: true },
    }),
    prisma.reciclador.count({ where: { estado: 'Activa' } }),
    prisma.pesajeMaterial.findMany({
      where: { pesaje: { horaEntrada: { gte: inicio, lt: fin }, estado: 'OK' } },
      include: {
        material: {
          include: {
            precios: { where: { vigenciaHasta: null }, orderBy: { vigenciaDesde: 'desc' }, take: 1 },
          },
        },
      },
    }),
  ]);

  const rechazos = Number(pesajesMes._sum.rechazo ?? 0);
  const aprovechado = Number(pesajesMes._sum.pesoNeto ?? 0) - rechazos;

  const liquidado = pesajesMesDetalle.reduce((acc, pm) => {
    const precio = Number(pm.material.precios[0]?.precio ?? 0);
    const kgComercializable = Number(pm.pesoNeto ?? 0) - Number(pm.rechazo ?? 0);
    return acc + (kgComercializable > 0 ? kgComercializable * precio : 0);
  }, 0);

  res.json({
    aprovechado: { valor: aprovechado, unidad: 'kg', delta: '+8%', dir: 'up' },
    recicladoresActivos: { valor: recicladoresActivos, delta: '0', dir: 'up' },
    rechazos: { valor: rechazos, unidad: 'kg', delta: '-3%', dir: 'down' },
    liquidado: { valor: Math.round(liquidado), unidad: 'COP', delta: '+12%', dir: 'up' },
  });
}

async function actividadReciente(req, res) {
  const pesajes = await prisma.pesaje.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      reciclador: true,
      materiales: { include: { material: true } },
    },
  });

  const actividad = pesajes.map((p) => {
    const pesoTotal = p.materiales.reduce((acc, m) => acc + Number(m.pesoNeto), 0);
    const iniciales = p.reciclador.nombre
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
    return {
      initials: iniciales,
      nombre: p.reciclador.nombre,
      codigo: p.reciclador.codigo,
      materiales: p.materiales.map((m) => m.material.nombre).join(', '),
      kg: pesoTotal.toFixed(1),
      hora: p.horaEntrada,
      estado: p.estado,
    };
  });

  res.json(actividad);
}

async function composicionMaterial(req, res) {
  const { anio, mes } = getMesActual();
  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 1);

  const por_material = await prisma.pesajeMaterial.groupBy({
    by: ['materialId'],
    where: { pesaje: { horaEntrada: { gte: inicio, lt: fin }, estado: 'OK' } },
    _sum: { pesoNeto: true },
    orderBy: { _sum: { pesoNeto: 'desc' } },
  });

  const total = por_material.reduce((acc, m) => acc + Number(m._sum.pesoNeto ?? 0), 0);

  const materialesIds = por_material.map((m) => m.materialId);
  const materiales = await prisma.material.findMany({ where: { id: { in: materialesIds } } });
  const matMap = Object.fromEntries(materiales.map((m) => [m.id, m]));

  const composicion = por_material.map((m) => ({
    materialId: m.materialId,
    nombre: matMap[m.materialId]?.nombre ?? 'Desconocido',
    icono: matMap[m.materialId]?.icono ?? '♻️',
    kg: Number(m._sum.pesoNeto ?? 0),
    porcentaje: total > 0 ? +((Number(m._sum.pesoNeto ?? 0) / total) * 100).toFixed(1) : 0,
  }));

  res.json({ total, composicion });
}

async function tendenciaSemanal(req, res) {
  // Últimas 8 semanas agrupadas
  const semanas = [];
  const hoy = new Date();

  for (let i = 7; i >= 0; i--) {
    const finSemana = new Date(hoy);
    finSemana.setDate(hoy.getDate() - i * 7);
    const inicioSemana = new Date(finSemana);
    inicioSemana.setDate(finSemana.getDate() - 6);

    const agg = await prisma.pesajeMaterial.aggregate({
      where: {
        pesaje: {
          horaEntrada: { gte: inicioSemana, lte: finSemana },
          estado: 'OK',
        },
      },
      _sum: { pesoNeto: true },
    });

    semanas.push({
      label: `S${8 - i}`,
      kg: Number(agg._sum.pesoNeto ?? 0),
      inicio: inicioSemana.toISOString().slice(0, 10),
      fin: finSemana.toISOString().slice(0, 10),
    });
  }

  res.json(semanas);
}

module.exports = { kpis, actividadReciente, composicionMaterial, tendenciaSemanal };
