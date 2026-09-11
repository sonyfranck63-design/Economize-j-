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

    const userEmail = (user.email || '').toLowerCase().trim();
    const isAdminEmail = ADMIN_EMAILS.includes(userEmail);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Non-master users can NEVER be assigned 'admin' from metadata
      const assignedRole: UserRole = isAdminEmail ? 'admin' : (user.user_metadata?.role === 'business' ? 'business' : 'customer');
      // Garante que exista o registro em profiles para o usuário autenticado caso o trigger não tenha disparado
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Usuário',
          email: user.email || '',
          role: assignedRole,
        });
      } catch (upsertErr) {
        console.warn('Aviso ao sincronizar profiles:', upsertErr);
      }

      return {
        id: user.id,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || 'Usuário',
        role: assignedRole,
        city: user.user_metadata?.city || '',
        state: user.user_metadata?.state || 'SP',
        phone: user.user_metadata?.phone,
      };
    }

    const finalRole: UserRole = isAdminEmail ? 'admin' : (profile.role as UserRole);

    // Se é o e-mail do administrador master mas o banco ainda tinha 'customer', sincroniza no banco
    if (isAdminEmail && profile.role !== 'admin') {
      supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id).then();
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: finalRole,
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

    const cleanEmail = params.email.toLowerCase().trim();
    const isMasterAdmin = ADMIN_EMAILS.includes(cleanEmail);
    // Non-master users can only register as customer or business
    const signupRole: UserRole = isMasterAdmin ? 'admin' : (params.role === 'business' ? 'business' : 'customer');

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

    if (error) {
      if (error.message.toLowerCase().includes('database error saving new user')) {
        throw new Error('Erro ao salvar usuário no banco de dados (gatilho de cadastro). Execute a migration 00015 no SQL Editor do Supabase para atualizar as permissões e o gatilho handle_new_user.');
      }
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
      return;
    }

    let rpcSucceeded = false;

    // 1. Tenta chamar a RPC segura do Supabase (se já instalada no banco)
    try {
      const { error } = await supabase.rpc('delete_own_account');
      if (!error) {
        rpcSucceeded = true;
      } else {
        console.warn('RPC delete_own_account não configurada ou retornou aviso:', error.message);
      }
    } catch (rpcErr) {
      console.warn('Erro ao chamar RPC delete_own_account:', rpcErr);
    }

    // 2. Se a RPC não estiver disponível no banco ainda, realiza a limpeza dos dados acessíveis
    if (!rpcSucceeded && userId) {
      // Remove favoritos
      try {
        await supabase.from('favorites').delete().eq('user_id', userId);
      } catch (err) {
        console.warn('Aviso ao remover favoritos na exclusão:', err);
      }

      // Remove pedidos de cotação do usuário
      try {
        await supabase.from('quote_requests').delete().eq('user_id', userId);
      } catch (err) {
        console.warn('Aviso ao remover quote_requests na exclusão:', err);
      }

      // Desativa empresas vinculadas ao usuário
      try {
        await supabase.from('businesses').update({ active: false }).eq('owner_id', userId);
      } catch (err) {
        console.warn('Aviso ao desativar businesses na exclusão:', err);
      }

      // Tenta remover ou anonimizar o perfil do usuário
      try {
        const { error: delProfileErr } = await supabase.from('profiles').delete().eq('id', userId);
        if (delProfileErr) {
          // Se houver restrição de RLS ou foreign key, anonimiza os dados do usuário
          await supabase.from('profiles').update({
            full_name: 'Usuário Excluído',
            phone: null,
            city: '',
            state: '',
            neighborhood: null,
            avatar_url: null,
            role: 'customer',
          }).eq('id', userId);
        }
      } catch (err) {
        console.warn('Aviso ao limpar perfil na exclusão:', err);
      }
    }

    // 3. Desloga a sessão do usuário de qualquer forma
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn('Aviso ao deslogar na exclusão de conta:', signOutErr);
    }
  },
};
