"""
Seed script for SIVAPRE demo data.

Run from the backend/ directory:
    python seed.py

Requires Docker running with PostgreSQL on localhost:5433.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg

import os
_host = os.getenv("POSTGRES_HOST", "localhost")
_port = os.getenv("POSTGRES_PORT", "5433") if _host == "localhost" else "5432"
DB_DSN = f"postgresql://sivapre:sivapre_secret@{_host}:{_port}/sivapre_db"
ADMIN_EMAIL = "admin@sivapre.pe"

TIPOS_LUGAR = ["Casa", "Depósito", "Parque", "Mercado", "Escuela", "Hospital", "Terreno", "Cementerio"]
TIPOS_OBJETO = ["Llanta", "Lata", "Barril", "Maceta", "Balde", "Tanque", "Poceta", "Tarro"]
ESTADOS = ["enviado", "en_revision", "verificado", "resuelto"]
LARVAS_OPTS = ["si", "no", "no_seguro"]
DISTRITOS = ["IQUITOS", "PUNCHANA", "BELEN", "SAN JUAN BAUTISTA"]
COORDENADAS = {
    "IQUITOS":            (-3.7437, -73.2516),
    "PUNCHANA":           (-3.7043, -73.2483),
    "BELEN":              (-3.7757, -73.2516),
    "SAN JUAN BAUTISTA":  (-3.7634, -73.3012),
}

SE_ACTUAL = 16
ANO_ACTUAL = 2026


def rand_coord(base_lat: float, base_lng: float, scale: float = 0.012) -> tuple[float, float]:
    return (
        base_lat + random.uniform(-scale, scale),
        base_lng + random.uniform(-scale, scale),
    )


def days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


async def seed() -> None:
    conn = await asyncpg.connect(DB_DSN)

    try:
        # ── Obtener usuario admin ────────────────────────────────────────
        row = await conn.fetchrow("SELECT id FROM usuarios WHERE email = $1", ADMIN_EMAIL)
        if row is None:
            print(f"ERROR: No se encontró el usuario '{ADMIN_EMAIL}'.")
            print("Regístralo primero con:")
            print(
                "  curl -X POST http://localhost:8000/api/v1/auth/register "
                '-H "Content-Type: application/json" '
                f'-d \'{{"nombre":"Admin SIVAPRE","email":"{ADMIN_EMAIL}","password":"admin1234"}}\''
            )
            return

        admin_id: str = str(row["id"])
        print(f"Usuario encontrado: {admin_id}")

        # ── Reportes (criaderos) ─────────────────────────────────────────
        inserted_r = 0
        for i in range(30):
            distrito = random.choice(DISTRITOS)
            base_lat, base_lng = COORDENADAS[distrito]
            lat, lng = rand_coord(base_lat, base_lng)
            estado = random.choices(ESTADOS, weights=[4, 3, 2, 1])[0]
            larvas = random.choices(LARVAS_OPTS, weights=[3, 5, 2])[0]
            fecha = days_ago(random.randint(0, 29))

            try:
                await conn.execute(
                    """
                    INSERT INTO reportes_app
                        (id, usuario_id, latitud, longitud, tipo_lugar, tipo_objeto,
                         observa_larvas, estado, fecha_reporte, fecha_actualizacion)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    uuid.uuid4(),
                    uuid.UUID(admin_id),
                    lat,
                    lng,
                    random.choice(TIPOS_LUGAR),
                    random.choice(TIPOS_OBJETO),
                    larvas,
                    estado,
                    fecha,
                )
                inserted_r += 1
            except Exception as e:
                print(f"  reporte {i}: {e}")

        print(f"Reportes insertados: {inserted_r}/30")

        # ── Casos NOTI ───────────────────────────────────────────────────
        inserted_n = 0
        for i in range(20):
            distrito = random.choice(DISTRITOS)
            se = SE_ACTUAL - random.randint(0, 11)
            tipo = random.choices(["C", "P", "S"], weights=[2, 4, 4])[0]
            sexo = random.choice(["M", "F"])
            fecha = days_ago(random.randint(0, 84))
            caso_id = f"NOTI-{ANO_ACTUAL}-{i+1:04d}"

            try:
                await conn.execute(
                    """
                    INSERT INTO casos_noti
                        (id, id_caso_noti, departamento, provincia, distrito, ubigeo,
                         enfermedad, ano_epidemiologico, semana_epidemiologica,
                         tipo_diagnostico, diresa_notifica, edad, sexo, fecha_creacion)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                    ON CONFLICT (id_caso_noti) DO NOTHING
                    """,
                    uuid.uuid4(),
                    caso_id,
                    "LORETO",
                    "MAYNAS",
                    distrito,
                    "160101",
                    "DENGUE",
                    ANO_ACTUAL,
                    se,
                    tipo,
                    "DIRESA LORETO",
                    random.randint(5, 75),
                    sexo,
                    fecha,
                )
                inserted_n += 1
            except Exception as e:
                print(f"  caso_noti {i}: {e}")

        print(f"Casos NOTI insertados: {inserted_n}/20")

        # ── Casos NETLAB ─────────────────────────────────────────────────
        inserted_l = 0
        for i in range(15):
            distrito = random.choice(DISTRITOS)
            positivo = random.random() < 0.6
            dx = "Positivo" if positivo else "Negativo"
            serotipo = random.choice(["DENV-1", "DENV-2", "DENV-3", None]) if positivo else None
            elisa = random.choice(["Reactivo", "No reactivo"]) if positivo else "No reactivo"
            fecha_corte = days_ago(random.randint(0, 60))
            fecha_validado = fecha_corte + timedelta(days=random.randint(1, 5)) if positivo else None
            muestra_id = f"NL-{ANO_ACTUAL}-{i+1:05d}"

            try:
                await conn.execute(
                    """
                    INSERT INTO casos_netlab
                        (id, id_muestra_netlab, fecha_corte,
                         departamento_paciente, provincia_paciente, distrito_paciente,
                         ubigeo_paciente, edad_paciente, sexo_paciente,
                         nombre_examen, dx_molecular_dengue, serotipo_dengue,
                         elisa_ns1, fecha_validado, fecha_creacion)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                    ON CONFLICT (id_muestra_netlab) DO NOTHING
                    """,
                    uuid.uuid4(),
                    muestra_id,
                    fecha_corte,
                    "LORETO",
                    "MAYNAS",
                    distrito,
                    "160101",
                    random.randint(5, 75),
                    random.choice(["M", "F"]),
                    "RT-PCR Dengue",
                    dx,
                    serotipo,
                    elisa,
                    fecha_validado,
                    fecha_corte,
                )
                inserted_l += 1
            except Exception as e:
                print(f"  caso_netlab {i}: {e}")

        print(f"Casos NETLAB insertados: {inserted_l}/15")
        print("\nSeed completado.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed())
