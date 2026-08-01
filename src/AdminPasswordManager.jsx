// src/AdminPasswordManager.jsx
// USO:
//   CAEDUC:        <AdminPasswordManager supabase={supabase} app="caeduc" />
//   Aula Virtual:  <AdminPasswordManager supabase={supabase} app="cpg" />
//   Creditos:      <AdminPasswordManager supabase={supabase} app="cpg" />
import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Search, RefreshCw, Eye, EyeOff, CheckCircle, AlertCircle, User, Clock, X, Key, Shield, BookOpen } from 'lucide-react';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatLastLogin = (iso) => {
  if (!iso) return 'Nunca';
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7)  return `Hace ${diff} dias`;
  return formatDate(iso);
};

function StrengthBar({ password }) {
  if (!password) return null;
  const len = password.length;
  const level = len < 6 ? 0 : len < 9 ? 1 : len < 12 ? 2 : 3;
  const colors = ['bg-red-400','bg-amber-400','bg-blue-400','bg-green-500'];
  const labels = ['Muy corta','Debil','Buena','Fuerte'];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[0,1,2,3].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= level && len >= 6 ? colors[level] : 'bg-gray-200'}`}/>
        ))}
      </div>
      <span className="text-xs text-gray-400 w-16 text-right">{labels[level]}</span>
    </div>
  );
}

function ChangePasswordModal({ target, onClose, onSave, saving, msg, app }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  useEffect(() => { setPassword(''); setShowPw(false); }, [target]);
  if (!target) return null;
  const headerBg = app === 'caeduc' ? 'bg-slate-800' : 'bg-blue-800';
  const appLabel = app === 'caeduc' ? 'CAEDUC' : 'Aula Virtual / Creditos';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`${headerBg} px-6 py-5 flex items-start justify-between`}>
          <div>
            <p className="text-white/60 text-xs font-medium mb-0.5">{appLabel}</p>
            <h3 className="text-white font-bold text-lg flex items-center gap-2"><Lock size={17}/> Cambiar contrasena</h3>
            <p className="text-white/70 text-xs mt-1 break-all">{target.email}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white mt-0.5"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1.5">
            {target.nombre && <div className="flex justify-between"><span>Nombre</span><span className="font-semibold text-gray-700">{target.nombre}</span></div>}
            {target.rol    && <div className="flex justify-between"><span>Rol</span><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{target.rol}</span></div>}
            {target.en_creditos !== undefined && (
              <div className="flex justify-between">
                <span>En Creditos Academicos</span>
                <span className={target.en_creditos ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {target.en_creditos ? 'Si (mismas credenciales)' : 'No registrado aun'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Ultimo ingreso</span>
              <span className={target.last_sign_in_at ? 'text-green-600 font-medium' : 'text-gray-400'}>{formatLastLogin(target.last_sign_in_at)}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Nueva contrasena</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Minimo 6 caracteres"
                className="w-full border p-3 pr-11 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && password.length >= 6 && onSave(target, password)}
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
              </button>
            </div>
            <StrengthBar password={password}/>
          </div>
          {msg && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-sm border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {msg.type === 'success' ? <CheckCircle size={16} className="shrink-0"/> : <AlertCircle size={16} className="shrink-0"/>}
              {msg.text}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
            <button onClick={() => onSave(target, password)} disabled={saving || password.length < 6}
              className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <><RefreshCw size={15} className="animate-spin"/> Cambiando...</> : <><Lock size={15}/> Confirmar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPasswordManager({ supabase, app = 'caeduc' }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [target, setTarget]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const isCAEDUC = app === 'caeduc';

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc(isCAEDUC ? 'get_usuarios_caeduc' : 'get_profesionales_cpg');
    if (!error && data) setUsuarios(data);
    setLoading(false);
  }, [supabase, isCAEDUC]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const filtered = usuarios.filter(u => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.nombre?.toLowerCase().includes(q) || u.rol?.toLowerCase().includes(q);
  });

  const closeModal = () => { setTarget(null); setMsg(null); };

  const handleChangePassword = async (user, newPassword) => {
    if (!newPassword || newPassword.length < 6) { setMsg({ type: 'error', text: 'Minimo 6 caracteres.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setMsg({ type: 'error', text: 'Sesion expirada.' }); setSaving(false); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ user_id: user.id, new_password: newPassword, target_app: app }),
      });
      const result = await res.json();
      if (!res.ok || result.error) { setMsg({ type: 'error', text: result.error || 'Error al cambiar.' }); }
      else { setMsg({ type: 'success', text: `Contrasena cambiada para ${result.email}` }); setTimeout(() => closeModal(), 2000); }
    } catch (err) { setMsg({ type: 'error', text: 'Error de conexion: ' + err.message }); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Key size={20} className="text-gray-500"/> Gestion de Contrasenas</h2>
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
            {isCAEDUC
              ? <><Shield size={14} className="text-slate-500"/> Usuarios CAEDUC — miembros de la comision</>
              : <><BookOpen size={14} className="text-blue-500"/> Profesionales CPG — Aula Virtual y Creditos Academicos</>}
          </p>
        </div>
        <button onClick={fetchUsuarios} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-200 flex items-center gap-2 text-sm border border-gray-200 self-start">
          <RefreshCw size={14}/> Actualizar
        </button>
      </div>

      {!isCAEDUC && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-sm text-blue-800">
          <CheckCircle size={16} className="shrink-0 mt-0.5 text-blue-500"/>
          <div>
            <span className="font-bold">Credenciales compartidas activas.</span>
            {' '}Cambiar la contrasena aqui actualiza el acceso a <strong>Aula Virtual y Creditos Academicos</strong> con una sola accion.
          </div>
        </div>
      )}
      {isCAEDUC && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
          <span>Solo se muestran los <strong>miembros de la comision CAEDUC</strong>. Los profesionales del CPG se administran desde Aula Virtual.</span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${isCAEDUC ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
          {loading ? '...' : `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}`}
        </div>
        {!isCAEDUC && !loading && (
          <>
            <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold">
              {usuarios.filter(u => u.en_creditos).length} en Creditos
            </div>
            <div className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs">
              {usuarios.filter(u => !u.en_creditos).length} solo Aula Virtual
            </div>
          </>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full border p-2.5 pl-9 rounded-xl text-sm"
          placeholder={isCAEDUC ? 'Buscar por nombre, rol o correo...' : 'Buscar por correo...'}
          value={search} onChange={e => setSearch(e.target.value)}/>
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14}/></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={28} className="text-gray-300 animate-spin"/></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left text-xs font-bold text-gray-500 px-4 py-3">{isCAEDUC ? 'Nombre / Correo' : 'Correo electronico'}</th>
                {isCAEDUC && <th className="text-left text-xs font-bold text-gray-500 px-4 py-3 hidden sm:table-cell">Rol</th>}
                {!isCAEDUC && <th className="text-left text-xs font-bold text-gray-500 px-4 py-3 hidden md:table-cell">En Creditos</th>}
                <th className="text-left text-xs font-bold text-gray-500 px-4 py-3 hidden md:table-cell">Ultimo ingreso</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                        {(u.nombre || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        {u.nombre && <p className="text-xs font-semibold text-gray-700 truncate">{u.nombre}</p>}
                        <p className="text-sm text-gray-600 truncate max-w-[180px] sm:max-w-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  {isCAEDUC && <td className="px-4 py-3 hidden sm:table-cell"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">{u.rol || '—'}</span></td>}
                  {!isCAEDUC && <td className="px-4 py-3 hidden md:table-cell"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.en_creditos ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{u.en_creditos ? 'Si' : 'No'}</span></td>}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs flex items-center gap-1 ${u.last_sign_in_at ? 'text-green-600' : 'text-gray-300'}`}>
                      <Clock size={10}/>{formatLastLogin(u.last_sign_in_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setTarget(u); setMsg(null); }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 ml-auto transition-all">
                      <Lock size={11}/> Cambiar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <User size={28} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">{search ? `Sin resultados para "${search}"` : 'No hay usuarios.'}</p>
            </div>
          )}
        </div>
      )}

      <ChangePasswordModal target={target} onClose={closeModal} onSave={handleChangePassword} saving={saving} msg={msg} app={app}/>
    </div>
  );
}
