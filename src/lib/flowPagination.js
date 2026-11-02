// Paginación de documentos con membrete (oficios, informe técnico, honorarios,
// carta de aval, informes de actividad, viáticos y Junta Directiva).
//
// Cada hoja se marca como `.flow-page` (alto fijo de carta) y su contenido
// como `.flow-content` (con el padding que respeta el membrete). Los bloques
// del contenido deben ser hijos directos de `.flow-content`.
//
// paginateFlowPages() mide en el navegador y, cuando un bloque invade el
// margen inferior (zona del pie del membrete), crea una hoja nueva con el mismo
// membrete y continúa allí el texto:
//   - Los párrafos <p> se parten por palabras (la parte superior queda justificada).
//   - Las listas con data-split="items" se parten por elementos.
//   - Las tablas con data-split="rows" se parten por filas y repiten el encabezado.
//   - data-keep: bloque indivisible (p. ej. "Sin otro particular" + firma).
//   - data-keep-next: título que debe ir en la misma hoja que el bloque siguiente.
//   - data-continue-top (en .flow-content): margen superior de las hojas nuevas.
//
// IMPORTANTE: la función debe ser autocontenida (sin referencias externas)
// porque también se inyecta como <script> en la vista previa vía toString().
export function paginateFlowPages(root) {
  const doc = root.ownerDocument || root;
  const VOID = /^<(br|img|hr|input|meta|link|wbr)\b/i;

  const tokenize = (html) => html.match(/<[^>]+>|[^<\s]+\s*|\s+/g) || [];
  const openTagsAt = (tokens, k) => {
    const stack = [];
    for (let i = 0; i < k; i++) {
      const t = tokens[i];
      if (t[0] !== '<') continue;
      if (t[1] === '/') stack.pop();
      else if (!VOID.test(t) && !/\/>$/.test(t)) stack.push(t);
    }
    return stack;
  };

  const splitParagraph = (p, fits) => {
    const original = p.innerHTML;
    const tokens = tokenize(original);
    const words = [];
    tokens.forEach((t, i) => { if (t[0] !== '<' && t.trim()) words.push(i + 1); });
    if (words.length < 2) return null;
    let lo = 0, hi = words.length - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      p.innerHTML = tokens.slice(0, words[mid]).join('');
      if (fits(p)) { best = mid + 1; lo = mid + 1; } else hi = mid - 1;
    }
    if (!best) { p.innerHTML = original; return null; }
    const cut = words[best - 1];
    p.innerHTML = tokens.slice(0, cut).join('');
    // Evita dejar una sola línea huérfana al pie de la hoja.
    const lh = parseFloat(getComputedStyle(p).lineHeight) || 20;
    if (p.getBoundingClientRect().height < lh * 1.9) { p.innerHTML = original; return null; }
    const rest = p.cloneNode(false);
    rest.innerHTML = openTagsAt(tokens, cut).join('') + tokens.slice(cut).join('').replace(/^\s+/, '');
    if (getComputedStyle(p).textAlign === 'justify') p.style.textAlignLast = 'justify';
    p.style.marginBottom = '0';
    return rest;
  };

  const splitList = (list, fits) => {
    const items = [...list.children];
    let keep = 0;
    for (let i = 0; i < items.length; i++) {
      // Se mide cada elemento contra el límite de la hoja.
      if (fits(items[i])) keep = i + 1; else break;
    }
    if (!keep) return null;
    const rest = list.cloneNode(false);
    if (list.tagName === 'OL') rest.setAttribute('start', String((parseInt(list.getAttribute('start'), 10) || 1) + keep));
    items.slice(keep).forEach((li) => rest.appendChild(li));
    return rest;
  };

  const splitTable = (table, fits) => {
    const body = table.tBodies[0];
    if (!body) return null;
    const rows = [...body.rows];
    let keep = 0;
    for (let i = 0; i < rows.length; i++) {
      if (fits(rows[i])) keep = i + 1; else break;
    }
    if (!keep || keep === rows.length) return null;
    const rest = table.cloneNode(false);
    [...table.children].forEach((child) => {
      if (child.tagName === 'COLGROUP' || child.tagName === 'THEAD') rest.appendChild(child.cloneNode(true));
    });
    const restBody = body.cloneNode(false);
    rows.slice(keep).forEach((tr) => restBody.appendChild(tr));
    rest.appendChild(restBody);
    return rest;
  };

  [...root.querySelectorAll('.flow-page')].forEach((first) => {
    let cur = first;
    for (let guard = 0; guard < 40; guard++) {
      const content = cur.querySelector('.flow-content');
      if (!content) break;
      const cRect = content.getBoundingClientRect();
      const limit = cRect.top + content.clientHeight - parseFloat(getComputedStyle(content).paddingBottom);
      const fits = (el) => el.getBoundingClientRect().bottom <= limit + 0.5;
      const kids = [...content.children];
      let idx = kids.findIndex((k) => !fits(k));
      if (idx < 0) break;

      let carry = null;
      const el = kids[idx];
      if (!el.hasAttribute('data-keep')) {
        if (el.tagName === 'P') carry = splitParagraph(el, fits);
        else if (el.getAttribute('data-split') === 'items') carry = splitList(el, fits);
        else if (el.getAttribute('data-split') === 'rows') carry = splitTable(el, fits);
      }
      let moveFrom = carry ? idx + 1 : idx;
      if (!carry) {
        // Un título no se queda solo al final de la hoja.
        while (moveFrom > 0 && kids[moveFrom - 1].hasAttribute('data-keep-next')) moveFrom--;
        if (moveFrom === 0) moveFrom = idx;
        if (moveFrom === 0) break; // bloque indivisible más alto que una hoja
      }

      const next = cur.cloneNode(true);
      const nextContent = next.querySelector('.flow-content');
      nextContent.innerHTML = '';
      // En las hojas de continuación el texto inicia a la izquierda, justo bajo
      // el logo del membrete: se baja el margen superior para no encimarse.
      const contTop = content.getAttribute('data-continue-top');
      if (contTop) nextContent.style.paddingTop = contTop;
      if (carry) nextContent.appendChild(carry);
      kids.slice(moveFrom).forEach((k) => nextContent.appendChild(k));
      const firstMoved = nextContent.firstElementChild;
      if (firstMoved && !carry) firstMoved.style.marginTop = '0';
      cur.parentNode.insertBefore(next, cur.nextSibling);
      cur = next;
    }
  });
  return doc;
}

