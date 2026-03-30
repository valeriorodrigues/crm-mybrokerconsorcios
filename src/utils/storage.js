// ═══════════════════════════════════════════
// Supabase Storage Layer — My Broker CRM
// ═══════════════════════════════════════════
// ⚠️  KEYS via variáveis de ambiente (.env.local)
// Nunca commite chaves no código-fonte.
// No Vercel: defina VITE_SUPABASE_URL e VITE_SUPABASE_KEY em Project → Settings → Environment Variables

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://magemwnivcvbnelazrqd.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hZ2Vtd25pdmN2Ym5lbGF6cnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTgyMzEsImV4cCI6MjA4OTU5NDIzMX0.-GUNfHc6Ja7Qg04WM5dPJGhDQJNjBPwiJF33n9dQJTQ';

const headers = {
  'apikey': SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

function getHeaders() {
  const token = localStorage.getItem('sb_token');
  return {
    ...headers,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
  };
}

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Supabase error [${path}]:`, err);
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ─── Field mapping: JS camelCase ↔ DB snake_case ───
const toSnake = (obj) => {
  const map = {
    contactId: 'contact_id', companyId: 'company_id', negotiationId: 'negotiation_id',
    birthDate: 'birth_date', companyRole: 'company_role', linkedContacts: 'linked_contacts',
    sourceCorretor: 'source_corretor', createdAt: 'created_at', closingDate: 'closing_date',
    sourceOrigin: 'source_origin', sourceReferral: 'source_referral', lostReason: 'lost_reason',
    employeeCount: 'employee_count',
  };
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = map[k] || k;
    // Skip undefined
    if (v === undefined) continue;
    // JSONB fields
    if (['linkedContacts', 'linked_contacts', 'health', 'consorcio', 'seguro'].includes(k)) {
      result[key] = typeof v === 'string' ? v : JSON.stringify(v);
    } else {
      result[key] = v;
    }
  }
  return result;
};

const toCamel = (obj) => {
  const map = {
    contact_id: 'contactId', company_id: 'companyId', negotiation_id: 'negotiationId',
    birth_date: 'birthDate', company_role: 'companyRole', linked_contacts: 'linkedContacts',
    source_corretor: 'sourceCorretor', created_at: 'createdAt', closing_date: 'closingDate',
    source_origin: 'sourceOrigin', source_referral: 'sourceReferral', lost_reason: 'lostReason',
    employee_count: 'employeeCount', updated_at: '_updatedAt',
  };
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = map[k] || k;
    // Parse JSONB
    if (['linked_contacts', 'linkedContacts', 'health', 'consorcio', 'seguro'].includes(k)) {
      result[key] = typeof v === 'string' ? JSON.parse(v || '{}') : (v || {});
      if (k === 'linked_contacts' || k === 'linkedContacts') {
        result[key] = Array.isArray(result[key]) ? result[key] : [];
      }
    } else {
      result[key] = v;
    }
  }
  return result;
};

// ─── Generic CRUD ───
async function getAll(table) {
  const data = await supaFetch(`${table}?order=created_at.desc`);
  return data ? data.map(toCamel) : [];
}

async function upsertOne(table, record) {
  const snake = toSnake(record);
  // Remove internal fields
  delete snake._updatedAt;
  delete snake.updated_at;
  
  const data = await supaFetch(table, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(snake),
  });
  return data?.[0] ? toCamel(data[0]) : null;
}

async function deleteOne(table, id) {
  await supaFetch(`${table}?id=eq.${id}`, { method: 'DELETE' });
}

async function updateField(table, id, field, value) {
  const snake = toSnake({ [field]: value });
  await supaFetch(`${table}?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(snake),
  });
}

// ─── Exported API ───
export const db = {
  // Contacts
  getContacts: () => getAll('contacts'),
  saveContact: (c) => upsertOne('contacts', c),
  deleteContact: (id) => deleteOne('contacts', id),

  // Companies
  getCompanies: () => getAll('companies'),
  saveCompany: (c) => upsertOne('companies', c),
  deleteCompany: (id) => deleteOne('companies', id),

  // Negotiations
  getNegotiations: () => getAll('negotiations'),
  saveNegotiation: (n) => upsertOne('negotiations', n),
  deleteNegotiation: (id) => deleteOne('negotiations', id),
  updateNegotiation: (id, field, value) => updateField('negotiations', id, field, value),

  // Activities
  getActivities: () => getAll('activities'),
  saveActivity: (a) => upsertOne('activities', a),
  deleteActivitiesByNeg: async (negId) => {
    await supaFetch(`activities?negotiation_id=eq.${negId}`, { method: 'DELETE' });
  },

  // Tasks
  getTasks: () => getAll('tasks'),
  saveTask: (t) => upsertOne('tasks', t),
  toggleTask: async (id, done) => {
    await supaFetch(`tasks?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    });
  },
  deleteTasksByNeg: async (negId) => {
    await supaFetch(`tasks?negotiation_id=eq.${negId}`, { method: 'DELETE' });
  },

  // Templates
  getTemplates: () => getAll('templates'),
  saveTemplate: (t) => upsertOne('templates', t),

  // Bulk import contacts
  importContacts: async (contacts) => {
    const snaked = contacts.map(toSnake);
    const data = await supaFetch('contacts', {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(snaked),
    });
    return data || [];
  },
};

// ─── Fallback localStorage (for Simulador which doesn't use Supabase) ───
const PREFIX = 'mybroker_';
export const storage = {
  async set(key, value) { try { localStorage.setItem(PREFIX + key, value); return { key, value }; } catch { return null; } },
  async get(key) { try { const v = localStorage.getItem(PREFIX + key); if (v === null) throw new Error(); return { key, value: v }; } catch { return null; } },
  async delete(key) { try { localStorage.removeItem(PREFIX + key); return { key, deleted: true }; } catch { return null; } },
  async list(prefix) { try { const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(PREFIX + prefix)) keys.push(k.replace(PREFIX, '')); } return { keys }; } catch { return { keys: [] }; } },
};

// ─── Supabase Auth ───────────────────────────────────────────────────────────
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const authHeaders = { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' };

export const auth = {
  async signIn(email, password) {
    const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error_description || data.msg || 'Erro ao entrar' };
    localStorage.setItem('sb_token', data.access_token);
    localStorage.setItem('sb_user', JSON.stringify(data.user));
    return { user: data.user };
  },

  async signUp(email, password) {
    const res = await fetch(`${AUTH_URL}/signup`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error_description || data.msg || 'Erro ao criar conta' };
    return { user: data.user };
  },

  async signOut() {
    const token = localStorage.getItem('sb_token');
    if (token) {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST', headers: { ...authHeaders, 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('sb_user')); } catch { return null; }
  },

  getToken() {
    return localStorage.getItem('sb_token');
  },

  isLoggedIn() {
    return !!localStorage.getItem('sb_token');
  },
};
