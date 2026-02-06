import React, { useState, useEffect } from 'react';
// import { createClient } from '@supabase/supabase-js'; // <--- DESCOMENTAR PARA PRODUCCIÓN
import { 
  Calendar, FileText, Users, Settings, Menu, X, CheckCircle, Clock, 
  AlertCircle, Download, LogOut, Plus, ExternalLink, Youtube, Lock, 
  FileSignature, Upload, Save, AlertTriangle, FileSpreadsheet 
} from 'lucide-react';

// ==========================================
// 1. CONFIGURACIÓN PARA PRODUCCIÓN (GitHub/Vercel)
// ==========================================
// Para usar la base de datos real, descomenta estas lineas y comenta la sección "MOCK" de abajo.

/*
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
*/

// ==========================================
// 2. MOCK SUPABASE CLIENT (Solo para Vista Previa)
// ==========================================
// Este código simula la base de datos para que la app no falle en este entorno de prueba.
// ELIMINAR O COMENTAR ESTA SECCIÓN AL SUBIR A PRODUCCIÓN.

const createMockClient = () => {
  // Datos iniciales simulados
  let db = {
    activities: [],
    avales: [
      { id: 101, created_at: new Date().toISOString(), applicant_name: 'Asoc. Psiquiatría', activity_name: 'Congreso 2025', status: 'Pendiente' }
    ],
    profiles: [
       { id: 1, name: "Dra. Rebeca Ramírez", role: "Coordinadora", active: true }
    ],
    internal_documents: [],
    tasks: []
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (cb) => { return { data: { subscription: { unsubscribe: () => {} } } }; },
      signInWithPassword: async ({email, password}) => {
        if(email === 'admin@caeduc.gt' && password === 'admin') {
           return { data: { session: { user: { email } } }, error: null };
        }
        return { data: { session: null }, error: { message: "Credenciales inválidas (Prueba: admin@caeduc.gt / admin)" } };
      },
      signOut: async () => {},
    },
    from: (table) => ({
      select: () => ({
        order: () => Promise.resolve({ data: db[table] || [], error: null }),
        then: (cb) => cb({ data: db[table] || [], error: null }) // Fallback simple
      }),
      insert: (rows) => {
        const newRows = rows.map(r => ({ ...r, id: Date.now(), created_at: new Date().toISOString() }));
        if(!db[table]) db[table] = [];
        db[table] = [...newRows, ...db[table]]; // Add to beginning
        return Promise.resolve({ data: newRows, error: null });
      },
      update: (updates) => ({
        eq: (field, value) => {
          if(db[table]) {
             db[table] = db[table].map(row => row[field] === value ? { ...row, ...updates } : row);
          }
          return Promise.resolve({ data: [], error: null });
        }
      })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: 'mock_path_file.pdf' } })
      })
    }
  };
};

const supabase = createMockClient(); // Usamos el cliente simulado por defecto aquí

// ==========================================
// FIN CONFIGURACIÓN
// ==========================================

const ROLES = [
  "Coordinadora", "Subcoordinador", "Secretaria", "Prosecretaria", 
  "Gestor del Conocimiento", "Vocal I", "Vocal II"
];

const TASK_TEMPLATES = {
  "Coordinadora": [
    { title: "Aprobar agenda y lineamientos", desc: "Convoca, preside y dirige (Art. 6).", evidenceRequired: true },
    { title: "Firmar solicitudes", desc: "Gestión ante Junta Directiva.", evidenceRequired: true }
  ],
  "Secretaria": [
    { title: "Abrir expediente interno", desc: "Archivo y correspondencia (Art. 8).", evidenceRequired: true },
    { title: "Redactar actas", desc: "Documentación oficial.", evidenceRequired: true }
  ],
  "Gestor del Conocimiento": [
    { title: "Revisión científica", desc: "Verificación académica (Art. 10).", evidenceRequired: true },
    { title: "Coordinar difusión", desc: "Enlace con redes.", evidenceRequired: true }
  ],
  "Vocal I": [{ title: "Apoyo logístico", desc: "Cooperación (Art. 11).", evidenceRequired: false }],
  "Vocal II": [{ title: "Apoyo logístico", desc: "Cooperación (Art. 11).", evidenceRequired: false }],
  "Subcoordinador": [{ title: "Seguimiento ejecución", desc: "Supervisión (Art. 7).", evidenceRequired: false }],
  "Prosecretaria": [{ title: "Apoyo actas y difusión", desc: "Colaboración (Art. 9).", evidenceRequired: false }]
};