// Hoja carta con membrete de fondo cuyo contenido se pagina automáticamente.
// `inner` son los bloques del contenido (hijos directos de .flow-content).
// `chrome` permite agregar elementos fijos en cada hoja (p. ej. barras o pie).
export const flowPageHTML = ({
  inner = '',
  membreteUrl = '',
  padding = '1.35in 0.75in 1.9in 0.9in',
  continueTop = '1.75in',
  color = '#333',
  chrome = '',
} = {}) => `<div class="flow-page" style="position:relative;width:8.5in;height:11in;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;color:${color};background:white;box-sizing:border-box;">${
  membreteUrl ? `<img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:1056px;object-fit:cover;z-index:0;pointer-events:none;"/>` : ''
}${chrome}<div class="flow-content"${continueTop ? ` data-continue-top="${continueTop}"` : ''} style="position:relative;z-index:1;padding:${padding};height:100%;box-sizing:border-box;">${inner}</div></div>`;

// Script para la vista previa (ventana nueva): pagina al cargar las imágenes.
export const flowPaginationScript = () =>
  `<script>(function(){var run=function(){(${paginateFlowPages.toString()})(document.body);};if(document.readyState==='complete')run();else window.addEventListener('load',run);})();</script>`;

// Agrega el script de paginación a un documento con hojas .flow-page (solo
// para la vista previa; la descarga PDF pagina directamente en downloadPDF).
export const withFlowPagination = (html = '') => {
  if (!html.includes('flow-page')) return html;
  const css = '<style>.flow-page{break-after:page;page-break-after:always;}</style>';
  const script = flowPaginationScript();
  return html.includes('</body>') ? html.replace('</body>', `${css}${script}</body>`) : html + css + script;
};
