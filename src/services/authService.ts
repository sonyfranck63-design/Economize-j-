import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

export const ADMIN_EMAILS = ['matheusfranck2013@gmail.com'];

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  city: string;
  state: string;
  phone?: string;
}

const AUTH_STORAGE_KEY = 'economizaja_auth_user';
const LOCAL_USERS_KEY = 'economizaja_local_users';

// Contas padrão de demonstração / desenvolvimento
const DEFAULT_LOCAL_USERS: AuthUserProfile[] = [
  {
    id: 'usr-admin-master',
    email: 'matheusfranck2013@gmail.com',
    fullName: 'Matheus Franck (Admin Master)',
    role: 'admin',
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 99999-0001',
  },
  {
    id: 'usr-parceiro-loja',
    email: 'loja@economizaja.com',
    fullName: 'Loja Parceira Modelo',
    role: 'business',
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 98888-0002',
  },
  {
    id: 'usr-consumidor-padrao',
    email: 'cliente@economizaja.com',
    fullName: 'Cliente Consumidor',
    role: 'customer',
    city: 'São Paulo',
    state: 'SP',
    phone: '(11) 97777-0003',
  },
];

function getStoredLocalUsers(): AuthUserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_LOCAL_USERS));
      return DEFAULT_LOCAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LOCAL_USERS;
  }
}

function saveLocalUser(user: AuthUserProfile) {
  try {
    const users = getStoredLocalUsers();
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Erro ao salvar usuário local no localStorage:', err);
  }
}

