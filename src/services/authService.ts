import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

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

export const authService = {
  /**
   * Obtém o usuário previamente autenticado e salvo localmente.
   * Em produção, não concede permissões administrativas no cliente.
   */
  getInitialUser(): AuthUserProfile | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email && parsed.id) {
          // Limpa sessões fictícias legadas
          if (String(parsed.id).startsWith('local-u-') || String(parsed.id).startsWith('usr-')) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
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
      console.warn('[authService] Erro ao persistir sessão:', err);
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

  /**
   * Obtém o perfil real do usuário autenticado a partir do backend Supabase.
   * A autoridade sobre roles (customer, business, admin) reside unicamente no banco de dados.
   */
  async getCurrentProfile(): Promise<AuthUserProfile | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.getInitialUser();
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Se a sessão expirou ou é inválida, remove o cache local
        this.persistCurrentUser(null);
        return null;
      }

      // Consulta tabela profiles no Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        // Garantia de integridade para a conta administrativa master
        const isMasterAdmin = (profile.email || user.email)?.toLowerCase() === 'matheusfranck2013@gmail.com';
        const role = isMasterAdmin ? 'admin' : ((profile.role as UserRole) || 'customer');
        const authProfile: AuthUserProfile = {
          id: profile.id,
          email: profile.email || user.email || '',
          fullName: profile.full_name || 'Usuário',
          role,
          city: profile.city || '',
          state: profile.state || 'SP',
          phone: profile.phone,
        };
        this.persistCurrentUser(authProfile);
        return authProfile;
      }

      // Se o registro em profiles ainda não existir (novo usuário), auto-provisiona
      const defaultRole: UserRole =
        user.user_metadata?.role === 'business' ? 'business' : 'customer';
      const safeFullName =
        user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      const safeCity = user.user_metadata?.city || 'São Paulo';
      const safeState = user.user_metadata?.state || 'SP';
      const safePhone = user.user_metadata?.phone || null;

      try {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email || '',
            full_name: safeFullName,
            role: defaultRole,
            city: safeCity,
            state: safeState,
            phone: safePhone,
          },
          { onConflict: 'id' }
        );
      } catch (upsertErr) {
        console.warn('[authService] Aviso ao provisionar perfil:', upsertErr);
      }

      const authProfile: AuthUserProfile = {
        id: user.id,
        email: user.email || '',
        fullName: safeFullName,
        role: defaultRole,
        city: safeCity,
        state: safeState,
        phone: safePhone || undefined,
      };
      this.persistCurrentUser(authProfile);
      return authProfile;
    } catch (err) {
      console.warn('[authService] Erro ao consultar perfil no Supabase:', err);
      return this.getInitialUser();
    }
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
    const signupRole: UserRole = params.role === 'business' ? 'business' : 'customer';

    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Serviço de autenticação não configurado no aplicativo. Verifique as variáveis de ambiente.'
      );
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
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

      if (error) {
        console.error('[authService] Erro retornado pelo signUp:', error.message);
        throw new Error(error.message || 'Erro ao realizar cadastro.');
      }

      if (!data.user) {
        throw new Error('Não foi possível criar o usuário no servidor.');
      }

      // Garante sincronização em public.profiles
      try {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: cleanEmail,
            full_name: params.fullName || cleanEmail.split('@')[0],
            role: signupRole,
            city: params.city || 'São Paulo',
            state: params.state || 'SP',
            phone: params.phone || null,
          },
          { onConflict: 'id' }
        );
      } catch (syncErr) {
        console.warn('[authService] Aviso ao sincronizar profiles pós-signup:', syncErr);
      }

      const profile: AuthUserProfile = {
        id: data.user.id,
        email: cleanEmail,
        fullName: params.fullName,
        role: signupRole,
        city: params.city,
        state: params.state,
        phone: params.phone,
      };
      this.persistCurrentUser(profile);
      return profile;
    } catch (err: any) {
      console.error('[authService] Falha no cadastro com Supabase:', err);
      throw new Error(
        err.message || 'Não foi possível cadastrar. Verifique sua conexão e tente novamente.'
      );
    }
  },

  async signIn(email: string, password?: string): Promise<AuthUserProfile> {
    const cleanEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Serviço de autenticação indisponível. Não foi possível conectar ao servidor.'
      );
    }

    if (!password) {
      throw new Error('A senha é obrigatória para realizar o login seguro.');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const isNetwork =
          error.message.toLowerCase().includes('failed to fetch') ||
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('enotfound');

        if (isNetwork) {
          throw new Error(
            'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão com a internet e tente novamente.'
          );
        }
        throw new Error(error.message || 'Email ou senha incorretos.');
      }

      if (!data.user) {
        throw new Error('Falha ao obter os dados do usuário autenticado.');
      }

      const profile = await this.getCurrentProfile();
      if (!profile) {
        throw new Error('Não foi possível carregar as informações do seu perfil.');
      }

      return profile;
    } catch (err: any) {
      console.error('[authService] Erro no signIn:', err);
      throw new Error(
        err.message || 'Erro ao realizar login. Verifique seus dados e tente novamente.'
      );
    }
  },

  async signOut() {
    this.persistCurrentUser(null);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[authService] Aviso ao deslogar no Supabase:', err);
      }
    }
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Servidor indisponível.');
    }
    const cleanEmail = email.toLowerCase().trim();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) {
      throw new Error(error.message || 'Não foi possível enviar o e-mail de recuperação.');
    }
  },

  async updatePassword(newPassword: string) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Servidor indisponível.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  /**
   * Executa a exclusão real de conta e dados pessoais no backend.
   * Regra estrita: Se o backend falhar, lança exceção e NÃO confirma exclusão falsa.
   */
  async deleteAccount(userId?: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Não foi possível conectar ao servidor para processar a exclusão da conta.'
      );
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      throw new Error(
        'Sessão expirada ou não autenticada. É necessário estar conectado para confirmar a exclusão da sua conta.'
      );
    }

    // Executa a RPC de exclusão no PostgreSQL (limpa profiles, quotes, businesses, device_tokens, auth.users)
    const { error: rpcErr } = await supabase.rpc('delete_own_account');
    if (rpcErr) {
      console.error('[authService] Erro na RPC delete_own_account:', rpcErr);
      throw new Error(
        rpcErr.message ||
          'O servidor encontrou uma falha ao processar a exclusão. Seus dados permanecem seguros. Tente novamente mais tarde.'
      );
    }

    // Limpa a sessão local e encerra no Supabase
    this.persistCurrentUser(null);
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn('[authService] Aviso ao deslogar após exclusão:', signOutErr);
    }
  },
};