// --- COMPONENTES UI ---
const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizes[size]} m-auto`}>
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-red-500" /></button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden ${className}`}>
    <div className="p-6">{children}</div>
  </div>
);

const Badge = ({ status }) => {
  const colors = {
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'En Proceso': 'bg-blue-100 text-blue-800',
    'Aprobado': 'bg-green-100 text-green-800',
    'Rechazado': 'bg-red-100 text-red-800',
    'Finalizado': 'bg-gray-100 text-gray-800'
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

// --- VISTAS ---

const LoginView = ({ handleLogin, loading, authError, setUserMode, setCurrentModule }) => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] bg-gray-50 p-6 relative">
      <Card className="max-w-md w-full border-t-8 border-t-green-600 hover:shadow-2xl transition-all">
        <div className="flex flex-col items-center text-center space-y-6 py-10">
          <div className="bg-green-100 p-6 rounded-full"><ExternalLink size={64} className="text-green-600" /></div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Solicitud de Avales</h2>
            <p className="text-gray-600 px-4">Portal oficial para solicitudes externas.</p>
          </div>
          <button onClick={() => { setUserMode('external'); setCurrentModule('instructivo'); }} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold w-full">
            Ingresar al Portal
          </button>
        </div>
      </Card>

      <button onClick={() => setShowAdmin(true)} className="absolute bottom-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
        <Lock size={12} /> Acceso Administrativo
      </button>

      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="Acceso Comisión" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }} className="space-y-4">
          <input type="email" placeholder="Email (admin@caeduc.gt)" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Contraseña (admin)" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <div className="text-xs text-blue-500 mb-2 p-2 bg-blue-50 rounded">
            <strong>Credenciales Demo:</strong><br/>
            Usuario: admin@caeduc.gt<br/>
            Clave: admin
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-800 text-white py-2 rounded font-bold">
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- APLICACIÓN PRINCIPAL ---

