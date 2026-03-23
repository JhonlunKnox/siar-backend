/**
 * reset-db.js — Limpia todos los datos operacionales de la BD.
 * Conserva: Usuario (para poder iniciar sesión) y Material (catálogo base).
 * Uso: node scripts/reset-db.js
 */

const prisma = require('../src/lib/prisma');

async function main() {
  console.log('🗑  Iniciando reset de base de datos...\n');

  // 1. Tablas que dependen de otras primero
  const r1 = await prisma.balanceAjuste.deleteMany();
  console.log(`✓ BalanceAjuste:    ${r1.count} registros eliminados`);

  const r2 = await prisma.balanceMes.deleteMany();
  console.log(`✓ BalanceMes:       ${r2.count} registros eliminados`);

  const r3 = await prisma.pQR.deleteMany();
  console.log(`✓ PQR:              ${r3.count} registros eliminados`);

  const r4 = await prisma.reporteSUI.deleteMany();
  console.log(`✓ ReporteSUI:       ${r4.count} registros eliminados`);

  const r5 = await prisma.pesajeMaterial.deleteMany();
  console.log(`✓ PesajeMaterial:   ${r5.count} registros eliminados`);

  const r6 = await prisma.pesaje.deleteMany();
  console.log(`✓ Pesaje:           ${r6.count} registros eliminados`);

  const r7 = await prisma.precioMaterial.deleteMany();
  console.log(`✓ PrecioMaterial:   ${r7.count} registros eliminados`);

  const r8 = await prisma.reciclador.deleteMany();
  console.log(`✓ Reciclador:       ${r8.count} registros eliminados`);

  const r9 = await prisma.ruta.deleteMany();
  console.log(`✓ Ruta:             ${r9.count} registros eliminados`);

  console.log('\n✅ Reset completado. Se conservaron: Usuario y Material.');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
