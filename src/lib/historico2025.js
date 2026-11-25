// Datos de referencia del año anterior para la comparativa del Informe de labores.
//
// Fuente: «Resumen de la Ejecución de Actividades Programadas en CAEDUC,
// período de junio a diciembre 2025» (informe presentado a Junta Directiva).
// Ese informe no se generó con el sistema, por eso sus actividades se copian
// aquí tal cual. Los diplomados que duran varios meses se ubican en su mes de
// inicio (así se cuentan también en el calendario del aula).
//
// El tipo se ajusta a la lista del sistema para poder comparar; el tipo escrito
// en el informe original queda en `tipoOriginal`.

export const INFORME_2025 = {
  fuente: 'Resumen de la Ejecución de Actividades Programadas en CAEDUC, período de junio a diciembre 2025',
  desde: '2025-06-01',
  hasta: '2025-12-31',
  totalReportado: 1799,
  avalesOtorgados: { desde: '2025-02-01', hasta: '2025-12-31', total: 32 },
  certificadosApp: { desde: '2025-10-01', hasta: '2025-12-31', total: 62 },
  actividades: [
    { fecha: '2025-08-09', nombre: 'Encuentro Nacional de Psicología y Deporte', tipoOriginal: 'Encuentro Nacional', tipo: 'Congreso', modalidad: 'Híbrida', asistentes: 120 },
    { fecha: '2025-08-21', nombre: 'Psicoanálisis, Dr. Colussi', tipoOriginal: 'Webinar', tipo: 'Webinar', modalidad: 'Virtual', asistentes: 98 },
    { fecha: '2025-08-01', nombre: 'Diplomado en Neuropsicología Infantil, Dr. Pietra', tipoOriginal: 'Diplomado', tipo: 'Diplomado', modalidad: 'Virtual', asistentes: 60 },
    { fecha: '2025-10-01', nombre: 'Diplomado en Neuropsicología del Adulto, Dr. Pietra', tipoOriginal: 'Diplomado', tipo: 'Diplomado', modalidad: 'Virtual', asistentes: 66 },
    { fecha: '2025-09-01', nombre: 'Diplomado en Psicoanálisis, Dr. Marcelo Colussi', tipoOriginal: 'Diplomado', tipo: 'Diplomado', modalidad: 'Virtual', asistentes: 33 },
    { fecha: '2025-09-11', nombre: 'Presentación del diplomado en Atención de conducta suicida', tipoOriginal: 'Webinar', tipo: 'Webinar', modalidad: 'Virtual', asistentes: 300 },
    { fecha: '2025-09-18', nombre: 'Musicoterapia, Dr. Julio Méndez (Universidad Da Vinci)', tipoOriginal: 'Webinar', tipo: 'Webinar', modalidad: 'Virtual', asistentes: 120 },
    { fecha: '2025-09-24', nombre: 'Guía del monitoreo del desarrollo infantil (Organización Gindhi)', tipoOriginal: 'Webinar', tipo: 'Webinar', modalidad: 'Virtual', asistentes: 68 },
    { fecha: '2025-09-01', nombre: 'Diplomado en Atención de conducta suicida, Dr. Federico Roncal', tipoOriginal: 'Diplomado', tipo: 'Diplomado', modalidad: 'Híbrida', asistentes: 81 },
    { fecha: '2025-10-25', nombre: 'Abordaje del duelo prolongado, Dra. Mollinedo', tipoOriginal: 'Ponencia', tipo: 'Conferencia', modalidad: 'Híbrida', asistentes: 65 },
    { fecha: '2025-10-30', nombre: 'Espectro autista en el adulto y entrega de diplomas, Dr. Pietra', tipoOriginal: 'Ponencia', tipo: 'Conferencia', modalidad: 'Híbrida', asistentes: 198 },
    { fecha: '2025-11-03', nombre: 'Inteligencia en Guatemala, M.A. María Elena Calderón', tipoOriginal: 'Webinar', tipo: 'Webinar', modalidad: 'Virtual', asistentes: 46 },
    { fecha: '2025-11-29', nombre: 'Acoso laboral', tipoOriginal: 'Conversatorio', tipo: 'Foro', modalidad: 'Híbrida', asistentes: 40 },
    { fecha: '2025-11-30', nombre: 'Retiro «Unidos por la psicología»', tipoOriginal: 'Retiro de Liderazgo', tipo: 'Retiro', modalidad: 'Presencial', asistentes: 35 },
    { fecha: '2025-12-01', nombre: 'Cine Forum: Autocuidado del profesional de Psicología (Guatemala)', tipoOriginal: 'Cine Forum', tipo: 'Foro', modalidad: 'Presencial', asistentes: 25 },
    { fecha: '2025-12-02', nombre: 'Cine Forum: Autocuidado del profesional de Psicología (Quetzaltenango)', tipoOriginal: 'Cine Forum', tipo: 'Foro', modalidad: 'Presencial', asistentes: 16 },
    { fecha: '2025-12-04', nombre: 'Cine Forum: Autocuidado del profesional de Psicología (Zacapa)', tipoOriginal: 'Cine Forum', tipo: 'Foro', modalidad: 'Presencial', asistentes: 25 },
    { fecha: '2025-12-05', nombre: 'Cine Forum: Autocuidado del profesional de Psicología (Cobán)', tipoOriginal: 'Cine Forum', tipo: 'Foro', modalidad: 'Presencial', asistentes: 29 },
    { fecha: '2025-12-03', nombre: 'Atención en crisis de ansiedad, Mgtr. Ximena Fuentes', tipoOriginal: 'Ponencia', tipo: 'Conferencia', modalidad: 'Híbrida', asistentes: 54 },
    { fecha: '2025-12-06', nombre: 'Neurociencias y estrategias para la educación superior', tipoOriginal: 'Seminario', tipo: 'Seminario', modalidad: 'Híbrida', asistentes: 245 },
    { fecha: '2025-12-08', nombre: 'El voluntariado y la tarifa social', tipoOriginal: 'Webinar', tipo: 'Webinar', modalidad: 'Virtual', asistentes: 75 },
  ],
};

// Referencias disponibles por año.
export const REFERENCIAS = { 2025: INFORME_2025 };
