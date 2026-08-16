// Sección "Archivos y media" de la ficha de empresa: tabla con los audios e
// imágenes archivados del tenant, con reproducción/vista inline (una sola fila
// expandida a la vez, descargando el binario como blob) y borrado definitivo.
import { useEffect, useRef, useState } from 'react';
import useAsync from '../../hooks/useAsync';
import { listTenantMedia, fetchMediaBlob, deleteMedia } from '../../lib/mediaApi';
import AudioPlayer from '../../flow/AudioPlayer';
import Section from './Section';

// Tamaño legible en B/KB/MB.
function fmtBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

// Fecha corta local (dd/mm/aa hh:mm).
function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MediaSection({ tenantId }) {
  const { data, loading, error, reload } = useAsync(() => listTenantMedia(tenantId), [tenantId]);
  const items = Array.isArray(data) ? data : [];

  // Fila expandida: { id, kind, url } cuando el blob ya está listo.
  const [open, setOpen] = useState(null);
  const [openLoadingId, setOpenLoadingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Referencia al objectURL vigente para revocarlo al cambiar de fila,
  // al cerrar o al desmontar (evita fugas de memoria del blob).
  const urlRef = useRef(null);
  const swapObjectUrl = (url) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url || null;
  };
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // Marca de la última petición de blob: descarta respuestas fuera de orden
  // cuando el usuario cambia de fila antes de que termine la descarga anterior.
  const reqRef = useRef(0);

  const closeRow = () => {
    reqRef.current += 1;
    swapObjectUrl(null);
    setOpen(null);
  };

  const toggleRow = async (item) => {
    setActionError(null);
    // Segundo clic sobre la misma fila: se cierra.
    if (open?.id === item.id) {
      closeRow();
      return;
    }
    const reqId = reqRef.current + 1;
    reqRef.current = reqId;
    setOpenLoadingId(item.id);
    try {
      const blob = await fetchMediaBlob(item.path);
      if (reqRef.current !== reqId) return; // Llegó tarde: otra fila ya manda.
      const url = URL.createObjectURL(blob);
      swapObjectUrl(url); // Revoca el URL de la fila anterior antes de mostrar el nuevo.
      setOpen({ id: item.id, kind: item.kind, url });
    } catch (err) {
      if (reqRef.current === reqId) {
        setActionError(err?.response?.data?.message || 'No se pudo cargar el archivo');
      }
    } finally {
      setOpenLoadingId((prev) => (prev === item.id ? null : prev));
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('¿Eliminar este archivo definitivamente?')) return;
    setActionError(null);
    try {
      await deleteMedia(item.path);
      if (open?.id === item.id) closeRow();
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'No se pudo eliminar el archivo');
    }
  };

  return (
    <Section
      title="Archivos y media"
      description="Audios e imágenes archivados de las conversaciones y pruebas del editor."
      actions={
        <button
          className="btn-ghost"
          onClick={reload}
          disabled={loading}
          aria-label="Recargar la lista de archivos"
        >
          ↻
        </button>
      }
    >
      {loading && <div className="text-sm text-slate-500">Cargando archivos…</div>}
      {error && (
        <div className="text-sm text-danger-dark">
          {error?.response?.data?.message || 'No se pudieron cargar los archivos'}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-500">Sin archivos archivados todavía.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="scroll-x">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Contacto</th>
                <th className="px-3 py-2 text-right font-medium">Tamaño</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {items.map((item) => {
                const esAudio = item?.kind === 'audio';
                const esPrueba = !item?.contactPhone || item?.origin === 'prueba';
                const expanded = open?.id === item?.id;
                return (
                  <FragmentRow
                    key={item?.id}
                    item={item}
                    esAudio={esAudio}
                    esPrueba={esPrueba}
                    expanded={expanded}
                    open={open}
                    loadingRow={openLoadingId === item?.id}
                    onToggle={toggleRow}
                    onDelete={handleDelete}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {actionError && <div className="text-sm text-danger-dark">{actionError}</div>}

      <p className="text-xs text-slate-500">
        Solo se archivan los audios e imágenes que el bot procesa (audios convertidos a OGG
        liviano). Se depuran automáticamente a los 7 días.
      </p>
    </Section>
  );
}

// Fila de la tabla + fila expandida opcional (reproductor de audio o imagen).
// A nivel de módulo para conservar su identidad entre renders.
function FragmentRow({ item, esAudio, esPrueba, expanded, open, loadingRow, onToggle, onDelete }) {
  return (
    <>
      <tr className="text-slate-700">
        <td className="px-3 py-2.5">
          <span aria-hidden="true">{esAudio ? '🎵' : '🖼️'}</span>{' '}
          <span className="text-slate-900">{esAudio ? 'Audio' : 'Imagen'}</span>
        </td>
        <td className="px-3 py-2.5">
          {esPrueba ? <span className="text-slate-500">Prueba del editor</span> : item.contactPhone}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{fmtBytes(item?.bytes)}</td>
        <td className="px-3 py-2.5">{fmtFecha(item?.createdAt)}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center justify-end gap-2">
            <button
              className="btn-ghost px-3 py-1.5"
              onClick={() => onToggle(item)}
              disabled={loadingRow}
              aria-label={
                expanded
                  ? 'Ocultar el archivo'
                  : esAudio
                    ? 'Reproducir el audio'
                    : 'Ver la imagen'
              }
            >
              {loadingRow ? '…' : expanded ? '✕' : esAudio ? '▶ Reproducir' : '▶ Ver'}
            </button>
            <button
              className="btn-ghost px-3 py-1.5 text-danger-dark"
              onClick={() => onDelete(item)}
              aria-label="Eliminar este archivo definitivamente"
            >
              🗑
            </button>
          </div>
        </td>
      </tr>
      {expanded && open?.url && (
        <tr>
          <td colSpan={5} className="bg-slate-50/70 px-3 py-3">
            {open.kind === 'audio' ? (
              <AudioPlayer src={open.url} />
            ) : (
              <img
                src={open.url}
                alt={`Imagen archivada de ${esPrueba ? 'prueba del editor' : item.contactPhone}`}
                className="max-h-64 rounded-lg border border-slate-200/80"
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
