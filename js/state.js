// Verifica se está rodando localmente (Sandbox) ou na nuvem (Produção)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Configurações Globais seladas para evitar sobreposição (Production Standard)
export const CONFIG = Object.freeze({
    // Alterna a URL da API automaticamente baseado no ambiente
    API_BASE: isLocalhost 
        ? 'http://localhost:8000' 
        : 'https://arcaika-solicitacoes-backend-production.up.railway.app',
        
    REQUEST_TIMEOUT_MS: 15000 // 15s de tolerância por request
});

// Controle de Estado da Aplicação
export const AppState = {
    currentView: 'location',
    selectedLocalId: null,
    selectedLocalName: null,
    token: localStorage.getItem('arcaika_token') || null,
    user: JSON.parse(localStorage.getItem('arcaika_user')) || null,
    
    // State de UI isolado
    admin: {
        currentLocalId: '',
        requests: [],
        page: 1,
        limit: 10,
        hasMore: true,
        isLoading: false
    }
};