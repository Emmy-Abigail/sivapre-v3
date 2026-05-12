// services/db.ts — SQLite local queue for offline-first report submission
//
// This is NOT a replica of PostgreSQL. It is a temporary holding queue:
// - Reports land here first (always, online or offline).
// - The sync engine processes them and marks them 'enviado'.
// - Sent records older than 7 days are pruned automatically.
// - Observability fields (http_status, server_response, retry_count) exist
//   solely for debugging during the pilot, not for application logic.

import * as SQLite from 'expo-sqlite';
import type { TipoLugar, TipoObjeto, ObservaLarvas, ConocimientoDengue } from '../types';

export type PendingReportStatus = 'pendiente' | 'enviando' | 'enviado' | 'fallido';

export interface PendingReport {
  id: number;
  local_id: string;
  device_id: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  foto_local_uri: string | null;
  foto_url: string | null;
  tipo_lugar: TipoLugar;
  tipo_objeto: TipoObjeto;
  observa_larvas: ObservaLarvas;
  conocimiento_dengue_cercano: ConocimientoDengue | null;
  comentarios: string | null;
  estado: PendingReportStatus;
  created_at: string;
  updated_at: string;
  last_sync_attempt: string | null;
  http_status: number | null;
  server_response: string | null;
  retry_count: number;
}

const db = SQLite.openDatabaseSync('sivapre.db');

export function initDb(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS pending_reports (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id                    TEXT    NOT NULL UNIQUE,
      device_id                   TEXT    NOT NULL,
      latitud                     REAL    NOT NULL,
      longitud                    REAL    NOT NULL,
      direccion                   TEXT,
      foto_local_uri              TEXT,
      foto_url                    TEXT,
      tipo_lugar                  TEXT    NOT NULL,
      tipo_objeto                 TEXT    NOT NULL,
      observa_larvas              TEXT    NOT NULL,
      conocimiento_dengue_cercano TEXT,
      comentarios                 TEXT,
      estado                      TEXT    NOT NULL DEFAULT 'pendiente',
      created_at                  TEXT    NOT NULL,
      updated_at                  TEXT    NOT NULL,
      last_sync_attempt           TEXT,
      http_status                 INTEGER,
      server_response             TEXT,
      retry_count                 INTEGER NOT NULL DEFAULT 0
    );
    -- Migración en caliente: agrega la columna si no existe (para installs
    -- previas que ya tienen la tabla sin el campo direccion).
    ALTER TABLE pending_reports ADD COLUMN IF NOT EXISTS direccion TEXT;
  `);

  // Records stuck in 'enviando' mean the app crashed mid-sync. Reset them so
  // they are picked up on the next sync instead of being silently abandoned.
  db.runSync(
    `UPDATE pending_reports SET estado = 'pendiente', updated_at = ? WHERE estado = 'enviando'`,
    [new Date().toISOString()],
  );
}

// ─── Write operations ─────────────────────────────────────────────────────────

export function insertPendingReport(report: {
  local_id: string;
  device_id: string;
  latitud: number;
  longitud: number;
  direccion: string | null;
  foto_local_uri: string | null;
  tipo_lugar: TipoLugar;
  tipo_objeto: TipoObjeto;
  observa_larvas: ObservaLarvas;
  conocimiento_dengue_cercano: ConocimientoDengue | null;
  comentarios: string | null;
}): void {
  const now = new Date().toISOString();
  db.runSync(
    `INSERT OR IGNORE INTO pending_reports
       (local_id, device_id, latitud, longitud, direccion, foto_local_uri, foto_url,
        tipo_lugar, tipo_objeto, observa_larvas, conocimiento_dengue_cercano,
        comentarios, estado, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
    [
      report.local_id,
      report.device_id,
      report.latitud,
      report.longitud,
      report.direccion,
      report.foto_local_uri,
      report.tipo_lugar,
      report.tipo_objeto,
      report.observa_larvas,
      report.conocimiento_dengue_cercano,
      report.comentarios,
      now,
      now,
    ],
  );
}

export function markAsSending(id: number): void {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE pending_reports
     SET estado = 'enviando', updated_at = ?, last_sync_attempt = ?
     WHERE id = ?`,
    [now, now, id],
  );
}

export function markAsSent(id: number, httpStatus: number, serverResponse: string): void {
  db.runSync(
    `UPDATE pending_reports
     SET estado = 'enviado', updated_at = ?, http_status = ?, server_response = ?
     WHERE id = ?`,
    [new Date().toISOString(), httpStatus, serverResponse, id],
  );
}

export function markAsFailed(
  id: number,
  httpStatus: number | null,
  serverResponse: string | null,
): void {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE pending_reports
     SET estado = 'fallido', updated_at = ?, last_sync_attempt = ?,
         http_status = ?, server_response = ?, retry_count = retry_count + 1
     WHERE id = ?`,
    [now, now, httpStatus, serverResponse, id],
  );
}

export function updateFotoUrl(localId: string, fotoUrl: string): void {
  db.runSync(
    `UPDATE pending_reports SET foto_url = ?, updated_at = ? WHERE local_id = ?`,
    [fotoUrl, new Date().toISOString(), localId],
  );
}

// ─── Read operations ──────────────────────────────────────────────────────────

// Máximo de reintentos antes de abandonar un reporte.
// Un reporte en 'fallido' con retry_count >= MAX_RETRY_COUNT ya no se procesa.
// Queda en SQLite como registro de debugging y se limpia a los 7 días.
// Razón: un error 422 (validación) nunca va a resolverse solo — reintentar
// infinitamente satura el backend y el dispositivo sin ningún beneficio.
export const MAX_RETRY_COUNT = 10;

export function getPendingAndFailedReports(): PendingReport[] {
  return db.getAllSync<PendingReport>(
    `SELECT * FROM pending_reports
     WHERE estado IN ('pendiente', 'fallido')
       AND retry_count < ?
     ORDER BY created_at ASC`,
    [MAX_RETRY_COUNT],
  );
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export function cleanOldSentReports(daysOld = 7): void {
  const cutoff = new Date(Date.now() - daysOld * 86_400_000).toISOString();
  db.runSync(
    `DELETE FROM pending_reports WHERE estado = 'enviado' AND updated_at < ?`,
    [cutoff],
  );
}
