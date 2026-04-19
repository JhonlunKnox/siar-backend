const supabase = require('../lib/supabase');

function getMesActual() {
  const hoy = new Date();
  return {
    inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString(),
    fin:    new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1).toISOString(),
  };
}

async function computeKpis() {
  const { inicio, fin } = getMesActual();

  const [
    { data: matMes },
    { count: recActivos },
    { data: preciosMes },
  ] = await Promise.all([
    // pesaje_materiales JOIN pesajes via pesajeId
    supabase
      .from('pesaje_materiales')
      .select('pesoNeto, rechazo, pesajes!pesajeId(horaEntrada, estado)')
      .gte('pesajes.horaEntrada', inicio)
      .lt('pesajes.horaEntrada', fin)
      .eq('pesajes.estado', 'OK'),

    supabase
      .from('recicladores')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'Activa'),

    supabase
      .from('pesaje_materiales')
      .select(`
        pesoNeto, rechazo,
        pesajes!pesajeId(horaEntrada, estado),
        materiales!materialId(precios_material(precio, vigenciaHasta))
      `)
      .gte('pesajes.horaEntrada', inicio)
      .lt('pesajes.horaEntrada', fin)
      .eq('pesajes.estado', 'OK'),
  ]);

  const lista = matMes ?? [];
  const rechazos    = +lista.reduce((a, r) => a + Number(r.rechazo  ?? 0), 0).toFixed(2);
  const aprovechado = +(lista.reduce((a, r) => a + Number(r.pesoNeto ?? 0), 0) - rechazos).toFixed(2);

  const liquidado = (preciosMes ?? []).reduce((acc, pm) => {
    const precioVigente = (pm.materiales?.precios_material ?? [])
      .filter((p) => !p.vigenciaHasta)
      .sort((a, b) => new Date(b.vigenciaDesde) - new Date(a.vigenciaDesde))[0];
    const precio = Number(precioVigente?.precio ?? 0);
    const kg = Number(pm.pesoNeto ?? 0) - Number(pm.rechazo ?? 0);
    return acc + (kg > 0 ? kg * precio : 0);
  }, 0);

  return {
    aprovechado:         { valor: aprovechado,         unidad: 'kg',  delta: '+8%',  dir: 'up'   },
    recicladoresActivos: { valor: recActivos ?? 0,                    delta: '0',    dir: 'up'   },
    rechazos:            { valor: rechazos,            unidad: 'kg',  delta: '-3%',  dir: 'down' },
    liquidado:           { valor: Math.round(liquidado), unidad: 'COP', delta: '+12%', dir: 'up' },
  };
}

async function computeActividad() {
  const { data: pesajes } = await supabase
    .from('pesajes')
    .select(`
      id, horaEntrada, estado,
      recicladores!recicladorId(nombre, codigo),
      pesaje_materiales(pesoNeto, materiales!materialId(nombre, icono))
    `)
    .order('createdAt', { ascending: false })
    .limit(8);

  return (pesajes ?? []).map((p) => {
    const pesoTotal = (p.pesaje_materiales ?? []).reduce((a, m) => a + Number(m.pesoNeto ?? 0), 0);
    const nombre    = p.recicladores?.nombre ?? '??';
    return {
      initials:   nombre.split(' ').slice(0, 2).map((n) => n[0]).join(''),
      nombre,
      codigo:     p.recicladores?.codigo ?? '—',
      materiales: (p.pesaje_materiales ?? []).map((m) => m.materiales?.nombre ?? '').join(', '),
      kg:         pesoTotal.toFixed(1),
      hora:       p.horaEntrada,
      estado:     p.estado,
    };
  });
}

async function computeComposicion() {
  const { inicio, fin } = getMesActual();

  const { data: raw } = await supabase
    .from('pesaje_materiales')
    .select('pesoNeto, materiales!materialId(nombre, icono), pesajes!pesajeId(horaEntrada, estado)')
    .gte('pesajes.horaEntrada', inicio)
    .lt('pesajes.horaEntrada', fin)
    .eq('pesajes.estado', 'OK');

  const map = new Map();
  for (const pm of raw ?? []) {
    const key = pm.materiales?.nombre ?? 'Desconocido';
    if (!map.has(key)) map.set(key, { nombre: key, icono: pm.materiales?.icono, kg: 0 });
    map.get(key).kg += Number(pm.pesoNeto ?? 0);
  }

  const total = Array.from(map.values()).reduce((a, m) => a + m.kg, 0);
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
  const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - 7 * 8); inicio.setHours(0, 0, 0, 0);

  const { data: pesajes } = await supabase
    .from('pesaje_materiales')
    .select('pesoNeto, pesajes!pesajeId(horaEntrada, estado)')
    .gte('pesajes.horaEntrada', inicio.toISOString())
    .eq('pesajes.estado', 'OK');

  const semanas = Array.from({ length: 8 }, (_, i) => {
    const finSem = new Date(hoy); finSem.setDate(hoy.getDate() - i * 7);
    const iniSem = new Date(finSem); iniSem.setDate(finSem.getDate() - 6); iniSem.setHours(0, 0, 0, 0);
    finSem.setHours(23, 59, 59, 999);
    return { label: `S${8 - i}`, kg: 0, inicio: iniSem, fin: finSem };
  }).reverse();

  for (const pm of pesajes ?? []) {
    const fecha = new Date(pm.pesajes?.horaEntrada);
    const sem   = semanas.find((s) => fecha >= s.inicio && fecha <= s.fin);
    if (sem) sem.kg += Number(pm.pesoNeto ?? 0);
  }

  return semanas.map((s) => ({
    label: s.label, kg: s.kg,
    inicio: s.inicio.toISOString().slice(0, 10),
    fin:    s.fin.toISOString().slice(0, 10),
  }));
}

// ─── Handlers ────────────────────────────────────────────────────────────────
async function kpis(_req, res) {
  try { res.json(await computeKpis()); }
  catch (err) { console.error('[dashboard.kpis]', err); res.status(500).json({ error: 'Error KPIs' }); }
}
async function actividadReciente(_req, res) {
  try { res.json(await computeActividad()); }
  catch (err) { console.error('[dashboard.actividad]', err); res.status(500).json({ error: 'Error actividad' }); }
}
async function composicionMaterial(_req, res) {
  try { res.json(await computeComposicion()); }
  catch (err) { console.error('[dashboard.composicion]', err); res.status(500).json({ error: 'Error composición' }); }
}
async function tendenciaSemanal(_req, res) {
  try { res.json(await computeTendencia()); }
  catch (err) { console.error('[dashboard.tendencia]', err); res.status(500).json({ error: 'Error tendencia' }); }
}
async function all(_req, res) {
  try {
    const [kpisData, actividad, composicion, tendencia] = await Promise.all([
      computeKpis(), computeActividad(), computeComposicion(), computeTendencia(),
    ]);
    res.json({ kpis: kpisData, actividad, composicion, tendencia });
  } catch (err) {
    console.error('[dashboard.all]', err);
    res.status(500).json({ error: 'Error dashboard' });
  }
}

module.exports = {
  kpis, actividadReciente, composicionMaterial, tendenciaSemanal, all,
  computeKpis, computeActividad, computeComposicion, computeTendencia,
};