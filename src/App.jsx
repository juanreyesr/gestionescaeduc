import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, FileText, Users, Settings, Menu, X, CheckCircle, Clock, 
  AlertCircle, Download, LogOut, Plus, ExternalLink, Youtube, Lock, 
  FileSignature, Upload, Save, AlertTriangle, FileSpreadsheet,
  UserPlus, Link2, File, Trash2, Eye, EyeOff, Play, RefreshCw
} from 'lucide-react';

// ==========================================
// CONFIGURACIÓN SUPABASE
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// CONFIGURACIÓN
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

const LoginView = ({ handleLogin, loading, authError, setUserMode, setCurrentModule, appSettings }) => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const youtubeUrl = appSettings?.youtube_tutorial_url || '';

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

          {youtubeUrl && (
            <a 
              href={youtubeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-lg hover:bg-red-100 font-semibold w-full justify-center border border-red-200 transition-colors"
            >
              <Play size={20} fill="currentColor" />
              Ver Tutorial de Avales
            </a>
          )}
        </div>
      </Card>

      <button onClick={() => setShowAdmin(true)} className="absolute bottom-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
        <Lock size={12} /> Acceso Administrativo
      </button>

      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="Acceso Comisión" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} required />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-800 text-white py-2 rounded font-bold hover:bg-blue-900">
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// ADMIN CONFIG VIEW - MÓDULO COMPLETO
// ==========================================

const AdminConfigView = ({ appSettings, onUpdateSetting, members }) => {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Usuarios', icon: <UserPlus size={18} /> },
    { id: 'form_file', label: 'Formulario Aval', icon: <File size={18} /> },
    { id: 'tutorial', label: 'Tutorial YouTube', icon: <Youtube size={18} /> },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 justify-center
              ${activeTab === tab.id 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <AdminUsersTab members={members} />}
      {activeTab === 'form_file' && <AdminFormFileTab appSettings={appSettings} onUpdateSetting={onUpdateSetting} />}
      {activeTab === 'tutorial' && <AdminTutorialTab appSettings={appSettings} onUpdateSetting={onUpdateSetting} />}
    </div>
  );
};