export default function CAEDUCApp() {
  const [session, setSession] = useState(null);
  const [userMode, setUserMode] = useState('public'); 
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Datos
  const [activities, setActivities] = useState([]);
  const [avales, setAvales] = useState([]);
  const [members, setMembers] = useState([]);
  const [internalDocs, setInternalDocs] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { setUserMode('admin'); fetchData(); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { setUserMode('admin'); fetchData(); }
      else { setUserMode('public'); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: act } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
        const { data: avl } = await supabase.from('avales').select('*').order('created_at', { ascending: false });
        const { data: mem } = await supabase.from('profiles').select('*');
        const { data: docs } = await supabase.from('internal_documents').select('*');
        
        if(act) setActivities(act);
        if(avl) setAvales(avl);
        if(mem) setMembers(mem);
        if(docs) setInternalDocs(docs);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    else {
      setSession(data.session);
      setUserMode('admin');
      fetchData();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserMode('public');
    setAuthError(null);
  };

  const createActivity = async (formData) => {
    const { data, error } = await supabase.from('activities').insert([formData]).select(); // select needed for mock return
    if (error) return alert("Error al crear");
    
    // In real supabase insert returns array, mock returns array
    const newActivity = data ? data[0] : { id: Date.now() }; 
    
    // Generar tareas automáticas
    let tasksToInsert = [];
    Object.keys(TASK_TEMPLATES).forEach(role => {
      const templates = TASK_TEMPLATES[role];
      const assigned = members.find(m => m.role === role)?.name || "Sin asignar";
      templates.forEach(t => {
        tasksToInsert.push({
          activity_id: newActivity.id,
          title: t.title,
          description: t.desc,
          role: role,
          assigned_to: assigned
        });
      });
    });

    await supabase.from('tasks').insert(tasksToInsert);
    fetchData(); 
  };

  const submitAval = async (data, file1, file2) => {
    let formUrl = null;
    if(file1) {
      const { data: f1 } = await supabase.storage.from('avales-files').upload(`forms/${Date.now()}_${file1.name}`, file1);
      if(f1) formUrl = f1.path;
    }

    const { error } = await supabase.from('avales').insert([{
      applicant_name: data.applicantName,
      activity_name: data.activityName,
      email: data.email,
      form_url: formUrl,
      status: 'Pendiente'
    }]);

    if(error) alert("Error enviando solicitud: " + error.message);
    else {
      alert("Solicitud enviada con éxito.");
      setUserMode('public'); 
    }
  };

  const registerDoc = async (docData) => {
    await supabase.from('internal_documents').insert([docData]);
    fetchData();
  };

  const updateAvalStatus = async (id, status, reason) => {
    await supabase.from('avales').update({ status, rejection_reason: reason }).eq('id', id);
    fetchData();
  };

  // --- RENDER ---
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      {userMode !== 'public' && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          toggle={() => setSidebarOpen(!isSidebarOpen)} 
          userMode={userMode} 
          current={currentModule} 
          setModule={setCurrentModule} 
          logout={handleLogout}
        />
      )}
      
      <main className={`flex-1 p-8 transition-all ${userMode !== 'public' ? (isSidebarOpen ? 'ml-64' : 'ml-20') : ''}`}>
        {userMode === 'public' && <LoginView handleLogin={handleLogin} loading={loading} authError={authError} setUserMode={setUserMode} setCurrentModule={setCurrentModule} />}
        
        {userMode === 'external' && <ExternalAvalesView submitAval={submitAval} onBack={() => setUserMode('public')} />}

        {userMode === 'admin' && (
          <>
            {currentModule === 'planificacion' && <PlanificacionView activities={activities} createActivity={createActivity} members={members} onRegisterDoc={registerDoc} />}
            {currentModule === 'dashboard' && <PlanificacionView activities={activities} createActivity={createActivity} members={members} onRegisterDoc={registerDoc} />}
            {currentModule === 'avales' && <AvalesAdminView avales={avales} updateStatus={updateAvalStatus} />}
            {currentModule === 'reportes' && <ReportesView avales={avales} docs={internalDocs} />}
            {currentModule === 'admin_config' && <div className="p-10 text-center text-gray-500">Gestión de usuarios se realiza en Supabase Auth (Configuración Externa).</div>}
          </>
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTES ---

const Sidebar = ({ isOpen, toggle, userMode, current, setModule, logout }) => (
  <div className={`bg-slate-800 text-white fixed h-full z-20 transition-all ${isOpen ? 'w-64' : 'w-20'}`}>
    <div className="p-4 flex justify-between border-b border-slate-700">
      {isOpen && <h1 className="font-bold">CAEDUC App</h1>}
      <button onClick={toggle}><Menu size={20} /></button>
    </div>
    <nav className="p-2 space-y-2 mt-4">
      {userMode === 'admin' ? (
        <>
          <SidebarBtn icon={<CheckCircle />} label="Planificación" active={current==='planificacion'} onClick={() => setModule('planificacion')} isOpen={isOpen} />
          <SidebarBtn icon={<Users />} label="Avales" active={current==='avales'} onClick={() => setModule('avales')} isOpen={isOpen} />
          <SidebarBtn icon={<Clock />} label="Reportes" active={current==='reportes'} onClick={() => setModule('reportes')} isOpen={isOpen} />
          <SidebarBtn icon={<Settings />} label="Admin" active={current==='admin_config'} onClick={() => setModule('admin_config')} isOpen={isOpen} />
        </>
      ) : (
        <SidebarBtn icon={<Youtube />} label="Instructivo" active={true} isOpen={isOpen} />
      )}
    </nav>
    {userMode === 'admin' && (
      <button onClick={logout} className="absolute bottom-4 left-4 flex gap-2 text-red-300 hover:text-white">
        <LogOut /> {isOpen && "Salir"}
      </button>
    )}
  </div>
);

const SidebarBtn = ({ icon, label, active, onClick, isOpen }) => (
  <button onClick={onClick} className={`flex items-center gap-3 p-3 w-full rounded ${active ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
    {icon} {isOpen && <span>{label}</span>}
  </button>
);

const PlanificacionView = ({ activities, createActivity, members, onRegisterDoc }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);
  const [formData, setFormData] = useState({ title: '', type: 'Diplomado', date: '', hours: 0 });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Planificación</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2"><Plus /> Nueva</button>
      </div>
      <div className="grid gap-4">
        {activities.map(act => (
          <Card key={act.id}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{act.title}</h3>
                <p className="text-sm text-gray-500">{act.date} | {act.type}</p>
              </div>
              <div className="flex gap-2">
                 <button className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200" onClick={() => setSelectedAct(act)}>Generar Carta</button>
              </div>
            </div>
          </Card>
        ))}
        {activities.length === 0 && <div className="text-gray-400 text-center py-10">No hay actividades registradas.</div>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Actividad">
        <form onSubmit={(e) => { e.preventDefault(); createActivity(formData); setShowModal(false); }} className="space-y-4">
          <input required placeholder="Título" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, title: e.target.value})} />
          <input required type="date" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, date: e.target.value})} />
          <select className="w-full border p-2 rounded" onChange={e => setFormData({...formData, type: e.target.value})}>
             <option>Diplomado</option><option>Taller</option><option>Conferencia</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Guardar</button>
        </form>
      </Modal>

      {selectedAct && (
         <Modal isOpen={!!selectedAct} onClose={() => setSelectedAct(null)} title="Generar Documento">
            <div className="text-center">
               <p className="mb-4 text-gray-700">Generar carta para: <strong>{selectedAct.title}</strong></p>
               <div className="flex justify-center gap-2">
                 <button onClick={() => {
                   onRegisterDoc({ type: 'pago', activity_name: selectedAct.title, author: 'Sistema' });
                   alert("Carta de Pago generada y registrada.");
                   setSelectedAct(null);
                 }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Solicitud Pago</button>
                 
                 <button onClick={() => {
                   onRegisterDoc({ type: 'suministros', activity_name: selectedAct.title, author: 'Sistema' });
                   alert("Carta de Suministros generada y registrada.");
                   setSelectedAct(null);
                 }} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Solicitud Suministros</button>
               </div>
            </div>
         </Modal>
      )}
    </div>
  );
};

const ExternalAvalesView = ({ submitAval, onBack }) => {
  const [data, setData] = useState({ applicantName: '', activityName: '', email: '' });
  const [file, setFile] = useState(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-800">← Volver</button>
      <Card>
        <h2 className="text-xl font-bold mb-4">Solicitud de Aval</h2>
        <form onSubmit={(e) => { e.preventDefault(); submitAval(data, file); }} className="space-y-4">
           <input required placeholder="Nombre Solicitante / Institución" className="w-full border p-2 rounded" onChange={e => setData({...data, applicantName: e.target.value})} />
           <input required placeholder="Nombre Actividad" className="w-full border p-2 rounded" onChange={e => setData({...data, activityName: e.target.value})} />
           <input required type="email" placeholder="Email Contacto" className="w-full border p-2 rounded" onChange={e => setData({...data, email: e.target.value})} />
           <div>
             <label className="block text-sm font-bold mb-1">Formulario Lleno</label>
             <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full" />
           </div>
           <button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700">Enviar Solicitud</button>
        </form>
      </Card>
    </div>
  );
};

const AvalesAdminView = ({ avales, updateStatus }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Solicitudes Recibidas</h2>
    {avales.map(req => (
      <Card key={req.id}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">{req.applicant_name}</h3>
            <p className="text-gray-600">{req.activity_name}</p>
            <span className="text-blue-500 text-xs cursor-pointer">Ver Archivos Adjuntos</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge status={req.status} />
            {req.status === 'Pendiente' && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(req.id, 'Aprobado')} className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-200">Aprobar</button>
                <button onClick={() => updateStatus(req.id, 'Rechazado', 'Documentación incompleta')} className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200">Rechazar</button>
              </div>
            )}
          </div>
        </div>
      </Card>
    ))}
    {avales.length === 0 && <div className="text-gray-400 text-center py-10">No hay solicitudes pendientes.</div>}
  </div>
);

const ReportesView = ({ avales, docs }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Historial</h2>
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <h3 className="font-bold mb-2 text-indigo-700">Avales Registrados ({avales.length})</h3>
        <div className="h-64 overflow-y-auto text-sm border-t pt-2">
           {avales.map(a => (
             <div key={a.id} className="border-b py-2 flex justify-between">
               <span>{a.activity_name}</span>
               <Badge status={a.status} />
             </div>
           ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-bold mb-2 text-indigo-700">Documentos Generados ({docs.length})</h3>
        <div className="h-64 overflow-y-auto text-sm border-t pt-2">
           {docs.map(d => (
             <div key={d.id} className="border-b py-2">
               <span className="font-semibold">{d.type.toUpperCase()}</span> - {d.activity_name}
               <br/><span className="text-gray-400 text-xs">{d.created_at?.substring(0,10) || "Fecha Reciente"}</span>
             </div>
           ))}
        </div>
      </Card>
    </div>
  </div>
);
