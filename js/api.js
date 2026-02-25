import { CONFIG, AppState } from './state.js';

export class ApiService {
    // Método centralizado com AbortController para evitar requests infinitos
    static async request(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        
        // Injeta o Token Bearer automaticamente se o usuário estiver logado
        if (AppState.token) headers['Authorization'] = `Bearer ${AppState.token}`;
        
        // Se for upload de arquivo (FormData), o browser precisa definir o Content-Type automaticamente com o boundary
        if (options.body instanceof FormData) delete headers['Content-Type'];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
        options.signal = controller.signal;

        try {
            const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, { ...options, headers });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // Se o token expirar ou não tiver permissão (Admin)
                if (response.status === 401 || response.status === 403) {
                    window.dispatchEvent(new Event('auth:unauthorized'));
                }
                
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = `Erro do Servidor (${response.status})`;
                
                // FastAPI retorna array de erros no 422 (Validation Error). 
                // Isso vai extrair exatamente qual campo falhou (ex: "prioridade: value is not valid")
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(e => `${e.loc[e.loc.length-1]}: ${e.msg}`).join(' | ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            const text = await response.text();
            // Retorno do UUID: o FastAPI retorna como string ("123..."), e o JSON.parse extrai e limpa as aspas perfeitamente
            return text ? JSON.parse(text) : null;

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error("A conexão expirou. O servidor demorou muito para responder.");
            }
            // Não expõe exceções cruas não tratadas
            throw new Error(error.message || "Falha de conexão com a API.");
        }
    }

    // --- ROTAS DE USUÁRIO E AUTENTICAÇÃO ---
    
    static async login(email, senha) {
        return this.request('/user/login', { 
            method: 'POST', 
            body: JSON.stringify({ email, senha }) 
        });
    }

    // --- ROTAS DE LOCAIS ---

    static async getLocais(city, state) {
        return this.request(`/requests/locais?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`);
    }

    static async getLocalById(id) {
        return this.request(`/requests/local?local_id=${id}`);
    }

    static async createLocal(data) {
        return this.request(`/requests/local`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // --- ROTAS DE SOLICITAÇÕES ---

    static async createSolicitacao(data) {
        // Mapeamento exato para o Enum do Python (exigência de acentuação do Pydantic)
        const prioridadeMap = {
            'BAIXA': 'baixa',
            'MEDIA': 'média',
            'ALTA': 'alta'
        };

        const prioridadeKey = data.prioridade ? data.prioridade.toUpperCase() : 'BAIXA';

        // Normalização do payload para evitar o Erro 422 (Unprocessable Entity) do FastAPI
        const payload = {
            ...data,
            prioridade: prioridadeMap[prioridadeKey] || 'baixa',
            // Se o campo info adicional for string vazia (""), transformamos em null para respeitar o Optional[str] = None
            informacoes_adicionais: data.informacoes_adicionais?.trim() || null
        };

        return this.request(`/requests/local/solicitacao`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    static async uploadAnexo(file, solicitacao_id) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('solicitacao_id', solicitacao_id);
        
        return this.request('/requests/local/solicitacao/anexo', { 
            method: 'POST', 
            body: formData 
        });
    }

    static async getSolicitacoes(local_id, page, limit) {
        return this.request(`/requests/local/solicitacoes?local_id=${local_id}&page=${page}&limit=${limit}`);
    }

    static async getSolicitacaoById(id) {
        return this.request(`/requests/local/solicitacao?solicitacao_id=${id}`);
    }
}