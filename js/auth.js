import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class AuthController {
    static async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        
        UI.setButtonLoading('btn-submit-login', true, 'Entrar');
        try {
            const res = await ApiService.login(email, senha);
            
            if(res && res.access_token) {
                AppState.token = res.access_token;
                AppState.user = res.user;
                localStorage.setItem('arcaika_token', res.access_token);
                localStorage.setItem('arcaika_user', JSON.stringify(res.user));
                
                UI.closeModal('login-modal');
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: `Bem-vindo, ${res.user.nome}`, type: 'success' }}));
                
                // Despacha evento arquitetural para o Main Router
                window.dispatchEvent(new Event('auth:state-change'));
            }
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error.message, type: 'error' }}));
        } finally {
            UI.setButtonLoading('btn-submit-login', false, 'Entrar');
        }
    }

    static logout() {
        AppState.token = null;
        AppState.user = null;
        localStorage.removeItem('arcaika_token');
        localStorage.removeItem('arcaika_user');
        
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'location' }}));
        window.dispatchEvent(new Event('auth:state-change'));
    }

    static async handleChangePassword(e) {
        e.preventDefault();
        
        const oldPassword = document.getElementById('change-senha-atual').value;
        const newPassword = document.getElementById('change-senha-nova').value;
        const confirmPassword = document.getElementById('change-senha-confirmar').value;

        if (newPassword !== confirmPassword) {
            return UI.showToast("As novas senhas não coincidem.", "error");
        }

        if (!AppState.user || !AppState.user.email || !AppState.user.role) {
            return UI.showToast("Sessão inválida. Faça login novamente.", "error");
        }

        UI.setButtonLoading('btn-submit-change-password', true, 'Salvando...');
        
        try {
            const payload = {
                email: AppState.user.email,
                role: AppState.user.role,
                old_password: oldPassword,
                new_password: newPassword
            };

            await ApiService.changePassword(payload);
            
            UI.showToast("Senha alterada com sucesso!", "success");
            UI.closeModal('change-password-modal');
            document.getElementById('form-change-password').reset();
            
        } catch (error) {
            UI.showToast(error.message || "Erro ao trocar a senha.", "error");
        } finally {
            UI.setButtonLoading('btn-submit-change-password', false, '<i data-lucide="key" class="w-4 h-4"></i> Salvar Nova Senha');
        }
    }
}