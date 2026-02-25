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
}