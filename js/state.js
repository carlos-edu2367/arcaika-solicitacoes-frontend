// Configurações Globais seladas para evitar sobreposição (Production Standard)
export const CONFIG = Object.freeze({
    API_BASE: 'http://localhost:8000', // URL Base da API Real
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