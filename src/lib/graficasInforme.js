// Gráficas para documentos PDF (Informe de labores).
//
// Se dibujan con tablas y bloques HTML, no con SVG ni canvas: así salen iguales
// en la vista previa, al imprimir y en el PDF que arma html2pdf/html2canvas.
// Sin ejes con escala: cada barra lleva su número, y en el informe siempre hay
// una tabla con las mismas cifras al lado.
//
// Colores validados (contraste ≥ 3:1 sobre blanco y distinguibles con
// daltonismo): rosa institucional y azul medio para dos series; naranja y azul
// para la comparativa entre años, siempre con el número sobre cada barra.

import { escapeRegistroHTML as esc } from './registroActividadesReport.js';

export const COLORES = {
  enVivo: '#e91e63',
  aula: '#2f80c4',
  unaSerie: '#2f80c4',
  anioAnterior: '#e68a00',
  anioActual: '#2563eb',
};

const TEXTO = '#26364b';
const GRIS = '#63758a';
const LINEA = '#9aa9b8';

const numero = (valor) => new Intl.NumberFormat('es-GT').format(valor || 0);

export const leyenda = (series = []) => `<div style="padding:6px 0 0;font-size:9px;color:${TEXTO};text-align:center;">${series
  .map(serie => `<span style="display:inline-block;margin:0 9px;white-space:nowrap;"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${serie.color};vertical-align:-1px;margin-right:4px;"></span>${esc(serie.nombre)}</span>`)
  .join('')}</div>`;

const etiquetaValor = (valor) => `<div style="font-size:8.5px;font-weight:700;color:${TEXTO};line-height:1;padding-bottom:3px;">${numero(valor)}</div>`;

// Barras verticales. `categorias`: [{ etiqueta, valores: [n, ...] }] con un valor
// por serie. modo 'apilada' (una barra con segmentos y el total encima) o
// 'agrupada' (una barra por serie con su número).
export const graficaBarras = ({ categorias = [], series = [], modo = 'apilada', alto = 150, titulo = '' } = {}) => {
  if (!categorias.length) return '';
  const totales = categorias.map(cat => cat.valores.reduce((suma, v) => suma + (v || 0), 0));
  const maximo = modo === 'apilada'
    ? Math.max(1, ...totales)
    : Math.max(1, ...categorias.flatMap(cat => cat.valores.map(v => v || 0)));
  const util = alto - 14; // espacio para el número encima de la barra más alta
  const escala = (valor) => (valor > 0 ? Math.max(2, Math.round((valor / maximo) * util)) : 0);

  const columnas = categorias.map((cat, indice) => {
    if (modo === 'apilada') {
      // Segmentos de arriba hacia abajo: la última serie queda arriba.
      const segmentos = cat.valores
        .map((valor, i) => ({ valor: valor || 0, color: series[i]?.color }))
        .filter(seg => seg.valor > 0)
        .reverse();
      const barras = segmentos.map((seg, i) => `<div style="height:${escala(seg.valor)}px;background:${seg.color};${i === 0 ? 'border-radius:3px 3px 0 0;' : 'margin-top:2px;'}"></div>`).join('');
      return `<td style="vertical-align:bottom;height:${alto}px;padding:0 3px;text-align:center;"><div style="width:62%;margin:0 auto;">${totales[indice] ? etiquetaValor(totales[indice]) : ''}${barras}</div></td>`;
    }
    const barras = cat.valores.map((valor, i) => `<td style="vertical-align:bottom;height:${alto}px;padding:0 1px;text-align:center;">${valor ? etiquetaValor(valor) : ''}<div style="height:${escala(valor || 0)}px;background:${series[i]?.color};border-radius:3px 3px 0 0;"></div></td>`).join('');
    return `<td style="vertical-align:bottom;padding:0 5px;"><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>${barras}</tr></table></td>`;
  }).join('');

  const etiquetas = categorias.map(cat => `<td style="border-top:1px solid ${LINEA};padding:4px 1px 0;text-align:center;font-size:8.5px;color:${GRIS};line-height:1.2;">${esc(cat.etiqueta)}</td>`).join('');

  return `<div style="padding:0 0 16px;">${titulo ? `<div style="font-size:10.5px;font-weight:700;color:${TEXTO};padding-bottom:8px;">${esc(titulo)}</div>` : ''}<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>${columnas}</tr><tr>${etiquetas}</tr></table>${series.length > 1 ? leyenda(series) : ''}</div>`;
};

// Barra horizontal dentro de una celda de tabla (una sola serie).
export const barraHorizontal = (valor, maximo, color = COLORES.unaSerie) => {
  const ancho = maximo > 0 && valor > 0 ? Math.max(2, Math.round((valor / maximo) * 100)) : 0;
  return `<div style="height:9px;width:${ancho}%;background:${color};border-radius:0 3px 3px 0;"></div>`;
};
