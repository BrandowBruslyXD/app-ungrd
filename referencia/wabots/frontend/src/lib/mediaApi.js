import api from './api';

// Encapsula las llamadas REST al archivo de media (audios/imágenes) por
// empresa. El payload real viene en res.data.data; el binario retorna directo.

export async function listTenantMedia(tenantId) {
  const { data } = await api.get(`/tenants/${tenantId}/media`);
  return data.data;
}

// Descarga el binario (audio OGG / imagen) para reproducirlo o mostrarlo.
export async function fetchMediaBlob(path) {
  const res = await api.get('/admin/preview-media/item', {
    params: { path },
    responseType: 'blob',
  });
  return res.data;
}

// Elimina el archivo definitivamente (disco + base de datos).
export async function deleteMedia(path) {
  const { data } = await api.delete('/admin/preview-media/item', { params: { path } });
  return data?.data;
}
