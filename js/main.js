import { AppState } from './state.js';
import { UI } from './ui.js';
import { ApiService } from './api.js';
import { AuthController } from './auth.js';
import { ClientController } from './client.js';
import { AdminController } from './admin.js';

// Expondo controladores globalmente para compatibilidade com eventos inline no HTML (onclick, onchange)
window.UI = UI;
window.AdminController = AdminController;
window.ClientController = ClientController;
window.AuthController = AuthController;

const App = {
    // Agora o init é async para permitir a busca do nome do local via link
    async init() {
        lucide.createIcons();
        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
        
        this.setDefaultLocation(); // Define Senador Canedo - GO como padrão
        this.setupGlobalHandlers();
        this.bindDOMEvents();
        this.setupInfiniteScroll();
        
        const urlParams = new URLSearchParams(window.location.search);
        const localParam = urlParams.get('local');
        
        if (localParam) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if(uuidRegex.test(localParam)) {
                AppState.selectedLocalId = localParam;
                
                // Busca o nome real na nova rota que você adicionou
                try {
                    const localInfo = await ApiService.getLocalById(localParam);
                    AppState.selectedLocalName = `${localInfo.nome} - ${localInfo.cidade}/${localInfo.estado}`;
                } catch (error) {
                    console.warn("Erro ao buscar detalhes do local via link direto:", error);
                    // Fallback caso a API falhe ou o ID não exista mais
                    AppState.selectedLocalName = "Unidade Especial (Link Direto)";
                }
                
                this.navigate('request');
            } else {
                this.checkAuthAndRoute();
            }
        } else {
            this.checkAuthAndRoute();
        }
    },

    setDefaultLocation() {
        // Preenche os valores padrões para a busca do backend
        const cityInput = document.getElementById('search-city');
        const ufSelect = document.getElementById('search-uf');
        
        if (cityInput && !cityInput.value) {
            cityInput.value = 'Senador Canedo';
        }
        if (ufSelect && !ufSelect.value) {
            ufSelect.value = 'GO';
        }
    },

    setupGlobalHandlers() {
        // Event-Driven Architecture: Elimina importações/deps cruzadas severas.
        window.addEventListener('app:navigate', (e) => this.navigate(e.detail.view));
        window.addEventListener('app:toast', (e) => UI.showToast(e.detail.message, e.detail.type));
        window.addEventListener('auth:unauthorized', () => AuthController.logout());
        window.addEventListener('auth:state-change', () => this.checkAuthAndRoute());
        
        // Error Boundary (Production Standard)
        window.addEventListener('unhandledrejection', (event) => {
            console.error("[CRITICAL] Unhandled Promise Rejection:", event.reason);
            UI.showToast("Ocorreu um erro interno. Tente novamente.", "error");
        });
    },

    checkAuthAndRoute() {
        this.updateHeader();
        
        // Normaliza a Role para caixa alta. Previne bugs se o backend enviar 'admin' em minúsculo
        const userRole = AppState.user?.role ? String(AppState.user.role).toUpperCase() : null;

        // Segurança estrita checando Role e Token existence
        if(AppState.token && userRole === 'ADMIN') {
            this.navigate('admin');
            AdminController.initDashboard();
        } else {
            this.navigate('location');
        }
    },

    updateHeader() {
        const adminControls = document.getElementById('admin-controls');
        const btnLogin = document.getElementById('btn-login-modal');
        const userNameDisplay = document.getElementById('user-name-display');

        if (AppState.token && AppState.user) {
            adminControls.classList.remove('hidden');
            adminControls.classList.add('flex');
            btnLogin.classList.add('hidden');
            
            // Adicionado optional chaining no split para evitar erros se o nome vier vazio
            userNameDisplay.textContent = `Olá, ${UI.escapeHTML(AppState.user.nome?.split(' ')[0] || 'Usuário')}`;
        } else {
            adminControls.classList.add('hidden');
            adminControls.classList.remove('flex');
            btnLogin.classList.remove('hidden');
        }
    },

    navigate(viewName) {
        if(viewName === 'home') viewName = 'location';
        
        // Bloqueio de Segurança para o Form
        if(viewName === 'request' && !AppState.selectedLocalId) {
            viewName = 'location';
        }

        document.getElementById('view-location').classList.add('hidden-view');
        document.getElementById('view-request').classList.add('hidden-view');
        document.getElementById('view-admin').classList.add('hidden-view');

        AppState.currentView = viewName;

        const viewEl = document.getElementById(`view-${viewName}`);
        if(viewEl) {
            viewEl.classList.remove('hidden-view');
            // Reboot nas animações para reflow suave
            viewEl.style.animation = 'none';
            viewEl.offsetHeight;
            viewEl.style.animation = null;
        }

        if(viewName === 'request') {
            document.getElementById('display-selected-local').textContent = AppState.selectedLocalName || "Local Selecionado";
        }
    },

    bindDOMEvents() {
        // Event Listeners Centralizados garantindo conformidade com CSP Security rules
        document.getElementById('brand-logo')?.addEventListener('click', () => this.navigate('home'));
        document.getElementById('btn-logout')?.addEventListener('click', () => AuthController.logout());
        document.getElementById('btn-login-modal')?.addEventListener('click', () => UI.openModal('login-modal'));
        document.getElementById('btn-close-login')?.addEventListener('click', () => UI.closeModal('login-modal'));
        document.getElementById('btn-close-details')?.addEventListener('click', () => UI.closeModal('details-modal'));
        document.getElementById('btn-close-create-local')?.addEventListener('click', () => UI.closeModal('create-local-modal'));

        document.getElementById('form-login')?.addEventListener('submit', (e) => AuthController.handleLogin(e));
        document.getElementById('form-search-local')?.addEventListener('submit', (e) => ClientController.searchLocais(e));
        document.getElementById('form-request')?.addEventListener('submit', (e) => ClientController.submitRequest(e));
        document.getElementById('form-create-local')?.addEventListener('submit', (e) => AdminController.handleCreateLocal(e));

        document.getElementById('btn-admin-search-locais')?.addEventListener('click', () => {
            const city = document.getElementById('admin-search-city')?.value;
            const state = document.getElementById('admin-search-uf')?.value;
            AdminController.searchLocaisAdmin(city, state);
        });

        document.getElementById('admin-local-select')?.addEventListener('change', (e) => AdminController.changeLocal(e.target.value));
        document.getElementById('req-anexos')?.addEventListener('change', (e) => ClientController.updateFileList(e.target));
        
        const btnCopyLink = document.getElementById('btn-copy-link');
        if (btnCopyLink) btnCopyLink.addEventListener('click', () => AdminController.copyLocalLink());

        // Event Delegation para listas longas (Production Performance Boost)
        document.getElementById('local-results')?.addEventListener('click', (e) => {
            const item = e.target.closest('.local-item');
            if (item) ClientController.selectLocal(item.dataset.id, item.dataset.name);
        });

        document.getElementById('admin-requests-list')?.addEventListener('click', (e) => {
            const item = e.target.closest('.request-item');
            if (item) AdminController.openDetails(item.dataset.id);
        });

        // Configuração segura e isolada de Drag & Drop
        this.setupDragAndDrop();
    },

    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        if(!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        
        dropZone.addEventListener('dragover', () => dropZone.classList.add('border-brand-500', 'bg-brand-50'));
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-brand-500', 'bg-brand-50'));
        
        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('border-brand-500', 'bg-brand-50');
            const fileInput = document.getElementById('req-anexos');
            if(e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                ClientController.updateFileList(fileInput);
            }
        });
    },

    setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if(entries[0].isIntersecting && AppState.currentView === 'admin') {
                AdminController.loadRequests();
            }
        }, { threshold: 0.1 });
        
        const trigger = document.getElementById('load-more-trigger');
        if(trigger) observer.observe(trigger);
    }
};

// Bootstrap nativo seguro aguardando o processamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});