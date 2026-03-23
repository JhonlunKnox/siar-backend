const prisma = require('../lib/prisma');

async function listar(_req, res) {
  const reportes = await prisma.reporteSUI.findMany({
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    select: {
      id: true,
      periodo: true,
      anio: true,
      mes: true,
      estado: true,
      fechaEnvio: true,
      createdAt: true,
    },
  });

  res.json(reportes);
}

async function obtener(req, res) {
  const reporte = await prisma.reporteSUI.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(reporte);
}

async function obtenerPorMes(req, res) {
  const [anioStr, mesStr] = req.params.yyyymm.split('-');
  const reporte = await prisma.reporteSUI.findUnique({
    where: { anio_mes: { anio: Number(anioStr), mes: Number(mesStr) } },
  });

  if (!reporte) return res.status(404).json({ error: 'No hay reporte para ese periodo' });
  res.json(reporte);
}

async function crear(req, res) {
  const { anio, mes, registro13, registro14 } = req.body;
  const periodo = `${anio}-${String(mes).padStart(2, '0')}`;

  const existe = await prisma.reporteSUI.findUnique({ where: { anio_mes: { anio, mes } } });
  if (existe) {
    return res.status(409).json({
      error: `Ya existe un reporte para ${periodo}`,
      reporteId: existe.id,
    });
  }

  const reporte = await prisma.reporteSUI.create({
    data: { periodo, anio, mes, registro13, registro14, operadorId: req.user.sub },
  });

  res.status(201).json(reporte);
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const reporte = await prisma.reporteSUI.findUnique({ where: { id } });
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

  if (reporte.estado === 'enviado' || reporte.estado === 'validado') {
    return res.status(409).json({ error: 'No se puede editar un reporte ya enviado o validado' });
  }

  const actualizado = await prisma.reporteSUI.update({
    where: { id },
    data: req.body,
  });

  res.json(actualizado);
}

async function enviar(req, res) {
  const id = Number(req.params.id);
  const reporte = await prisma.reporteSUI.findUnique({ where: { id } });
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

  if (reporte.estado === 'enviado') {
    return res.status(409).json({ error: 'El reporte ya fue enviado' });
  }

  if (!reporte.registro13 || !reporte.registro14) {
    return res.status(422).json({ error: 'El reporte debe tener Registro 13 y 14 completos antes de enviar' });
  }

  const actualizado = await prisma.reporteSUI.update({
    where: { id },
    data: { estado: 'enviado', fechaEnvio: new Date() },
  });

  res.json({
    mensaje: 'Reporte marcado como enviado al SUI',
    reporte: actualizado,
  });
}

async function generarXML(req, res) {
  const id = Number(req.params.id);
  const reporte = await prisma.reporteSUI.findUnique({ where: { id } });
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });

  const r13 = reporte.registro13 ?? {};
  const r14 = reporte.registro14 ?? {};

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReporteSUI>
  <Cabecera>
    <Periodo>${reporte.periodo}</Periodo>
    <FechaGeneracion>${new Date().toISOString()}</FechaGeneracion>
    <Estado>${reporte.estado}</Estado>
  </Cabecera>
  <Registro13>
    <MaterialAprovechado unidad="kg">${r13.materialAprovechado ?? 0}</MaterialAprovechado>
    <Rechazos unidad="kg">${r13.rechazos ?? 0}</Rechazos>
    <NumeroRecicladores>${r13.numRecicladores ?? 0}</NumeroRecicladores>
    <ECARegistrada>${r13.ecaRegistrada ? 'SI' : 'NO'}</ECARegistrada>
    <NumeroRutas>${r13.numRutas ?? 0}</NumeroRutas>
    <PeriodoInicio>${r13.periodoInicio ?? ''}</PeriodoInicio>
    <PeriodoFin>${r13.periodoFin ?? ''}</PeriodoFin>
  </Registro13>
  <Registro14>
    <TotalLiquidado moneda="COP">${r14.totalLiquidado ?? 0}</TotalLiquidado>
    <RecicladoresConIngresos>${r14.recicladoresConIngresos ?? 0}</RecicladoresConIngresos>
    <TotalRecicladores>${r14.totalRecicladores ?? 0}</TotalRecicladores>
    <TasaAprovechamiento>${r14.tasaAprovechamiento ?? 0}</TasaAprovechamiento>
    <PromedioPorReciclador>${r14.promedioPorReciclador ?? 0}</PromedioPorReciclador>
    <Quejas>${r14.quejas ?? 0}</Quejas>
  </Registro14>
</ReporteSUI>`;

  res.set('Content-Type', 'application/xml');
  res.set('Content-Disposition', `attachment; filename="SUI-${reporte.periodo}.xml"`);
  res.send(xml);
}

module.exports = { listar, obtener, obtenerPorMes, crear, actualizar, enviar, generarXML };
