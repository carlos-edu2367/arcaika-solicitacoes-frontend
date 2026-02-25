import { CONFIG, AppState } from './state.js';

export class ApiService {
    static async request(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        
        if (AppState.token) headers['Authorization'] = `Bearer ${AppState.token}`;
        if (options.body instanceof FormData) delete headers['Content-Type'];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
        options.signal = controller.signal;

        try {
            const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, { ...options, headers });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.dispatchEvent(new Event('auth:unauthorized'));
                }
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = `Erro do Servidor (${response.status})`;
                
                if (errorData.detail) {
                    errorMessage = Array.isArray(errorData.detail) 
                        ? errorData.detail.map(e => `${e.loc[e.loc.length-1]}: ${e.msg}`).join(' | ')
                        : errorData.detail;
                }
                throw new Error(errorMessage);
            }
            
            const text = await response.text();
            return text ? JSON.parse(text) : null;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') throw new Error("A conexão expirou. O servidor demorou muito para responder.");
            throw new Error(error.message || "Falha de conexão com a API.");
        }
    }

    // --- AUTENTICAÇÃO ---
    static async login(email, senha) { return this.request('/user/login', { method: 'POST', body: JSON.stringify({ email, senha }) }); }

    // --- LOCAIS ---
    static async getLocais(city, state) { return this.request(`/requests/locais?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`); }
    static async getLocalById(id) { return this.request(`/requests/local?local_id=${id}`); }
    static async createLocal(data) { return this.request(`/requests/local`, { method: 'POST', body: JSON.stringify(data) }); }

    // --- SOLICITAÇÕES ---
    static async createSolicitacao(data) {
        const prioridadeMap = { 'BAIXA': 'baixa', 'MEDIA': 'média', 'ALTA': 'alta' };
        const payload = {
            ...data,
            prioridade: prioridadeMap[data.prioridade?.toUpperCase() || 'BAIXA'],
            informacoes_adicionais: data.informacoes_adicionais?.trim() || null
        };
        return this.request(`/requests/local/solicitacao`, { method: 'POST', body: JSON.stringify(payload) });
    }

    static async uploadAnexo(file, solicitacao_id) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('solicitacao_id', solicitacao_id);
        return this.request('/requests/local/solicitacao/anexo', { method: 'POST', body: formData });
    }

    static async getSolicitacoes(local_id, page, limit) {
        return this.request(`/requests/local/solicitacoes?local_id=${local_id}&page=${page}&limit=${limit}`);
    }

    static async getSolicitacaoById(id) {
        return this.request(`/requests/local/solicitacao?solicitacao_id=${id}`);
    }

    // NOVAS ROTAS IMPLEMENTADAS
    static async getSolicitacoesByStatus(status, page, limit) {
        return this.request(`/requests/solicitacoes/status?status=${status}&page=${page}&limit=${limit}`);
    }

    static async updateSolicitacaoStatus(id, newStatus) {
        return this.request(`/requests/local/solicitacao/status?solicitacao_id=${id}&new_status=${newStatus}`, { method: 'PUT' });
    }
}