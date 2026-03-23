const prisma = require('../lib/prisma');

async function obtenerMes(req, res) {
  const [anioStr, mesStr] = req.params.yyyymm.split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);

  const registros = await prisma.balanceMes.findMany({
    where: { anio, mes },
    include: { ajustes: true },
    orderBy: { materialId: 'asc' },
  });

  // Enriquecer con nombre del material
  const materialIds = [...new Set(registros.map((r) => r.materialId))];
  const materiales = await prisma.material.findMany({
    where: { id: { in: materialIds } },
    select: { id: true, nombre: true, codigo: true, icono: true },
  });
  const matMap = Object.fromEntries(materiales.map((m) => [m.id, m]));

  const totalIngresado = registros.reduce((acc, r) => acc + Number(r.ingresado), 0);
  const totalVendido   = registros.reduce((acc, r) => acc + Number(r.vendido), 0);
  const totalRechazos  = registros.reduce((acc, r) => acc + Number(r.rechazos), 0);
  const balanceOK = Math.abs(totalIngresado - (totalVendido + totalRechazos)) < 0.01;

  res.json({
    periodo: `${anio}-${String(mes).padStart(2, '0')}`,
    resumen: {
      ingresado: totalIngresado,
      vendido: totalVendido,
      rechazos: totalRechazos,
      diferencia: totalIngresado - (totalVendido + totalRechazos),
      balanceOK,
    },
    detalle: registros.map((r) => ({
      id: r.id,
      material: matMap[r.materialId] ?? { id: r.materialId, nombre: 'Desconocido' },
      ingresado: Number(r.ingresado),
      vendido: Number(r.vendido),
      rechazos: Number(r.rechazos),
      diferencia: Number(r.ingresado) - (Number(r.vendido) + Number(r.rechazos)),
      balanceOK: Math.abs(Number(r.ingresado) - (Number(r.vendido) + Number(r.rechazos))) < 0.01,
      cerrado: r.cerrado,
      ajustes: r.ajustes,
    })),
  });
}

async function recalcularDesdePesajes(req, res) {
  const [anioStr, mesStr] = req.params.yyyymm.split('-');
  const anio = Number(anioStr);
  const mes = Number(mesStr);

  const inicio = new Date(anio, mes - 1, 1);
  const fin = new Date(anio, mes, 1);

  const pesajesMat = await prisma.pesajeMaterial.groupBy({
    by: ['materialId'],
    where: { pesaje: { horaEntrada: { gte: inicio, lt: fin } } },
    _sum: { pesoNeto: true, rechazo: true },
  });

  const pesajesOK = await prisma.pesajeMaterial.groupBy({
    by: ['materialId'],
    where: { pesaje: { horaEntrada: { gte: inicio, lt: fin }, estado: 'OK' } },
    _sum: { pesoNeto: true, rechazo: true },
  });

  const okMap = Object.fromEntries(pesajesOK.map((p) => [p.materialId, {
    pesoNeto: Number(p._sum.pesoNeto ?? 0),
    rechazo:  Number(p._sum.rechazo  ?? 0),
  }]));

  const actualizaciones = [];
  for (const pm of pesajesMat) {
    const ingresado = Number(pm._sum.pesoNeto ?? 0);
    const rechazos  = Number(pm._sum.rechazo ?? 0);
    const vendido   = (okMap[pm.materialId]?.pesoNeto ?? 0) - (okMap[pm.materialId]?.rechazo ?? 0);

    actualizaciones.push(
      prisma.balanceMes.upsert({
        where: { anio_mes_materialId: { anio, mes, materialId: pm.materialId } },
        create: { anio, mes, materialId: pm.materialId, ingresado, vendido, rechazos },
        update: { ingresado, vendido, rechazos },
      })
    );
  }

  await Promise.all(actualizaciones);
  res.json({ mensaje: 'Balance recalculado desde pesajes', actualizados: actualizaciones.length });
}

async function ajusteManual(req, res) {
  const { materialId, anio, mes, cantidad, tipo, motivo } = req.body;

  let balance = await prisma.balanceMes.findUnique({
    where: { anio_mes_materialId: { anio, mes, materialId } },
  });

  if (!balance) {
    balance = await prisma.balanceMes.create({
      data: { anio, mes, materialId, ingresado: 0, vendido: 0, rechazos: 0 },
    });
  }

  if (balance.cerrado) {
    return res.status(409).json({ error: 'El periodo está cerrado y no admite ajustes' });
  }

  const ajuste = await prisma.balanceAjuste.create({
    data: { balanceId: balance.id, cantidad, tipo, motivo, operadorId: req.user.sub },
  });

  const delta = tipo === 'entrada' ? Number(cantidad) : -Number(cantidad);
  await prisma.balanceMes.update({
    where: { id: balance.id },
    data: { ingresado: { increment: delta } },
  });

  res.status(201).json(ajuste);
}

module.exports = { obtenerMes, recalcularDesdePesajes, ajusteManual };
