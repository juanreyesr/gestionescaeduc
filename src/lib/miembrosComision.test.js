import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPOS_MIEMBRO,
  camposParaImprimir,
  cumpleanosProximos,
  diasParaCumpleanos,
  filasParaImprimir,
  formatCumpleanos,
  generateDirectorioMiembrosHTML,
  normalizarMiembro,
  ordenarMiembros,
  CARGOS_COMISION,
  textoCuentaRegresiva,
} from './miembrosComision.js';

// Fecha fija para que las pruebas no dependan del día en que se corran.
const HOY = new Date(2026, 5, 10); // 10 de junio de 2026

const miembro = (nombre, cargo, cumpleanos, extra = {}) => ({
  nombre, cargo, cumpleanos, ...extra,
});

test('los cargos vienen precargados del reglamento', () => {
  assert.equal(CARGOS_COMISION[0], 'Coordinador(a)');
  assert.ok(CARGOS_COMISION.includes('Gestor(a) del Conocimiento'));
  assert.ok(CARGOS_COMISION.length >= 8);
});

test('el cumpleaños se muestra sin el año de nacimiento', () => {
  assert.equal(formatCumpleanos('1985-06-12'), '12 de junio');
  assert.equal(formatCumpleanos('2000-01-01'), '1 de enero');
  assert.equal(formatCumpleanos(''), '');
  assert.equal(formatCumpleanos('no es fecha'), '');
  assert.equal(formatCumpleanos('1985-13-40'), '');
});

test('cuenta los días que faltan para el próximo cumpleaños', () => {
  assert.equal(diasParaCumpleanos('1985-06-10', HOY), 0, 'hoy');
  assert.equal(diasParaCumpleanos('1985-06-11', HOY), 1, 'mañana');
  assert.equal(diasParaCumpleanos('1985-06-17', HOY), 7, 'en una semana');

  // Uno que ya pasó este año se cuenta para el año entrante, no en negativo.
  assert.equal(diasParaCumpleanos('1985-06-09', HOY), 364);
  assert.equal(diasParaCumpleanos('1985-01-01', HOY), 205);

  assert.equal(diasParaCumpleanos('', HOY), null);
  assert.equal(diasParaCumpleanos(null, HOY), null);
});

test('el aviso cruza el fin de año sin romperse', () => {
  const finDeAnio = new Date(2026, 11, 29); // 29 de diciembre de 2026
  assert.equal(diasParaCumpleanos('1990-12-31', finDeAnio), 2);
  assert.equal(diasParaCumpleanos('1990-01-02', finDeAnio), 4);
  assert.equal(diasParaCumpleanos('1990-01-01', finDeAnio), 3);
});

test('un 29 de febrero se celebra el 28 en años no bisiestos', () => {
  // 2026 no es bisiesto: el aviso cae el 28 y no se sale de febrero.
  const antes = new Date(2026, 1, 25);
  assert.equal(diasParaCumpleanos('1996-02-29', antes), 3);
  // 2028 sí es bisiesto: entonces sí es el 29.
  const bisiesto = new Date(2028, 1, 25);
  assert.equal(diasParaCumpleanos('1996-02-29', bisiesto), 4);
});

test('avisa de los cumpleaños de la semana siguiente, hoy incluido', () => {
  const miembros = [
    miembro('Ana', 'Vocal I', '1985-06-17'),   // en 7 días, entra
    miembro('Beto', 'Vocal II', '1985-06-10'), // hoy, entra
    miembro('Carla', 'Secretario(a)', '1985-06-18'), // en 8 días, queda fuera
    miembro('Dora', 'Vocal I', '1985-06-11'),  // mañana, entra
    miembro('Elio', 'Vocal II', ''),           // sin fecha, queda fuera
  ];

  const proximos = cumpleanosProximos(miembros, { hoy: HOY });
  assert.deepEqual(proximos.map(item => item.nombre), ['Beto', 'Dora', 'Ana']);
  assert.deepEqual(proximos.map(item => item.diasParaCumpleanos), [0, 1, 7]);

  // Sin cumpleaños cercanos no hay alerta que mostrar.
  assert.deepEqual(cumpleanosProximos([miembro('Carla', 'Vocal I', '1985-06-18')], { hoy: HOY }), []);
});

