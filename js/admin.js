import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class AdminController {
    static async initDashboard() {
        // Ao inicializar, lê os valores pré-preenchidos e faz a busca
        const cityInput = document.getElementById('admin-search-city');
        const ufSelect = document.getElementById('admin-search-uf');
        if(cityInput && ufSelect) {
            await this.searchLocaisAdmin(cityInput.value, ufSelect.value);
        }
    }

    static async searchLocaisAdmin(city, state) {
        const btn = document.getElementById('btn-admin-search-locais');
        if(btn) UI.setButtonLoading('btn-admin-search-locais', true, '<i data-lucide="search" class="w-4 h-4"></i> Filtrar');
        
        try {
            const locais = await ApiService.getLocais(city, state); 
            const select = document.getElementById('admin-local-select');
            select.innerHTML = '<option value="">Selecione um Local...</option>';
            
            if(locais && locais.length > 0) {
                locais.forEach(l => {
                    select.innerHTML += `<option value="${UI.escapeHTML(l.id)}">${UI.escapeHTML(l.nome)} - ${UI.escapeHTML(l.cidade)}/${UI.escapeHTML(l.estado)}</option>`;
                });
            } else {
                select.innerHTML = '<option value="">Nenhum local encontrado</option>';
            }
            
            // Força o reset do painel de listagens
            this.changeLocal("");
            
        } catch(e) { 
            console.error("Falha ao buscar locais no Dashboard:", e);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Erro ao buscar locais.", type: 'error' }}));
        } finally {
            if(btn) UI.setButtonLoading('btn-admin-search-locais', false, '<i data-lucide="search" class="w-4 h-4"></i> Filtrar');
        }
    }

    static async handleCreateLocal(e) {
        e.preventDefault();
        const nome = document.getElementById('create-local-nome').value.trim();
        const cidade = document.getElementById('create-local-cidade').value.trim();
        const estado = document.getElementById('create-local-uf').value;

        UI.setButtonLoading('btn-submit-create-local', true, '<i data-lucide="save" class="w-4 h-4"></i> Salvar');
        
        try {
            await ApiService.createLocal({ nome, cidade, estado });
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Local cadastrado com sucesso!", type: 'success' }}));
            
            // Limpa form e fecha modal
            document.getElementById('form-create-local').reset();
            UI.closeModal('create-local-modal');
            
            // Automatiza a UX preenchendo o filtro com a cidade recém cadastrada e já busca
            const cityInput = document.getElementById('admin-search-city');
            const ufSelect = document.getElementById('admin-search-uf');
            if(cityInput) cityInput.value = cidade;
            if(ufSelect) ufSelect.value = estado;
            
            await this.searchLocaisAdmin(cidade, estado);

        } catch(error) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error.message || "Erro ao cadastrar local.", type: 'error' }}));
        } finally {
            UI.setButtonLoading('btn-submit-create-local', false, '<i data-lucide="save" class="w-4 h-4"></i> Salvar Local');
        }
    }

    static async changeLocal(localId) {
        AppState.admin.currentLocalId = localId;
        AppState.admin.page = 1;
        AppState.admin.requests = [];
        AppState.admin.hasMore = true;
        
        const list = document.getElementById('admin-requests-list');
        const emptyState = document.getElementById('admin-empty-state');
        const btnCopyLink = document.getElementById('btn-copy-link');
        
        if(!localId) {
            list.innerHTML = '';
            list.appendChild(emptyState);
            emptyState.classList.remove('hidden');
            if (btnCopyLink) btnCopyLink.classList.add('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        if (btnCopyLink) btnCopyLink.classList.remove('hidden');
        list.innerHTML = '<div class="p-8 flex justify-center"><div class="loader"></div></div>';
        
        await this.loadRequests();
    }

    static async loadRequests() {
        if(AppState.admin.isLoading || !AppState.admin.hasMore) return;
        
        AppState.admin.isLoading = true;
        const trigger = document.getElementById('load-more-trigger');
        if(trigger) trigger.classList.remove('hidden');
        
        try {
            const data = await ApiService.getSolicitacoes(
                AppState.admin.currentLocalId, 
                AppState.admin.page, 
                AppState.admin.limit
            );
            
            if(AppState.admin.page === 1) document.getElementById('admin-requests-list').innerHTML = '';
            
            if(!data || data.length < AppState.admin.limit) {
                AppState.admin.hasMore = false;
                if(trigger) trigger.classList.add('hidden');
            } else {
                AppState.admin.page++;
            }

            if(data) this.renderRequestCards(data);

        } catch(error) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Erro ao buscar a lista de solicitações.", type: 'error' }}));
        } finally {
            AppState.admin.isLoading = false;
            if(!AppState.admin.hasMore && trigger) trigger.classList.add('hidden');
        }
    }

    static renderRequestCards(requests) {
        const list = document.getElementById('admin-requests-list');
        requests.forEach(req => {
            const el = document.createElement('div');
            el.className = "request-item border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer bg-white group";
            el.dataset.id = req.id; // Delegação de Eventos via DOM
            
            const safeId = UI.escapeHTML(req.id.split('-')[0]);
            const safeNome = UI.escapeHTML(req.nome);
            const safeAssunto = UI.escapeHTML(req.assunto);

            el.innerHTML = `
                <div class="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                    <div class="col-span-2 text-sm font-mono text-gray-500 truncate">${safeId}</div>
                    <div class="col-span-3 text-sm font-medium text-dark truncate">${safeNome}</div>
                    <div class="col-span-4 text-sm text-gray-600 truncate">${safeAssunto}</div>
                    <div class="col-span-2">${UI.renderPriorityBadge(req.prioridade)}</div>
                    <div class="col-span-1 text-right">
                        <button class="text-gray-400 hover:text-brand-500 p-1"><i data-lucide="eye" class="w-4 h-4"></i></button>
                    </div>
                </div>
                
                <div class="md:hidden p-4 space-y-2">
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-mono text-gray-500">ID: ${safeId}</span>
                        ${UI.renderPriorityBadge(req.prioridade)}
                    </div>
                    <div class="font-medium text-dark text-sm">${safeAssunto}</div>
                    <div class="text-xs text-gray-600 flex justify-between items-center">
                        <span><i data-lucide="user" class="w-3 h-3 inline mr-1"></i>${safeNome}</span>
                        <span class="text-brand-500 font-medium">Ver</span>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
        lucide.createIcons({ root: list });
    }

    static async openDetails(id) {
        UI.openModal('details-modal');
        const body = document.getElementById('details-modal-body');
        body.innerHTML = '<div class="flex justify-center py-10"><div class="loader border-t-dark"></div></div>';
        
        try {
            const req = await ApiService.getSolicitacaoById(id);
            
            let anexosHTML = '<p class="text-sm text-gray-500">Nenhum anexo enviado.</p>';
            if(req.anexos && req.anexos.length > 0) {
                anexosHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">`;
                req.anexos.forEach(anexo => {
                    anexosHTML += `
                        <a href="${UI.escapeHTML(anexo.url)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition group">
                            <div class="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 group-hover:text-brand-500 group-hover:bg-brand-100 transition">
                                <i data-lucide="paperclip" class="w-4 h-4"></i>
                            </div>
                            <span class="text-sm font-medium text-gray-700 truncate">${UI.escapeHTML(anexo.title)}</span>
                        </a>
                    `;
                });
                anexosHTML += `</div>`;
            }

            body.innerHTML = `
                <div class="space-y-6">
                    <div class="flex flex-wrap justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <p class="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">ID da Solicitação</p>
                            <p class="font-medium text-dark">${UI.escapeHTML(req.id)}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Prioridade</p>
                            ${UI.renderPriorityBadge(req.prioridade)}
                        </div>
                    </div>

                    <div>
                        <h4 class="text-lg font-bold text-dark mb-2">${UI.escapeHTML(req.assunto)}</h4>
                        <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${UI.escapeHTML(req.descricao)}</div>
                        ${req.informacoes_adicionais ? `<p class="mt-2 text-sm text-gray-500"><span class="font-semibold text-gray-700">Adicional:</span> ${UI.escapeHTML(req.informacoes_adicionais)}</p>` : ''}
                    </div>

                    <div class="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 sm:gap-8 shadow-sm">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Solicitante</p>
                            <p class="text-sm font-medium text-dark">${UI.escapeHTML(req.nome)}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 mb-1">Contato</p>
                            <p class="text-sm text-dark">${UI.escapeHTML(req.telefone)} • ${UI.escapeHTML(req.email)}</p>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <i data-lucide="folder" class="w-4 h-4"></i> Arquivos Anexos
                        </h4>
                        ${anexosHTML}
                    </div>
                </div>
            `;
            lucide.createIcons({ root: body });

        } catch(error) {
            body.innerHTML = `<div class="p-6 text-center text-red-500">Erro ao carregar detalhes da solicitação.</div>`;
        }
    }

    static copyLocalLink() {
        if (!AppState.admin.currentLocalId) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Selecione um local primeiro.", type: 'error' }}));
            return;
        }
        
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('local', AppState.admin.currentLocalId);
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Link copiado para a área de transferência!", type: 'success' }}));
        }).catch(err => {
            // Fallback strategy for older browsers (or restricted IFrames)
            const textArea = document.createElement("textarea");
            textArea.value = url.toString();
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Link copiado para a área de transferência!", type: 'success' }}));
            } catch (err) {
                window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "O navegador bloqueou a cópia. Copie manualmente.", type: 'error' }}));
            }
            document.body.removeChild(textArea);
        });
    }
}