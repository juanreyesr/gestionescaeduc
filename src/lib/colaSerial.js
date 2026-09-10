// src/lib/colaSerial.js — Cola para que dos escrituras no se pisen
//
// Varias partes de la app guardan con el patrón "borrar y volver a insertar"
// (por ejemplo los puntos de una agenda). Si dos guardados se solapan, el orden
// real puede quedar borrar-borrar-insertar-insertar y todo termina duplicado.
//
// Cancelar un temporizador no sirve: una vez que la función asíncrona arrancó,
// ya no se puede detener. Lo que sí se puede es obligar a que se ejecuten en
// fila, una después de la otra.

export const crearColaSerial = () => {
  let ultima = Promise.resolve();
  return (tarea) => {
    // `then(tarea, tarea)` encadena tanto si la anterior salió bien como si
    // falló: un error no debe dejar la cola trabada para siempre.
    const resultado = ultima.then(tarea, tarea);
    ultima = resultado.then(() => {}, () => {});
    return resultado;
  };
};