// --- TAB: Gestión de Usuarios ---
const AdminUsersTab = ({ members }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: ROLES[0] });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) {
        setMessage({ type: 'error', text: `Error de autenticación: ${authError.message}` });
        setCreating(false);
        return;
      }

      // 2. Crear perfil en profiles
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          name: newUser.name,
          role: newUser.role,
          email: newUser.email,
        }]);

        if (profileError) {
          setMessage({ type: 'warning', text: `Usuario creado en Auth pero error en perfil: ${profileError.message}. Crea el perfil manualmente en Supabase.` });
        } else {
          setMessage({ type: 'success', text: `Usuario "${newUser.name}" creado exitosamente.` });
          setNewUser({ email: '', password: '', name: '', role: ROLES[0] });
          setShowCreateModal(false);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Error inesperado: ${err.message}` });
    }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-700">Usuarios Administradores</h3>
          <p className="text-sm text-gray-500">Miembros de la comisión con acceso al sistema.</p>
        </div>
        <button 
          onClick={() => { setShowCreateModal(true); setMessage(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> :
           message.type === 'warning' ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> :
           <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Lista de usuarios actuales */}
      <div className="grid gap-3">
        {members.length > 0 ? members.map(member => (
          <Card key={member.id} className="!shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{member.name || 'Sin nombre'}</p>
                  <p className="text-xs text-gray-500">{member.email || 'Sin email'}</p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
                {member.role || 'Sin rol'}
              </span>
            </div>
          </Card>
        )) : (
          <div className="text-center text-gray-400 py-8">No hay miembros registrados en la tabla profiles.</div>
        )}
      </div>

      {/* Modal crear usuario */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear Nuevo Usuario" size="sm">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input 
              required 
              placeholder="Ej: María López" 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              required 
              type="email" 
              placeholder="usuario@email.com" 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <input 
                required 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Mínimo 6 caracteres" 
                minLength={6}
                className="w-full border border-gray-300 p-2.5 rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol en la Comisión</label>
            <select 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
              value={newUser.role}
              onChange={e => setNewUser({...newUser, role: e.target.value})}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <strong>Nota:</strong> El usuario recibirá un correo de confirmación si está habilitado en Supabase Auth. 
            Si no, podrá ingresar de inmediato con las credenciales proporcionadas.
          </div>

          <button 
            type="submit" 
            disabled={creating}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Creando...' : 'Crear Usuario'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- TAB: Formulario de Aval (Archivo descargable) ---
const AdminFormFileTab = ({ appSettings, onUpdateSetting }) => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const currentFilePath = appSettings?.aval_form_file_path || '';
  const currentFileUrl = currentFilePath 
    ? `${supabaseUrl}/storage/v1/object/public/aval-form-template/${currentFilePath}`
    : null;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const fileName = `formulario_aval_${Date.now()}.${file.name.split('.').pop()}`;

      // Si hay archivo anterior, eliminarlo
      if (currentFilePath) {
        await supabase.storage.from('aval-form-template').remove([currentFilePath]);
      }

      // Subir nuevo archivo
      const { data, error } = await supabase.storage
        .from('aval-form-template')
        .upload(fileName, file, { upsert: true });

      if (error) {
        setMessage({ type: 'error', text: `Error al subir: ${error.message}` });
        setUploading(false);
        return;
      }

      // Guardar ruta en app_settings
      await onUpdateSetting('aval_form_file_path', data.path);
      setMessage({ type: 'success', text: `Archivo "${file.name}" subido correctamente.` });
    } catch (err) {
      setMessage({ type: 'error', text: `Error inesperado: ${err.message}` });
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    if (!currentFilePath) return;
    if (!confirm('¿Estás seguro de eliminar el formulario actual?')) return;

    try {
      await supabase.storage.from('aval-form-template').remove([currentFilePath]);
      await onUpdateSetting('aval_form_file_path', '');
      setMessage({ type: 'success', text: 'Archivo eliminado.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-700">Formulario de Solicitud de Aval</h3>
        <p className="text-sm text-gray-500">Sube el archivo que los solicitantes externos podrán descargar desde el portal.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          {message.text}
        </div>
      )}

      <Card>
        {currentFileUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText size={24} className="text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-800">Archivo actual activo</p>
                <p className="text-xs text-green-600 truncate">{currentFilePath}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a 
                  href={currentFileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 flex items-center gap-1"
                >
                  <Download size={14} /> Ver
                </a>
                <button 
                  onClick={handleRemove}
                  className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200 flex items-center gap-1"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Reemplazar con nuevo archivo:</p>
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500">{uploading ? 'Subiendo...' : 'Seleccionar archivo nuevo'}</span>
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls" />
              </label>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <Upload size={28} className="text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-700">No hay formulario cargado</p>
              <p className="text-sm text-gray-500">Sube un archivo PDF, Word o Excel.</p>
            </div>
            <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium">
              <Upload size={18} />
              {uploading ? 'Subiendo...' : 'Subir Formulario'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx,.xls" />
            </label>
          </div>
        )}
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        <strong>Requisito:</strong> Debes crear el bucket <code className="bg-amber-100 px-1 rounded">aval-form-template</code> en 
        Supabase Storage como público. Consulta el archivo SQL de configuración.
      </div>
    </div>
  );
};

// --- TAB: Tutorial YouTube ---
const AdminTutorialTab = ({ appSettings, onUpdateSetting }) => {
  const [url, setUrl] = useState(appSettings?.youtube_tutorial_url || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setUrl(appSettings?.youtube_tutorial_url || '');
  }, [appSettings?.youtube_tutorial_url]);

  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    // Soporta: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    let videoId = null;
    try {
      const urlObj = new URL(rawUrl);
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.searchParams.get('v')) {
        videoId = urlObj.searchParams.get('v');
      } else if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1];
      }
    } catch {
      return null;
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onUpdateSetting('youtube_tutorial_url', url.trim());
      setMessage({ type: 'success', text: 'Link de tutorial actualizado correctamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onUpdateSetting('youtube_tutorial_url', '');
      setUrl('');
      setMessage({ type: 'success', text: 'Link de tutorial eliminado. Ya no se mostrará en la página inicial.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    }
    setSaving(false);
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-700">Tutorial de YouTube</h3>
        <p className="text-sm text-gray-500">Configura el video tutorial que se mostrará como botón en la página inicial del portal.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          {message.text}
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del Video</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="url" 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="w-full border border-gray-300 p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                  value={url}
                  onChange={e => setUrl(e.target.value)} 
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium shrink-0"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {embedUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Vista previa:</p>
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                <iframe 
                  src={embedUrl} 
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  title="Tutorial Preview"
                />
              </div>
            </div>
          )}

          {url && !embedUrl && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              El formato del link no parece ser un URL de YouTube válido. Usa formato: https://www.youtube.com/watch?v=XXXX
            </div>
          )}

          {url && (
            <button 
              onClick={handleRemove}
              className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
            >
              <Trash2 size={14} /> Quitar tutorial de la página inicial
            </button>
          )}
        </div>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <strong>¿Cómo funciona?</strong> Al guardar un link válido, aparecerá un botón 
        "Ver Tutorial de Avales" en la página inicial del portal, justo debajo del botón de ingreso.
        Si el campo está vacío, el botón no se muestra.
      </div>
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
  const [appSettings, setAppSettings] = useState({});

  // Cargar settings públicos (para YouTube en landing)
  const fetchPublicSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from('app_settings').select('key, value');
      if (data) {
        const settingsMap = {};
        data.forEach(row => { settingsMap[row.key] = row.value; });
        setAppSettings(settingsMap);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  }, []);

  useEffect(() => {
    // Cargar settings siempre (para la vista pública)
    fetchPublicSettings();

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
  }, [fetchPublicSettings]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: act } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
        const { data: avl } = await supabase.from('avales').select('*').order('created_at', { ascending: false });
        const { data: mem } = await supabase.from('profiles').select('*');
        const { data: docs } = await supabase.from('internal_documents').select('*');
        const { data: settings } = await supabase.from('app_settings').select('key, value');
        
        if(act) setActivities(act);
        if(avl) setAvales(avl);
        if(mem) setMembers(mem);
        if(docs) setInternalDocs(docs);
        if(settings) {
          const settingsMap = {};
          settings.forEach(row => { settingsMap[row.key] = row.value; });
          setAppSettings(settingsMap);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setAuthError(null);
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
    const { data, error } = await supabase.from('activities').insert([formData]).select();
    if (error) {
      alert("Error al crear actividad: " + error.message);
      return;
    }
    
    const newActivity = data[0];
    
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

    if (tasksToInsert.length > 0) {
      await supabase.from('tasks').insert(tasksToInsert);
    }
    
    fetchData(); 
  };

  const submitAval = async (data, file1) => {
    let formUrl = null;
    if(file1) {
      const { data: f1, error: uploadError } = await supabase.storage
        .from('avales-files')
        .upload(`forms/${Date.now()}_${file1.name}`, file1);
      
      if(uploadError) {
        alert("Error subiendo archivo: " + uploadError.message);
        return;
      }
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
    const { error } = await supabase.from('internal_documents').insert([docData]);
    if (error) {
      alert("Error registrando documento: " + error.message);
      return;
    }
    fetchData();
  };

  const updateAvalStatus = async (id, status, reason = null) => {
    const { error } = await supabase.from('avales')
      .update({ status, rejection_reason: reason })
      .eq('id', id);
    
    if (error) {
      alert("Error actualizando estado: " + error.message);
      return;
    }
    fetchData();
  };

  const updateSetting = async (key, value) => {
    const { error } = await supabase
      .from('app_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);
    
    if (error) {
      // Si no existe, intentar insertar
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert([{ key, value }]);
      
      if (insertError) throw insertError;
    }
    
    // Actualizar state local
    setAppSettings(prev => ({ ...prev, [key]: value }));
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
        {userMode === 'public' && (
          <LoginView 
            handleLogin={handleLogin} 
            loading={loading} 
            authError={authError} 
            setUserMode={setUserMode} 
            setCurrentModule={setCurrentModule}
            appSettings={appSettings}
          />
        )}
        
        {userMode === 'external' && (
          <ExternalAvalesView 
            submitAval={submitAval} 
            onBack={() => setUserMode('public')} 
            appSettings={appSettings}
          />
        )}

        {userMode === 'admin' && (
          <>
            {currentModule === 'planificacion' && <PlanificacionView activities={activities} createActivity={createActivity} members={members} onRegisterDoc={registerDoc} />}
            {currentModule === 'dashboard' && <PlanificacionView activities={activities} createActivity={createActivity} members={members} onRegisterDoc={registerDoc} />}
            {currentModule === 'avales' && <AvalesAdminView avales={avales} updateStatus={updateAvalStatus} />}
            {currentModule === 'reportes' && <ReportesView avales={avales} docs={internalDocs} />}
            {currentModule === 'admin_config' && (
              <AdminConfigView 
                appSettings={appSettings} 
                onUpdateSetting={updateSetting} 
                members={members}
              />
            )}
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

  const handleSubmit = (e) => {
    e.preventDefault();
    createActivity(formData);
    setShowModal(false);
    setFormData({ title: '', type: 'Diplomado', date: '', hours: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Planificación</h2>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded flex gap-2 hover:bg-blue-700"><Plus /> Nueva</button>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Título" className="w-full border p-2 rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <input required type="date" className="w-full border p-2 rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          <select className="w-full border p-2 rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
             <option>Diplomado</option><option>Taller</option><option>Conferencia</option>
          </select>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Guardar</button>
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

const ExternalAvalesView = ({ submitAval, onBack, appSettings }) => {
  const [data, setData] = useState({ applicantName: '', activityName: '', email: '' });
  const [file, setFile] = useState(null);

  const formFilePath = appSettings?.aval_form_file_path || '';
  const formFileUrl = formFilePath 
    ? `${supabaseUrl}/storage/v1/object/public/aval-form-template/${formFilePath}`
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    submitAval(data, file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-800">← Volver</button>
      
      {/* Descarga del formulario */}
      {formFileUrl && (
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg shrink-0">
              <Download size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">Formulario de Solicitud</p>
              <p className="text-sm text-gray-500">Descarga, llena y adjunta el formulario oficial.</p>
            </div>
            <a 
              href={formFileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shrink-0"
            >
              <Download size={16} /> Descargar
            </a>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4">Solicitud de Aval</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
           <input required placeholder="Nombre Solicitante / Institución" className="w-full border p-2 rounded" value={data.applicantName} onChange={e => setData({...data, applicantName: e.target.value})} />
           <input required placeholder="Nombre Actividad" className="w-full border p-2 rounded" value={data.activityName} onChange={e => setData({...data, activityName: e.target.value})} />
           <input required type="email" placeholder="Email Contacto" className="w-full border p-2 rounded" value={data.email} onChange={e => setData({...data, email: e.target.value})} />
           <div>
             <label className="block text-sm font-bold mb-1">Formulario Lleno (adjuntar)</label>
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
           {avales.length === 0 && <p className="text-gray-400 text-center py-8">No hay avales registrados</p>}
        </div>
      </Card>
      <Card>
        <h3 className="font-bold mb-2 text-indigo-700">Documentos Generados ({docs.length})</h3>
        <div className="h-64 overflow-y-auto text-sm border-t pt-2">
           {docs.map(d => (
             <div key={d.id} className="border-b py-2">
               <span className="font-semibold">{d.type?.toUpperCase()}</span> - {d.activity_name}
               <br/><span className="text-gray-400 text-xs">{d.created_at?.substring(0,10) || "Fecha Reciente"}</span>
             </div>
           ))}
           {docs.length === 0 && <p className="text-gray-400 text-center py-8">No hay documentos generados</p>}
        </div>
      </Card>
    </div>
  </div>
);
