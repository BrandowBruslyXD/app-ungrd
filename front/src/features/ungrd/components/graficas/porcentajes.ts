/**
 * Reparte 100 puntos porcentuales entre los valores, sin que la suma se salga
 * por el redondeo.
 *
 * Redondear cada parte por su cuenta produce «34 + 33 + 34 = 101», y un total
 * que no da 100 en una gráfica que promete el 100 % la desacredita entera. Se
 * reparte por resto mayor, y solo entre las partes que tienen algo: un nivel en
 * cero nunca puede aparecer con 1 %.
 *
 * Vive fuera del componente porque es cálculo puro y se prueba solo, sin montar
 * nada en pantalla.
 */
export function porcentajesEnteros(valores: readonly number[], total: number): number[] {
  if (total <= 0) return valores.map(() => 0);

  const exactos = valores.map((valor) => (valor / total) * 100);
  const enteros = exactos.map((valor) => Math.floor(valor));
  const candidatos = exactos
    .map((valor, indice) => ({ indice, resto: valor - Math.floor(valor) }))
    .filter(({ indice }) => valores[indice] > 0)
    .sort((a, b) => (b.resto !== a.resto ? b.resto - a.resto : a.indice - b.indice));

  let faltan = 100 - enteros.reduce((suma, valor) => suma + valor, 0);
  for (let i = 0; faltan > 0 && candidatos.length > 0; i += 1) {
    enteros[candidatos[i % candidatos.length].indice] += 1;
    faltan -= 1;
  }

  return enteros;
}
