const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const CONFIG = Object.freeze({
    API_BASE: isLocalhost 
        ? 'http://localhost:8000' 
        : 'https://arcaika-solicitacoes-backend-production.up.railway.app',
    REQUEST_TIMEOUT_MS: 15000
});

export const AppState = {
    currentView: 'location',
    selectedLocalId: null,
    selectedLocalName: null,
    token: localStorage.getItem('arcaika_token') || null,
    user: JSON.parse(localStorage.getItem('arcaika_user')) || null,
    
    // ESTADO ADMIN: Refatorado para suportar filtros combinados simultaneamente
    admin: {
        currentLocalId: '',
        currentStatus: 'criado', // 'criado', 'em_andamento', 'concluido' ou '' (todos)
        requests: [],
        page: 1,
        limit: 15,
        hasMore: true,
        isLoading: false
    },

    localUser: {
        requests: [],
        page: 1,
        limit: 15,
        hasMore: true,
        isLoading: false
    }
};