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

export const authService = {
  async getCurrentSession() {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session;
  },

  async getCurrentProfile(): Promise<AuthUserProfile | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || 'Usuário',
        role: (user.user_metadata?.role as UserRole) || 'customer',
        city: user.user_metadata?.city || 'São Paulo',
        state: user.user_metadata?.state || 'SP',
      };
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role as UserRole,
      city: profile.city,
      state: profile.state,
      phone: profile.phone,
    };
  },

  async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    city: string;
    state: string;
    phone?: string;
  }) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado. Por favor, adicione as chaves no arquivo .env.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          role: params.role,
          city: params.city,
          state: params.state,
          phone: params.phone || '',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado. Por favor, adicione as chaves no arquivo .env.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error('Email ou senha incorretos. Verifique suas credenciais.');
    }

    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  async updatePassword(newPassword: string) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async deleteAccount(userId: string) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase não configurado.');
    }

    // Chama exclusão dos dados de perfil e vínculos
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      throw new Error(`Erro ao excluir perfil: ${error.message}`);
    }

    // Executa logout do usuário
    await supabase.auth.signOut();
  },
};
