const prisma = require('../lib/prisma');

function getMesActual() {
  const hoy = new Date();
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
}

// ─── Lógica pura (sin req/res) para reutilizar en /all y warm-up ──────────────
async function computeKpis() {
  const { anio, mes } = getMesActual();
  const inicio = new Date(anio, mes - 1, 1);
  const fin    = new Date(anio, mes, 1);

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

  const rechazos    = Number(pesajesMes._sum.rechazo  ?? 0);
  const aprovechado = Number(pesajesMes._sum.pesoNeto ?? 0) - rechazos;
  const liquidado   = pesajesMesDetalle.reduce((acc, pm) => {
    const precio = Number(pm.material.precios[0]?.precio ?? 0);
    const kg     = Number(pm.pesoNeto ?? 0) - Number(pm.rechazo ?? 0);
    return acc + (kg > 0 ? kg * precio : 0);
  }, 0);

  return {
    aprovechado:        { valor: aprovechado,          unidad: 'kg',  delta: '+8%',  dir: 'up'   },
    recicladoresActivos:{ valor: recicladoresActivos,  delta: '0',    dir: 'up'                  },
    rechazos:           { valor: rechazos,             unidad: 'kg',  delta: '-3%',  dir: 'down' },
    liquidado:          { valor: Math.round(liquidado),unidad: 'COP', delta: '+12%', dir: 'up'   },
  };
}

async function computeActividad() {
  const pesajes = await prisma.pesaje.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      reciclador: { select: { nombre: true, codigo: true } },
      materiales: { include: { material: { select: { nombre: true, icono: true } } } },
    },
  });

  return pesajes.map((p) => {
    const pesoTotal = p.materiales.reduce((acc, m) => acc + Number(m.pesoNeto), 0);
    const iniciales = p.reciclador.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('');
    return {
      initials: iniciales, nombre: p.reciclador.nombre, codigo: p.reciclador.codigo,
      materiales: p.materiales.map((m) => m.material.nombre).join(', '),
      kg: pesoTotal.toFixed(1), hora: p.horaEntrada, estado: p.estado,
    };
  });
}

async function computeComposicion() {
  const { anio, mes } = getMesActual();
  const inicio = new Date(anio, mes - 1, 1);
  const fin    = new Date(anio, mes, 1);

  const raw = await prisma.pesajeMaterial.findMany({
    where: { pesaje: { horaEntrada: { gte: inicio, lt: fin }, estado: 'OK' } },
    select: { pesoNeto: true, material: { select: { nombre: true, icono: true } } },
  });

  const map = new Map();
  for (const pm of raw) {
    const key = pm.material.nombre;
    if (!map.has(key)) map.set(key, { nombre: pm.material.nombre, icono: pm.material.icono, kg: 0 });
    map.get(key).kg += Number(pm.pesoNeto ?? 0);
  }

  const total = Array.from(map.values()).reduce((acc, m) => acc + m.kg, 0);
  return {
    total,
    composicion: Array.from(map.values()).map((m) => ({
      nombre: m.nombre, icono: m.icono ?? '♻️', kg: m.kg,
      porcentaje: total > 0 ? +((m.kg / total) * 100).toFixed(1) : 0,
    })),
  };
}

async function computeTendencia() {
  const hoy   = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - 7 * 8);
  inicio.setHours(0, 0, 0, 0);

  const pesajes = await prisma.pesajeMaterial.findMany({
    where: { pesaje: { horaEntrada: { gte: inicio }, estado: 'OK' } },
    select: { pesoNeto: true, pesaje: { select: { horaEntrada: true } } },
  });

  const semanas = Array.from({ length: 8 }, (_, i) => {
    const fin = new Date(hoy); fin.setDate(hoy.getDate() - i * 7);
    const ini = new Date(fin); ini.setDate(fin.getDate() - 6); ini.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);
    return { label: `S${8 - i}`, kg: 0, inicio: ini, fin,
             inicioStr: ini.toISOString().slice(0, 10), finStr: fin.toISOString().slice(0, 10) };
  }).reverse();

  for (const pm of pesajes) {
    const fecha = new Date(pm.pesaje.horaEntrada);
    const sem   = semanas.find((s) => fecha >= s.inicio && fecha <= s.fin);
    if (sem) sem.kg += Number(pm.pesoNeto ?? 0);
  }

  return semanas.map((s) => ({ label: s.label, kg: s.kg, inicio: s.inicioStr, fin: s.finStr }));
}

// ─── Handlers individuales (mantienen compatibilidad) ─────────────────────────
async function kpis(_req, res) {
  try { res.json(await computeKpis()) }
  catch (err) { console.error('[dashboard.kpis]', err); res.status(500).json({ error: 'Error al obtener KPIs' }) }
}

async function actividadReciente(_req, res) {
  try { res.json(await computeActividad()) }
  catch (err) { console.error('[dashboard.actividadReciente]', err); res.status(500).json({ error: 'Error al obtener actividad reciente' }) }
}

async function composicionMaterial(_req, res) {
  try { res.json(await computeComposicion()) }
  catch (err) { console.error('[dashboard.composicionMaterial]', err); res.status(500).json({ error: 'Error al obtener composición' }) }
}

async function tendenciaSemanal(_req, res) {
  try { res.json(await computeTendencia()) }
  catch (err) { console.error('[dashboard.tendenciaSemanal]', err); res.status(500).json({ error: 'Error al obtener tendencia semanal' }) }
}

// ─── Endpoint combinado: 1 request = todos los datos del dashboard ─────────────
async function all(_req, res) {
  try {
    const [kpisData, actividad, composicion, tendencia] = await Promise.all([
      computeKpis(),
      computeActividad(),
      computeComposicion(),
      computeTendencia(),
    ]);
    res.json({ kpis: kpisData, actividad, composicion, tendencia });
  } catch (err) {
    console.error('[dashboard.all]', err);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
}

module.exports = { kpis, actividadReciente, composicionMaterial, tendenciaSemanal, all, computeKpis, computeActividad, computeComposicion, computeTendencia };
