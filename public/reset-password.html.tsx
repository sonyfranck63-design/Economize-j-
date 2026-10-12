<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Redefinir Senha — EconomizaJá</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #059669;
      --primary-dark: #047857;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    form { display: flex; flex-direction: column; gap: 16px; }
    label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #334155;
      display: block;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
    }
    input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }
    button {
      background: var(--primary);
      color: #ffffff;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      border: none;
      border-radius: 12px;
      cursor: pointer;
    }
    button:hover { background: var(--primary-dark); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .feedback {
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      margin-bottom: 20px;
      display: none;
    }
    .feedback.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; display: block; }
    .feedback.error { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; display: block; }
    .feedback.info { background: #f1f5f9; border: 1px solid var(--border); color: #334155; display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redefinir senha</h1>
    <div class="subtitle">EconomizaJá • Crie uma nova senha para sua conta</div>

    <div id="feedbackBox" class="feedback info">Validando o link de recuperação...</div>

    <form id="resetForm" style="display: none;">
      <div>
        <label for="passwordInput">Nova senha</label>
        <input type="password" id="passwordInput" required minlength="6" autocomplete="new-password" placeholder="Mínimo de 6 caracteres">
      </div>
      <div>
        <label for="confirmInput">Confirme a nova senha</label>
        <input type="password" id="confirmInput" required minlength="6" autocomplete="new-password">
      </div>
      <button type="submit" id="submitBtn">Salvar nova senha</button>
    </form>
  </div>

  <script type="module">
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

    const SUPABASE_URL = "https://hycixtbsczawkzrjswbx.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y2l4dGJzY3phd2t6cmpzd2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTkxMzMsImV4cCI6MjEwNDE3NTEzM30.gt8F5-L33lkO2DJ8BZCweg2dv2XJjaovek3ZehnycfU";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: true, persistSession: false },
    });

    const form = document.getElementById('resetForm');
    const feedback = document.getElementById('feedbackBox');
    const submitBtn = document.getElementById('submitBtn');

    const show = (type, html) => {
      feedback.className = 'feedback ' + type;
      feedback.innerHTML = html;
    };

    let ready = false;
    const enableForm = () => {
      if (ready) return;
      ready = true;
      feedback.className = 'feedback';
      form.style.display = 'flex';
    };

    supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) enableForm();
    });

    // Fallback: a sessão pode já ter sido criada antes do listener
    setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        enableForm();
      } else if (!ready) {
        show('error', 'Link inválido ou expirado. Abra o aplicativo EconomizaJá e solicite um novo e-mail em <strong>Esqueci minha senha</strong>.');
      }
    }, 1500);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('passwordInput').value;
      const confirm = document.getElementById('confirmInput').value;

      if (password !== confirm) {
        show('error', 'As senhas não coincidem.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        form.style.display = 'none';
        show('success', '<strong>Senha alterada!</strong> Volte ao aplicativo EconomizaJá e entre com a nova senha.');
      } catch (err) {
        show('error', err.message || 'Não foi possível alterar a senha. Solicite um novo link.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar nova senha';
      }
    });
  </script>
</body>
</html>