export const authService = {
  getInitialUser(): AuthUserProfile | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) {
          // Garante que o email do administrador mestre sempre tenha role 'admin'
          if (ADMIN_EMAILS.includes(parsed.email.toLowerCase().trim())) {
            parsed.role = 'admin';
          }
          return parsed;
        }
      }
    } catch {
      // Ignora erro de parse
    }
    return null;
  },

  persistCurrentUser(user: AuthUserProfile | null) {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Erro ao persistir sessão:', err);
    }
  },

  async getCurrentSession() {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return null;
      return data.session;
    } catch {
      return null;
    }
  },

  async getCurrentProfile(): Promise<AuthUserProfile | null> {
    // 1. Se o Supabase estiver configurado, tenta buscar a sessão real do Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (!profileError && profile) {
              const finalRole: UserRole = isAdminEmail ? 'admin' : (profile.role as UserRole);
              const authProfile: AuthUserProfile = {
                id: profile.id,
                email: profile.email || user.email || '',
                fullName: profile.full_name || 'Usuário',
                role: finalRole,
                city: profile.city || '',
                state: profile.state || 'SP',
                phone: profile.phone,
              };
              this.persistCurrentUser(authProfile);
              return authProfile;
            }
          } catch (profileCatchErr) {
            console.warn('Aviso ao consultar tabela profiles:', profileCatchErr);
          }

          // Fallback usando metadados do auth.user
          const assignedRole: UserRole = isAdminEmail
            ? 'admin'
            : (user.user_metadata?.role === 'business' ? 'business' : 'customer');

          const authProfile: AuthUserProfile = {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
            role: assignedRole,
            city: user.user_metadata?.city || '',
            state: user.user_metadata?.state || 'SP',
            phone: user.user_metadata?.phone,
          };
          this.persistCurrentUser(authProfile);
          return authProfile;
        }
      } catch (e) {
        console.warn('Supabase offline ou falha ao verificar perfil:', e);
      }
    }

    // 2. Fallback: lê a sessão salva localmente
    return this.getInitialUser();
  },

  async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    city: string;
    state: string;
    phone?: string;
  }): Promise<AuthUserProfile> {
    const cleanEmail = params.email.toLowerCase().trim();
    const isMasterAdmin = ADMIN_EMAILS.includes(cleanEmail);
    const signupRole: UserRole = isMasterAdmin ? 'admin' : (params.role === 'business' ? 'business' : 'customer');

    // 1. Tenta Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              role: signupRole,
              city: params.city,
              state: params.state,
              phone: params.phone || '',
            },
          },
        });

        if (!error && data.user) {
          const profile: AuthUserProfile = {
            id: data.user.id,
            email: params.email,
            fullName: params.fullName,
            role: signupRole,
            city: params.city,
            state: params.state,
            phone: params.phone,
          };
          this.persistCurrentUser(profile);
          saveLocalUser(profile);
          return profile;
        } else if (error) {
          console.warn('Erro retornado pelo Supabase signUp:', error.message);
        }
      } catch (networkErr: any) {
        console.warn('Falha de rede com Supabase no cadastro:', networkErr?.message);
      }
    }

    // 2. Modo Local / Fallback Resiliente
    const localProfile: AuthUserProfile = {
      id: `local-u-${Date.now()}`,
      email: cleanEmail,
      fullName: params.fullName || cleanEmail.split('@')[0],
      role: signupRole,
      city: params.city || 'São Paulo',
      state: params.state || 'SP',
      phone: params.phone || '',
    };
    saveLocalUser(localProfile);
    this.persistCurrentUser(localProfile);
    return localProfile;
  },

  async signIn(email: string, password?: string): Promise<AuthUserProfile> {
    const cleanEmail = email.toLowerCase().trim();
    const isMasterAdmin = ADMIN_EMAILS.includes(cleanEmail);

    // 1. Tenta Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password || '',
        });

        if (!error && data.user) {
          const profile = await this.getCurrentProfile();
          if (profile) return profile;
        } else if (error) {
          const isNetworkError = error.message.toLowerCase().includes('failed to fetch') ||
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('enotfound');
          if (!isNetworkError) {
            // Se foi erro de senha incorreta em um Supabase conectado e ativo:
            throw new Error('Email ou senha incorretos no Supabase.');
          }
          console.warn('Servidor Supabase offline ou inacessível. Acionando autenticação local.');
        }
      } catch (err: any) {
        if (err.message && err.message.includes('incorretos')) {
          throw err;
        }
        console.warn('Supabase offline ou projeto pausado. Alternando para modo local:', err?.message);
      }
    }

    // 2. Modo Local / Fallback Resiliente — SOMENTE quando Supabase está offline/inacessível
    // NUNCA deve ser ativado quando Supabase está configurado e respondendo normalmente
    const localUsers = getStoredLocalUsers();
    const foundUser = localUsers.find(u => u.email.toLowerCase() === cleanEmail);

    if (foundUser) {
      const activeUser: AuthUserProfile = {
        ...foundUser,
        role: isMasterAdmin ? 'admin' : foundUser.role,
      };
      this.persistCurrentUser(activeUser);
      return activeUser;
    }

    // Se Supabase está configurado mas offline, permite apenas usuários já cadastrados localmente
    if (isSupabaseConfigured) {
      throw new Error('Não foi possível conectar ao servidor de autenticação. Verifique sua conexão com a internet e tente novamente.');
    }

    // Apenas em modo de desenvolvimento/demonstração (sem Supabase), permite acesso sem senha
    const newLocalUser: AuthUserProfile = {
      id: `local-u-${Date.now()}`,
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].replace(/[._]/g, ' '),
      role: isMasterAdmin ? 'admin' : 'customer',
      city: 'São Paulo',
      state: 'SP',
    };
    saveLocalUser(newLocalUser);
    this.persistCurrentUser(newLocalUser);
    return newLocalUser;

  },

  async signOut() {
    this.persistCurrentUser(null);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Aviso ao deslogar no Supabase:', err);
      }
    }
  },

  async resetPassword(email: string) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return;
      } catch (err: any) {
        console.warn('Erro ao solicitar reset via Supabase:', err);
      }
    }
    // Fallback local informativo
    return;
  },

  async updatePassword(newPassword: string) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    }
  },

  async deleteAccount(userId: string) {
    this.persistCurrentUser(null);

    // Remove das contas locais
    try {
      const users = getStoredLocalUsers().filter(u => u.id !== userId);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Erro ao limpar conta local:', e);
    }

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      await supabase.rpc('delete_own_account');
    } catch {
      // Ignora erro
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erro
    }
  },
};
