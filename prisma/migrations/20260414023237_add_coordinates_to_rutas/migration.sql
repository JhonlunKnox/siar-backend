-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('reciclador_oficio', 'operador_eca', 'admin_asociacion');

-- CreateEnum
CREATE TYPE "EstadoReciclador" AS ENUM ('Activa', 'Inactivo');

-- CreateEnum
CREATE TYPE "EstadoRuta" AS ENUM ('Activa', 'Parcial', 'Inactiva');

-- CreateEnum
CREATE TYPE "TendenciaMaterial" AS ENUM ('subida', 'bajada', 'estable');

-- CreateEnum
CREATE TYPE "EstadoPesaje" AS ENUM ('OK', 'Rechazo', 'Pendiente');

-- CreateEnum
CREATE TYPE "EstadoSUI" AS ENUM ('borrador', 'enviado', 'validado', 'rechazado');

-- CreateEnum
CREATE TYPE "TipoPQR" AS ENUM ('Peticion', 'Queja', 'Reclamo');

-- CreateEnum
CREATE TYPE "EstadoPQR" AS ENUM ('Recibida', 'EnTramite', 'Respondida', 'Cerrada');

-- CreateEnum
CREATE TYPE "CanalPQR" AS ENUM ('presencial', 'email', 'telefono', 'web');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recicladores" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "nombre" TEXT NOT NULL,
    "documento" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "color" TEXT NOT NULL DEFAULT '#4caf7d',
    "tipoTransporte" TEXT,
    "estado" "EstadoReciclador" NOT NULL DEFAULT 'Activa',
    "rutaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recicladores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" SERIAL NOT NULL,
    "identificador" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "capacidadKg" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recicladorId" INTEGER NOT NULL,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutas" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "barrios" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "estado" "EstadoRuta" NOT NULL DEFAULT 'Activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "icono" TEXT NOT NULL DEFAULT '♻️',
    "unidad" TEXT NOT NULL DEFAULT 'kg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios_material" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "tendencia" "TendenciaMaterial" NOT NULL DEFAULT 'estable',
    "vigenciaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "operadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precios_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compradores" (
    "id" SERIAL NOT NULL,
    "empresa" TEXT NOT NULL,
    "materialId" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesajes" (
    "id" SERIAL NOT NULL,
    "ticket" TEXT NOT NULL,
    "recicladorId" INTEGER NOT NULL,
    "rutaId" INTEGER NOT NULL,
    "horaEntrada" TIMESTAMP(3) NOT NULL,
    "horaSalida" TIMESTAMP(3),
    "estado" "EstadoPesaje" NOT NULL DEFAULT 'Pendiente',
    "observaciones" TEXT,
    "operadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pesajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesaje_materiales" (
    "id" SERIAL NOT NULL,
    "pesajeId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "pesoNeto" DECIMAL(10,3) NOT NULL,
    "rechazo" DECIMAL(10,3) NOT NULL DEFAULT 0,

    CONSTRAINT "pesaje_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_mes" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "ingresado" DECIMAL(12,3) NOT NULL,
    "vendido" DECIMAL(12,3) NOT NULL,
    "rechazos" DECIMAL(12,3) NOT NULL,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_mes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_ajustes" (
    "id" SERIAL NOT NULL,
    "balanceId" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "operadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_sui" (
    "id" SERIAL NOT NULL,
    "periodo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "registro13" JSONB,
    "registro14" JSONB,
    "estado" "EstadoSUI" NOT NULL DEFAULT 'borrador',
    "fechaEnvio" TIMESTAMP(3),
    "operadorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reportes_sui_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pqrs" (
    "id" SERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "tipo" "TipoPQR" NOT NULL,
    "estado" "EstadoPQR" NOT NULL DEFAULT 'Recibida',
    "canal" "CanalPQR" NOT NULL DEFAULT 'web',
    "solicitanteId" INTEGER,
    "nombreSolicitante" TEXT,
    "emailSolicitante" TEXT,
    "telefonoSolicitante" TEXT,
    "descripcion" TEXT NOT NULL,
    "respuesta" TEXT,
    "operadorId" INTEGER,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pqrs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "recicladores_codigo_key" ON "recicladores"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "recicladores_usuarioId_key" ON "recicladores"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "recicladores_documento_key" ON "recicladores"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_identificador_key" ON "vehiculos"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "rutas_numero_key" ON "rutas"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_nombre_key" ON "materiales"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_codigo_key" ON "materiales"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pesajes_ticket_key" ON "pesajes"("ticket");

-- CreateIndex
CREATE UNIQUE INDEX "balance_mes_anio_mes_materialId_key" ON "balance_mes"("anio", "mes", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_sui_anio_mes_key" ON "reportes_sui"("anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "pqrs_radicado_key" ON "pqrs"("radicado");

-- AddForeignKey
ALTER TABLE "recicladores" ADD CONSTRAINT "recicladores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recicladores" ADD CONSTRAINT "recicladores_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_recicladorId_fkey" FOREIGN KEY ("recicladorId") REFERENCES "recicladores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios_material" ADD CONSTRAINT "precios_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compradores" ADD CONSTRAINT "compradores_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_recicladorId_fkey" FOREIGN KEY ("recicladorId") REFERENCES "recicladores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesajes" ADD CONSTRAINT "pesajes_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesaje_materiales" ADD CONSTRAINT "pesaje_materiales_pesajeId_fkey" FOREIGN KEY ("pesajeId") REFERENCES "pesajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesaje_materiales" ADD CONSTRAINT "pesaje_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_ajustes" ADD CONSTRAINT "balance_ajustes_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "balance_mes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