test('el texto de la cuenta regresiva se lee natural', () => {
  assert.equal(textoCuentaRegresiva(0), 'Hoy');
  assert.equal(textoCuentaRegresiva(1), 'Mañana');
  assert.equal(textoCuentaRegresiva(5), 'En 5 días');
});

test('el directorio se ordena por el cargo del reglamento', () => {
  const miembros = [
    miembro('Zoe', 'Vocal II', ''),
    miembro('Ana', 'Coordinador(a)', ''),
    miembro('Beto', 'Cargo inventado', ''),
    miembro('Carla', 'Secretario(a)', ''),
    miembro('Ada', 'Vocal II', ''),
  ];
  // Los cargos fuera del reglamento van al final, alfabéticos.
  assert.deepEqual(
    ordenarMiembros(miembros).map(item => item.nombre),
    ['Ana', 'Carla', 'Ada', 'Zoe', 'Beto'],
  );
});

test('el informe solo lleva los campos marcados, en el orden de la tabla', () => {
  const miembros = [
    miembro('Ana López', 'Coordinador(a)', '1985-06-12', { numero_colegiado: '1234', telefono: '55551111', rol_designado: 'Preside las sesiones' }),
  ];

  // Marcados en cualquier orden, salen siempre en el de la tabla.
  assert.deepEqual(camposParaImprimir(['telefono', 'nombre']), ['nombre', 'telefono']);
  assert.deepEqual(filasParaImprimir(miembros, ['telefono', 'nombre']), [['Ana López', '55551111']]);

  assert.deepEqual(
    filasParaImprimir(miembros, ['cargo', 'nombre', 'cumpleanos', 'numero_colegiado']),
    [['Coordinador(a)', 'Ana López', '12 de junio', '1234']],
  );

  // Un campo que no existe se descarta.
  assert.deepEqual(camposParaImprimir(['nombre', 'inventado']), ['nombre']);
  // Sin nada marcado no se imprime una hoja en blanco.
  assert.deepEqual(camposParaImprimir([]), ['cargo', 'nombre', 'rol_designado', 'telefono']);
});

test('el informe impreso muestra los encabezados marcados y escapa el texto', () => {
  const html = generateDirectorioMiembrosHTML(
    [miembro('Ana <script>', 'Coordinador(a)', '1985-06-12', { telefono: '5555' })],
    ['nombre', 'telefono'],
    { hoy: HOY },
  );

  assert.match(html, /Miembros de la Comisión/);
  assert.match(html, /Guatemala, 10 de junio de 2026/);
  assert.match(html, />Nombre</);
  assert.match(html, />Teléfono</);
  // Los campos no marcados no aparecen como columna.
  assert.equal(/>Cargo</.test(html), false);
  assert.match(html, /Ana &lt;script&gt;/);
  assert.equal(html.includes('<script>'), false);

  // Un directorio vacío lo dice en vez de mostrar una tabla sola.
  assert.match(generateDirectorioMiembrosHTML([], ['nombre'], { hoy: HOY }), /No hay miembros registrados/);
});

test('todos los campos de la tabla tienen etiqueta', () => {
  CAMPOS_MIEMBRO.forEach(item => {
    assert.ok(item.campo && item.label, `campo sin etiqueta: ${JSON.stringify(item)}`);
  });
});

test('los registros guardados como "puesto" se siguen leyendo como cargo', () => {
  // La columna se renombró; entre el despliegue y la migración conviene que el
  // listado se vea igual en vez de aparecer vacío.
  const viejo = { id: '1', puesto: 'Coordinador(a)', nombre: 'Ana', cumpleanos: '1985-06-12' };
  assert.equal(normalizarMiembro(viejo).cargo, 'Coordinador(a)');
  // Si ya trae el nombre nuevo no se toca.
  assert.equal(normalizarMiembro({ cargo: 'Vocal I', puesto: 'viejo' }).cargo, 'Vocal I');
  assert.deepEqual(normalizarMiembro({}), {});

  assert.deepEqual(
    ordenarMiembros([{ nombre: 'Zoe', puesto: 'Vocal II' }, viejo]).map(item => item.nombre),
    ['Ana', 'Zoe'],
  );
  assert.deepEqual(cumpleanosProximos([viejo], { hoy: HOY }).map(item => item.cargo), ['Coordinador(a)']);
});
