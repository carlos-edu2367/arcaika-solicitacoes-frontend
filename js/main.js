import { AppState } from './state.js';
import { UI } from './ui.js';
import { ApiService } from './api.js';
import { AuthController } from './auth.js';
import { ClientController } from './client.js';
import { AdminController } from './admin.js';
import { LocalUserController } from './local_user.js'; 

window.UI = UI;
window.AdminController = AdminController;
window.ClientController = ClientController;
window.AuthController = AuthController;
window.LocalUserController = LocalUserController; 

const App = {
    async init() {
        lucide.createIcons();
        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
        
        this.setDefaultLocation(); 
        this.setupGlobalHandlers();
        this.bindDOMEvents();
        this.setupInfiniteScroll();
        
        const urlParams = new URLSearchParams(window.location.search);
        const localParam = urlParams.get('local');
        
        if (localParam) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if(uuidRegex.test(localParam)) {
                AppState.selectedLocalId = localParam;
                try {
                    const localInfo = await ApiService.getLocalById(localParam);
                    AppState.selectedLocalName = `${localInfo.nome} - ${localInfo.cidade}/${localInfo.estado}`;
                } catch (error) {
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
        const cityInput = document.getElementById('search-city');
        const ufSelect = document.getElementById('search-uf');
        if (cityInput && !cityInput.value) cityInput.value = 'Senador Canedo';
        if (ufSelect && !ufSelect.value) ufSelect.value = 'GO';
    },

    setupGlobalHandlers() {
        window.addEventListener('app:navigate', (e) => this.navigate(e.detail.view));
        window.addEventListener('app:toast', (e) => UI.showToast(e.detail.message, e.detail.type));
        window.addEventListener('auth:unauthorized', () => AuthController.logout());
        window.addEventListener('auth:state-change', () => this.checkAuthAndRoute());
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error("[CRITICAL] Unhandled Promise Rejection:", event.reason);
            UI.showToast("Ocorreu um erro interno de conexão.", "error");
        });
    },

    checkAuthAndRoute() {
        this.updateHeader();
        const userRole = AppState.user?.role ? String(AppState.user.role).toUpperCase() : null;

        if (AppState.token) {
            if (userRole === 'ADMIN') {
                this.navigate('admin');
                AdminController.initDashboard();
            } else if (userRole === 'LOCAL_USER') {
                this.navigate('local-user');
                LocalUserController.initDashboard();
            } else {
                this.navigate('location');
            }
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
            userNameDisplay.textContent = `Olá, ${UI.escapeHTML(AppState.user.nome?.split(' ')[0] || 'Usuário')}`;
        } else {
            adminControls.classList.add('hidden');
            adminControls.classList.remove('flex');
            btnLogin.classList.remove('hidden');
        }
    },

    navigate(viewName) {
        if(viewName === 'home') viewName = 'location';
        if(viewName === 'request' && !AppState.selectedLocalId) viewName = 'location';

        document.getElementById('view-location').classList.add('hidden-view');
        document.getElementById('view-request').classList.add('hidden-view');
        document.getElementById('view-admin').classList.add('hidden-view');
        const viewLocalUser = document.getElementById('view-local-user');
        if (viewLocalUser) viewLocalUser.classList.add('hidden-view');

        AppState.currentView = viewName;
        const viewEl = document.getElementById(`view-${viewName}`);
        if(viewEl) {
            viewEl.classList.remove('hidden-view');
            viewEl.style.animation = 'none';
            viewEl.offsetHeight;
            viewEl.style.animation = null;
        }

        if(viewName === 'request') {
            document.getElementById('display-selected-local').textContent = AppState.selectedLocalName || "Local Selecionado";
        }
    },

    bindDOMEvents() {
        document.getElementById('brand-logo')?.addEventListener('click', () => this.navigate('home'));
        document.getElementById('btn-logout')?.addEventListener('click', () => AuthController.logout());
        document.getElementById('btn-login-modal')?.addEventListener('click', () => UI.openModal('login-modal'));
        document.getElementById('btn-close-login')?.addEventListener('click', () => UI.closeModal('login-modal'));
        document.getElementById('btn-close-details')?.addEventListener('click', () => UI.closeModal('details-modal'));
        document.getElementById('btn-close-create-local')?.addEventListener('click', () => UI.closeModal('create-local-modal'));
        document.getElementById('btn-close-manage-local')?.addEventListener('click', () => UI.closeModal('manage-local-modal'));

        // Evento do botão NOVO: Painel
        document.getElementById('btn-dashboard')?.addEventListener('click', () => this.checkAuthAndRoute());

        document.getElementById('form-login')?.addEventListener('submit', (e) => AuthController.handleLogin(e));
        document.getElementById('form-search-local')?.addEventListener('submit', (e) => ClientController.searchLocais(e));
        document.getElementById('form-request')?.addEventListener('submit', (e) => ClientController.submitRequest(e));
        document.getElementById('form-create-local')?.addEventListener('submit', (e) => AdminController.handleCreateLocal(e));
        document.getElementById('form-create-local-user')?.addEventListener('submit', (e) => AdminController.handleCreateLocalUser(e));

        document.getElementById('btn-admin-search-locais')?.addEventListener('click', () => {
            const city = document.getElementById('admin-search-city')?.value;
            const state = document.getElementById('admin-search-uf')?.value;
            AdminController.searchLocaisAdmin(city, state);
        });

        // Binds dos Filtros Admin
        document.getElementById('admin-global-status')?.addEventListener('change', () => AdminController.changeFilters());
        document.getElementById('admin-local-select')?.addEventListener('change', () => AdminController.changeFilters());
        
        document.getElementById('req-anexos')?.addEventListener('change', (e) => ClientController.updateFileList(e.target));
        
        const btnCopyLink = document.getElementById('btn-copy-link');
        if (btnCopyLink) btnCopyLink.addEventListener('click', () => AdminController.copyLocalLink());

        document.getElementById('local-results')?.addEventListener('click', (e) => {
            const item = e.target.closest('.local-item');
            if (item) ClientController.selectLocal(item.dataset.id, item.dataset.name);
        });

        document.getElementById('admin-requests-list')?.addEventListener('click', (e) => {
            const item = e.target.closest('.request-item');
            if (item) AdminController.openDetails(item.dataset.id);
        });

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
            if(entries[0].isIntersecting) {
                if(AppState.currentView === 'admin') AdminController.loadRequests();
                if(AppState.currentView === 'local-user') LocalUserController.loadRequests();
            }
        }, { threshold: 0.1 });
        
        const triggerAdmin = document.getElementById('load-more-trigger');
        const triggerLocal = document.getElementById('local-user-load-more');
        
        if(triggerAdmin) observer.observe(triggerAdmin);
        if(triggerLocal) observer.observe(triggerLocal);
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });