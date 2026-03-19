import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class AdminController {
    static currentRequest = null;

    static async initDashboard() {
        this.resetPagination();
        this.triggerLoad(); 
        
        // Mantém a funcionalidade de preencher o input silenciosamente
        const cityInput = document.getElementById('admin-search-city');
        const ufSelect = document.getElementById('admin-search-uf');
        if(cityInput && ufSelect && cityInput.value) {
            this.searchLocaisAdmin(cityInput.value, ufSelect.value, true);
        }
    }

    static resetPagination() {
        AppState.admin.page = 1;
        AppState.admin.requests = [];
        AppState.admin.hasMore = true;
    }

    // Gerencia as mudanças dos filtros unificados (Status e Local)
    static changeFilters() {
        const localSelect = document.getElementById('admin-local-select');
        const statusSelect = document.getElementById('admin-global-status');
        
        AppState.admin.currentLocalId = localSelect ? localSelect.value : '';
        AppState.admin.currentStatus = statusSelect ? statusSelect.value : '';
        
        this.updateAdminActionsUI();
        this.resetPagination();
        this.triggerLoad();
    }

    // Atualiza botoes de gerenciar secretaria e copiar link baseado na selecao do local
    static updateAdminActionsUI() {
        const btnCopyLink = document.getElementById('btn-copy-link');
        const btnManageLocal = document.getElementById('btn-manage-local');
        const localId = AppState.admin.currentLocalId;

        if (localId) {
            if(btnCopyLink) btnCopyLink.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
            if(btnManageLocal) {
                btnManageLocal.classList.remove('hidden');
                btnManageLocal.classList.add('flex');
            }
        } else {
            if(btnCopyLink) btnCopyLink.classList.add('hidden', 'opacity-50', 'pointer-events-none');
            if(btnManageLocal) {
                btnManageLocal.classList.remove('flex');
                btnManageLocal.classList.add('hidden');
            }
        }
    }

    static async searchLocaisAdmin(city, state, silentLoad = false) {
        const btn = document.getElementById('btn-admin-search-locais');
        if(btn && !silentLoad) UI.setButtonLoading('btn-admin-search-locais', true, '<div class="loader-sm border-brand-500 border-t-transparent border-2 rounded-full w-4 h-4 animate-spin"></div>');
        
        try {
            const locais = await ApiService.getLocais(city, state); 
            const select = document.getElementById('admin-local-select');
            select.innerHTML = '<option value="">Todas as Secretarias (Global)</option>';
            
            if(locais && locais.length > 0) {
                locais.forEach(l => {
                    select.innerHTML += `<option value="${UI.escapeHTML(l.id)}">${UI.escapeHTML(l.nome)} - ${UI.escapeHTML(l.cidade)}</option>`;
                });
            } else {
                select.innerHTML = '<option value="">Nenhuma secretaria encontrada</option>';
            }
        } catch(e) { 
            if(!silentLoad) UI.showToast("Erro ao buscar locais.", "error");
        } finally {
            if(btn && !silentLoad) UI.setButtonLoading('btn-admin-search-locais', false, '<i data-lucide="search" class="w-4 h-4"></i>');
        }
    }

    static triggerLoad() {
        const list = document.getElementById('admin-requests-list');
        if(AppState.admin.page === 1) {
            list.innerHTML = `
                <div class="absolute inset-0 flex flex-col items-center justify-center fade-in">
                    <div class="loader-sm border-brand-500 border-t-transparent border-4 rounded-full w-10 h-10 animate-spin"></div>
                    <span class="mt-4 text-sm font-semibold text-slate-500 tracking-wide">Buscando informações...</span>
                </div>`;
        }
        this.loadRequests();
    }

    static async loadRequests() {
        if(AppState.admin.isLoading || !AppState.admin.hasMore) return;
        
        AppState.admin.isLoading = true;
        const trigger = document.getElementById('load-more-trigger');
        if(trigger) trigger.classList.remove('hidden');
        
        try {
            let data = [];
            // Lógica Combinada de Filtros
            if (AppState.admin.currentLocalId) {
                // Se existe Local selecionado, buscamos pelo local (limit maior para compensar filtro frontend se existir status)
                let localData = await ApiService.getSolicitacoes(AppState.admin.currentLocalId, AppState.admin.page, 50);
                if (AppState.admin.currentStatus) {
                    data = localData.filter(req => req.status === AppState.admin.currentStatus);
                } else {
                    data = localData;
                }
            } else {
                // Se não há Local, busca diretamente por status. 
                // Se o status for vazio, busca todos (no backend o status "" pode não existir, então validamos)
                const status = AppState.admin.currentStatus || "criado";
                data = await ApiService.getSolicitacoesByStatus(status, AppState.admin.page, AppState.admin.limit);
            }
            
            if(AppState.admin.page === 1) document.getElementById('admin-requests-list').innerHTML = '';
            
            if(!data || data.length === 0) {
                AppState.admin.hasMore = false;
                if(AppState.admin.page === 1) {
                    document.getElementById('admin-requests-list').innerHTML = `
                        <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 fade-in px-4 text-center">
                            <div class="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
                                <i data-lucide="filter" class="w-10 h-10 text-slate-300"></i>
                            </div>
                            <h4 class="text-slate-800 font-bold text-lg mb-2">Nenhum resultado encontrado</h4>
                            <p class="text-sm text-slate-500">Tente alterar os filtros de Status ou Secretaria acima.</p>
                        </div>`;
                    lucide.createIcons({ root: document.getElementById('admin-requests-list') });
                }
            } else {
                if(data.length < AppState.admin.limit && !AppState.admin.currentLocalId) AppState.admin.hasMore = false;
                AppState.admin.page++;
                this.renderRequestCards(data);
            }

        } catch(error) {
            UI.showToast("Erro ao buscar a lista de solicitações.", "error");
            AppState.admin.hasMore = false; 
            if(AppState.admin.page === 1) {
                document.getElementById('admin-requests-list').innerHTML = `<div class="p-8 text-center text-red-500 font-semibold flex flex-col items-center"><i data-lucide="wifi-off" class="w-10 h-10 mb-3 opacity-50"></i> Falha de conexão. Tente recarregar a página.</div>`;
                lucide.createIcons({ root: document.getElementById('admin-requests-list') });
            }
        } finally {
            AppState.admin.isLoading = false;
            if(!AppState.admin.hasMore && trigger) trigger.classList.add('hidden');
        }
    }

    static renderRequestCards(requests) {
        const list = document.getElementById('admin-requests-list');
        requests.forEach(req => {
            const el = document.createElement('div');
            el.className = "request-item group border-b border-slate-100 hover:bg-slate-50 transition-all duration-200 cursor-pointer bg-white relative";
            el.dataset.id = req.id;
            
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            const safeNome = UI.escapeHTML(req.nome);
            const safeAssunto = UI.escapeHTML(req.assunto);
            const statusBadge = UI.renderStatusBadge(req.status || 'criado');

            el.innerHTML = `
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <!-- Desktop Layout -->
                <div class="hidden md:flex items-center px-6 py-4 gap-4">
                    <div class="w-24 flex-shrink-0 text-sm font-mono font-bold text-slate-600">#${safeOS}</div>
                    <div class="w-48 flex-shrink-0 text-sm font-semibold text-slate-900 truncate pr-4">${safeNome}</div>
                    <div class="flex-grow text-sm text-slate-600 truncate pr-4 group-hover:text-slate-900 transition-colors">${safeAssunto}</div>
                    <div class="w-32 flex-shrink-0 status-col">${statusBadge}</div>
                    <div class="w-24 flex-shrink-0 text-right">${UI.renderPriorityBadge(req.prioridade)}</div>
                </div>
                
                <!-- Mobile Card Layout -->
                <div class="md:hidden p-5 space-y-3">
                    <div class="flex justify-between items-start mb-1 gap-2">
                        <div class="flex flex-col gap-1.5 flex-grow">
                            <span class="text-xs font-mono font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded w-fit">OS #${safeOS}</span>
                            <div class="font-bold text-slate-900 text-base leading-snug">${safeAssunto}</div>
                        </div>
                        <div class="flex-shrink-0">${UI.renderPriorityBadge(req.prioridade)}</div>
                    </div>
                    
                    <div class="flex justify-between items-end mt-4 pt-3 border-t border-slate-100">
                        <span class="text-sm text-slate-600 flex items-center gap-1.5 font-medium"><i data-lucide="user" class="w-4 h-4 text-slate-400"></i> ${safeNome}</span>
                        <div class="status-col">${statusBadge}</div>
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
        const headerOs = document.getElementById('modal-header-os');
        const btnPdf = document.getElementById('btn-download-pdf');
        
        btnPdf.classList.add('hidden');
        headerOs.textContent = "Carregando...";
        body.innerHTML = '<div class="flex justify-center py-16"><div class="loader-sm border-brand-500 border-t-transparent border-4 rounded-full w-10 h-10 animate-spin"></div></div>';
        this.currentRequest = null;
        
        try {
            const req = await ApiService.getSolicitacaoById(id);
            this.currentRequest = req;
            
            btnPdf.classList.remove('hidden');
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            headerOs.textContent = `OS #${safeOS}`;
            
            // Container de anexos existentes
            let anexosHTML = '<div class="text-sm text-slate-400 font-medium italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center">Nenhum anexo encontrado para esta solicitação.</div>';
            if(req.anexos && req.anexos.length > 0) {
                anexosHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="existing-attachments-grid">`;
                req.anexos.forEach(anexo => { anexosHTML += UI.renderAnexoCard(anexo); });
                anexosHTML += `</div>`;
            }

            const statusAtual = (req.status || 'criado').toLowerCase();
            const statusControl = `
                <div class="bg-slate-900 p-5 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status da Solicitação</p>
                        <p class="text-sm text-slate-300 font-medium">Atualize o progresso deste chamado</p>
                    </div>
                    <select id="select-update-status" onchange="AdminController.updateStatus('${id}', this.value)" class="bg-slate-800 text-white border-0 text-sm rounded-lg focus:ring-2 focus:ring-brand-500 block w-full sm:w-auto p-3 font-semibold shadow-inner transition cursor-pointer">
                        <option value="criado" ${statusAtual === 'criado' ? 'selected' : ''}>Pendente (Criado)</option>
                        <option value="em_andamento" ${statusAtual === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido" ${statusAtual === 'concluido' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
            `;

            // Zona de Upload do Administrador
            const adminUploadZone = `
                <div class="mt-6 bg-brand-50/50 border border-brand-100 rounded-xl p-5">
                    <h4 class="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2">
                        <i data-lucide="upload-cloud" class="w-4 h-4 text-brand-500"></i> Adicionar Anexo (Admin)
                    </h4>
                    <div class="flex items-center gap-3">
                        <input type="file" id="admin-upload-input" multiple class="hidden" onchange="AdminController.handleAdminUpload(this)">
                        <label for="admin-upload-input" id="admin-upload-label" class="cursor-pointer bg-white border border-brand-200 text-brand-700 hover:bg-brand-500 hover:text-white hover:border-brand-500 font-semibold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm flex items-center gap-2">
                            <i data-lucide="plus" class="w-4 h-4"></i> Selecionar Arquivos
                        </label>
                        <span class="text-xs text-brand-600 font-medium">PNG, JPG, PDF permitidos.</span>
                    </div>
                </div>
            `;

            body.innerHTML = `
                <div class="max-w-3xl mx-auto space-y-6 fade-in">
                    ${statusControl}
                    
                    <div class="flex flex-wrap justify-between gap-4 mb-2">
                        <h4 class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">${UI.escapeHTML(req.assunto)}</h4>
                        <div>${UI.renderPriorityBadge(req.prioridade)}</div>
                    </div>

                    ${req.nome_da_unidade ? `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold mb-4 border border-slate-200 shadow-sm"><i data-lucide="building" class="w-4 h-4"></i> ${UI.escapeHTML(req.nome_da_unidade)}</div>` : ''}
                    
                    <div class="bg-white border border-slate-200 shadow-sm rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">${UI.escapeHTML(req.descricao)}</div>
                    
                    ${req.informacoes_adicionais ? `
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 shadow-sm">
                        <p class="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1.5">Informações Adicionais</p>
                        <p class="text-sm text-amber-900 font-medium">${UI.escapeHTML(req.informacoes_adicionais)}</p>
                    </div>` : ''}

                    <hr class="border-slate-100 my-8">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Dados do Solicitante</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-600 font-bold text-lg">
                                    ${req.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900">${UI.escapeHTML(req.nome)}</p>
                                    <p class="text-xs text-slate-500 font-medium">${UI.escapeHTML(req.email)}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Contato Direto</p>
                            <a href="tel:${UI.escapeHTML(req.telefone)}" class="inline-flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:border-brand-300 transition-colors">
                                <i data-lucide="phone" class="w-4 h-4 text-brand-500"></i> 
                                <span class="text-sm font-bold text-slate-700">${UI.escapeHTML(req.telefone)}</span>
                            </a>
                        </div>
                    </div>

                    <hr class="border-slate-100 my-8">

                    <div>
                        <h4 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i data-lucide="folder-open" class="w-4 h-4 text-slate-400"></i> Anexos da Solicitação
                        </h4>
                        <div id="attachments-container">${anexosHTML}</div>
                        ${adminUploadZone}
                    </div>
                </div>
            `;
            lucide.createIcons({ root: body });

        } catch(error) {
            body.innerHTML = `<div class="p-8 text-center text-red-500 font-bold bg-red-50 rounded-xl border border-red-100">Erro ao carregar os detalhes da solicitação. Tente novamente.</div>`;
        }
    }

    static async handleAdminUpload(inputElement) {
        const files = inputElement.files;
        if (!files.length || !this.currentRequest) return;

        const label = document.getElementById('admin-upload-label');
        const originalHtml = label.innerHTML;
        
        label.classList.add('pointer-events-none', 'opacity-70');
        label.innerHTML = `<div class="loader-sm border-brand-500 border-t-transparent border-2 rounded-full w-4 h-4 animate-spin"></div> Enviando...`;

        try {
            // Usa 'admin' conforme exigido pelo backend
            const novosAnexos = await ApiService.uploadAnexo(files, this.currentRequest.id, "admin");
            UI.showToast("Anexos enviados com sucesso!", "success");
            
            // Atualiza a UI injetando os novos cards na grid
            let container = document.getElementById('existing-attachments-grid');
            if (!container) {
                // Se não havia grid antes (estava vazio), recria a estrutura
                const parent = document.getElementById('attachments-container');
                parent.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="existing-attachments-grid"></div>`;
                container = document.getElementById('existing-attachments-grid');
            }
            
            novosAnexos.forEach(anexo => {
                container.insertAdjacentHTML('beforeend', UI.renderAnexoCard(anexo));
            });
            lucide.createIcons({ root: container });

        } catch (error) {
            UI.showToast(error.message || "Erro no upload dos anexos.", "error");
        } finally {
            label.classList.remove('pointer-events-none', 'opacity-70');
            label.innerHTML = originalHtml;
            inputElement.value = ''; // Reseta o input
            lucide.createIcons({ root: label });
        }
    }

    static async updateStatus(id, newStatus) {
        const selectEl = document.getElementById('select-update-status');
        if(selectEl) selectEl.disabled = true; 
        
        try {
            await ApiService.updateSolicitacaoStatus(id, newStatus);
            UI.showToast('Status atualizado com sucesso!', 'success');
            
            const listItems = document.querySelectorAll(`.request-item[data-id="${id}"] .status-col`);
            listItems.forEach(el => el.innerHTML = UI.renderStatusBadge(newStatus));
            
            if(this.currentRequest) this.currentRequest.status = newStatus;
        } catch(e) {
            UI.showToast(e.message || 'Erro ao atualizar status', 'error');
            if(selectEl && this.currentRequest) selectEl.value = this.currentRequest.status || 'criado';
        } finally {
            if(selectEl) selectEl.disabled = false;
        }
    }

    // --- GESTÃO DE SECRETARIAS E USUÁRIOS --- //

    static openManageLocalModal() {
        if (!AppState.admin.currentLocalId) {
            UI.showToast("Selecione uma secretaria nos filtros para gerenciar.", "error");
            return;
        }
        
        // Pega o nome do select para exibir no modal
        const select = document.getElementById('admin-local-select');
        const localName = select.options[select.selectedIndex].text;
        
        document.getElementById('manage-local-title').textContent = localName;
        document.getElementById('form-create-local-user').reset();
        UI.openModal('manage-local-modal');
    }

    static async handleCreateLocalUser(e) {
        e.preventDefault();
        const nome = document.getElementById('clu-nome').value.trim();
        const email = document.getElementById('clu-email').value.trim();
        const senha = document.getElementById('clu-senha').value;
        const local_id = AppState.admin.currentLocalId;

        if(!local_id) return UI.showToast("Local não identificado.", "error");

        UI.setButtonLoading('btn-submit-clu', true, 'Cadastrando...');
        
        try {
            await ApiService.registerLocalUser({ nome, email, senha, local_id });
            UI.showToast("Gestor cadastrado com sucesso!", "success");
            UI.closeModal('manage-local-modal');
        } catch(error) {
            UI.showToast(error.message || "Erro ao cadastrar gestor.", "error");
        } finally {
            UI.setButtonLoading('btn-submit-clu', false, '<i data-lucide="user-plus" class="w-4 h-4"></i> Criar Acesso');
        }
    }

    static async handleCreateLocal(e) {
        e.preventDefault();
        const nome = document.getElementById('create-local-nome').value.trim();
        const cidade = document.getElementById('create-local-cidade').value.trim();
        const estado = document.getElementById('create-local-uf').value;

        UI.setButtonLoading('btn-submit-create-local', true, 'Salvando...');
        
        try {
            await ApiService.createLocal({ nome, cidade, estado });
            UI.showToast("Secretaria cadastrada com sucesso!", "success");
            
            document.getElementById('form-create-local').reset();
            UI.closeModal('create-local-modal');
            
            const cityInput = document.getElementById('admin-search-city');
            const ufSelect = document.getElementById('admin-search-uf');
            if(cityInput) cityInput.value = cidade;
            if(ufSelect) ufSelect.value = estado;
            
            await this.searchLocaisAdmin(cidade, estado);

        } catch(error) {
            UI.showToast(error.message || "Erro ao cadastrar local.", "error");
        } finally {
            UI.setButtonLoading('btn-submit-create-local', false, '<i data-lucide="save" class="w-4 h-4"></i> Salvar Secretaria');
        }
    }
    
    static async copyLocalLink() {
        if (!AppState.admin.currentLocalId) {
            UI.showToast("Selecione um local primeiro.", "error");
            return;
        }
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('local', AppState.admin.currentLocalId);
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url.toString());
            } else { throw new Error("Clipboard indisponível"); }
            UI.showToast("Link da Secretaria copiado!", "success");
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = url.toString();
                textArea.style.position = "fixed"; textArea.style.left = "-9999px";
                document.body.appendChild(textArea); textArea.focus(); textArea.select();
                document.execCommand("copy"); document.body.removeChild(textArea);
                UI.showToast("Link copiado para a área de transferência!", "success");
            } catch (fallbackErr) {
                UI.showToast("O navegador bloqueou a cópia. Copie manualmente.", "error");
            }
        }
    }

    static async downloadPDF() {
    if (!this.currentRequest) return;
    const req = this.currentRequest;
    const originalText = document.getElementById('btn-download-pdf').innerHTML;
    UI.setButtonLoading('btn-download-pdf', true, 'Preparando PDF...');

    try {
        // --- 1. CARREGAMENTO DINÂMICO DO PDFMAKE (Sem precisar alterar o index.html) ---
        const loadPdfMake = async () => {
            if (window.pdfMake) return;
            return new Promise((resolve, reject) => {
                const script1 = document.createElement('script');
                script1.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js";
                script1.onload = () => {
                    const script2 = document.createElement('script');
                    script2.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js";
                    script2.onload = resolve;
                    document.head.appendChild(script2);
                };
                script1.onerror = reject;
                document.head.appendChild(script1);
            });
        };
        await loadPdfMake();

        // Helper para tentar converter a logo em Base64
        const getLogoBase64 = async () => {
            try {
                const res = await fetch(`${window.location.origin}/assets/logo.png`);
                if (!res.ok) return null;
                const blob = await res.blob();
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                return null;
            }
        };

        const logoData = await getLogoBase64();

        // --- 2. PREPARAÇÃO DOS DADOS ---
        const safeOS = String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0');
        const dataHora = new Date();
        const dateStr = dataHora.toLocaleDateString('pt-BR');
        const timeStr = dataHora.toLocaleTimeString('pt-BR', { hour12: false });

        let localData = req.local;
        if (!localData && req.local_id) {
            try { localData = await ApiService.getLocalById(req.local_id); } 
            catch (e) { console.warn("Aviso: Não buscou local", e); }
        }

        const localNome = (localData && localData.nome) ? localData.nome : 'Não informado';
        const localCidade = (localData && localData.cidade) ? localData.cidade : '-';
        const localEstado = (localData && localData.estado) ? localData.estado : '-';
        const unidadeNome = req.nome_da_unidade || 'NÃO INFORMADO';

        let priText = String(req.prioridade || 'BAIXA').toUpperCase();
        let priColorText = '#16A34A'; 
        let priColorBg = '#F0FDF4';
        
        if (priText === 'ALTA') {
            priColorText = '#DC2626'; priColorBg = '#FEF2F2';
        } else if (priText === 'MÉDIA' || priText === 'MEDIA') {
            priColorText = '#D97706'; priColorBg = '#FFFBEB';
        }

        // --- 3. CONSTRUÇÃO ESTRUTURAL DO PDF (Garante quebra de página perfeita) ---
        const layoutBordas = {
            hLineWidth: () => 1, vLineWidth: () => 1,
            hLineColor: () => '#E5E7EB', vLineColor: () => '#E5E7EB'
        };

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 60],
            defaultStyle: { font: 'Roboto', lineHeight: 1.2 },
            footer: function(currentPage, pageCount) {
                return {
                    stack: [
                        { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 555, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }], margin: [0, 0, 0, 10] },
                        { text: 'Documento gerado eletronicamente pelo Sistema de Solicitações Arcaika Engenharia.', alignment: 'center', fontSize: 8, color: '#9CA3AF', margin: [0, 0, 0, 2] },
                        { text: `Gerado em ${dateStr} às ${timeStr} - Página ${currentPage} de ${pageCount}`, alignment: 'center', fontSize: 8, color: '#9CA3AF' }
                    ]
                };
            },
            content: [
                // CABEÇALHO
                {
                    columns: [
                        logoData 
                            ? { image: logoData, fit: [150, 60], width: '*' }
                            : { text: 'ARCAIKA ENGENHARIA', fontSize: 14, bold: true, color: '#111827', width: '*', margin: [0, 10, 0, 0] },
                        { text: 'ARCAIKA ENGENHARIA LTDA\nCNPJ: 42.907.720/0001-85\nAl. Botafogo, 174 - Qd 77, L 11 - St. Central\nGoiânia - GO, 74030-020\nTel: (62) 99616-4188', alignment: 'right', fontSize: 9, color: '#4B5563', width: '*' }
                    ],
                    margin: [0, 0, 0, 10]
                },
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#F97316' }], margin: [0, 0, 0, 15] },

                // TÍTULO DA OS
                {
                    table: {
                        widths: ['*', 'auto'],
                        body: [
                            [
                                { text: `ORDEM DE SERVIÇO #${safeOS}`, fontSize: 16, bold: true, color: 'white', border: [false, false, false, false], margin: [10, 8] },
                                { text: `Data: ${dateStr}`, fontSize: 10, bold: true, color: 'white', alignment: 'right', border: [false, false, false, false], margin: [10, 12] }
                            ]
                        ]
                    },
                    layout: { defaultBorder: false, fillColor: '#F97316' },
                    margin: [0, 0, 0, 15]
                },

                // CARDS LOCAL E SOLICITANTE
                {
                    columnGap: 15,
                    columns: [
                        {
                            width: '50%',
                            table: {
                                widths: ['*'],
                                body: [[{
                                    stack: [
                                        { text: 'LOCAL', fontSize: 10, bold: true, color: '#EA580C' },
                                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }], margin: [0, 4, 0, 8] },
                                        { text: 'SECRETARIA', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                        { text: localNome.toUpperCase(), fontSize: 11, bold: true, color: '#111827', margin: [0, 0, 0, 8] },
                                        { text: 'CIDADE / UF', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                        { text: `${localCidade.toUpperCase()} - ${localEstado.toUpperCase()}`, fontSize: 11, bold: true, color: '#111827', margin: [0, 0, 0, 8] },
                                        { text: 'UNIDADE / SETOR', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                        { text: unidadeNome.toUpperCase(), fontSize: 11, bold: true, color: '#111827' }
                                    ],
                                    fillColor: '#F9FAFB', margin: [10, 10, 10, 10]
                                }]]
                            }, layout: layoutBordas
                        },
                        {
                            width: '50%',
                            table: {
                                widths: ['*'],
                                body: [[{
                                    stack: [
                                        { text: 'SOLICITANTE', fontSize: 10, bold: true, color: '#EA580C' },
                                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }], margin: [0, 4, 0, 8] },
                                        { text: 'NOME COMPLETO', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                        { text: String(req.nome || '').toUpperCase(), fontSize: 11, bold: true, color: '#111827', margin: [0, 0, 0, 8] },
                                        { text: 'E-MAIL', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                        { text: String(req.email || ''), fontSize: 11, bold: true, color: '#111827', margin: [0, 0, 0, 8] },
                                        { text: 'TELEFONE', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                        { text: String(req.telefone || ''), fontSize: 11, bold: true, color: '#111827' }
                                    ],
                                    fillColor: '#F9FAFB', margin: [10, 10, 10, 10]
                                }]]
                            }, layout: layoutBordas
                        }
                    ],
                    margin: [0, 0, 0, 15]
                },

                // DETALHES DA SOLICITAÇÃO (A quebra de página automática atua perfeitamente aqui)
                {
                    table: {
                        widths: ['*'],
                        body: [[{
                            stack: [
                                { text: 'DETALHES DA SOLICITAÇÃO', fontSize: 10, bold: true, color: '#EA580C' },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 2, lineColor: '#F3F4F6' }], margin: [0, 6, 0, 10] },
                                {
                                    columns: [
                                        {
                                            stack: [
                                                { text: 'ASSUNTO', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 2] },
                                                { text: String(req.assunto || '').toUpperCase(), fontSize: 11, bold: true, color: '#111827' }
                                            ], width: '*'
                                        },
                                        {
                                            stack: [
                                                { text: 'PRIORIDADE', fontSize: 8, bold: true, color: '#6B7280', margin: [0, 0, 0, 4], alignment: 'right' },
                                                {
                                                    table: { widths: [90], body: [[{ text: priText, fontSize: 10, bold: true, color: priColorText, alignment: 'center', margin: [0, 4, 0, 4] }]] },
                                                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => priColorText, vLineColor: () => priColorText, fillColor: priColorBg },
                                                    alignment: 'right'
                                                }
                                            ], width: 110
                                        }
                                    ], margin: [0, 0, 0, 15]
                                },
                                { text: 'DESCRIÇÃO DO PROBLEMA / SERVIÇO', fontSize: 9, bold: true, color: '#4B5563', margin: [0, 0, 0, 2] },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 1, lineColor: '#F3F4F6' }], margin: [0, 0, 0, 6] },
                                {
                                    table: { widths: ['*'], body: [[{ text: String(req.descricao || ''), fontSize: 10, color: '#374151', margin: [8, 8, 8, 8], lineHeight: 1.4 }]] },
                                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#F3F4F6', vLineColor: () => '#F3F4F6', fillColor: '#F9FAFB' },
                                    margin: [0, 0, 0, req.informacoes_adicionais ? 15 : 0]
                                },
                                ...(req.informacoes_adicionais ? [
                                    { text: 'INFORMAÇÕES ADICIONAIS', fontSize: 9, bold: true, color: '#4B5563', margin: [0, 0, 0, 2] },
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 1, lineColor: '#F3F4F6' }], margin: [0, 0, 0, 6] },
                                    {
                                        table: { widths: ['*'], body: [[{ text: String(req.informacoes_adicionais || ''), fontSize: 10, color: '#374151', margin: [8, 8, 8, 8], lineHeight: 1.4 }]] },
                                        layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#FEF3C7', vLineColor: () => '#FEF3C7', fillColor: '#FFFBEB' }
                                    }
                                ] : [])
                            ], margin: [15, 15, 15, 15]
                        }]]
                    }, layout: layoutBordas, margin: [0, 0, 0, 15]
                },

                // ASSINATURAS (Mantém-se juntas sem quebrar no meio)
                {
                    unbreakable: true, 
                    table: {
                        widths: ['*'],
                        body: [[{
                            stack: [
                                { text: 'ASSINATURAS', fontSize: 10, bold: true, color: '#EA580C' },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 2, lineColor: '#F3F4F6' }], margin: [0, 6, 0, 10] },
                                {
                                    columnGap: 15,
                                    columns: [
                                        {
                                            table: { widths: ['*'], body: [[{ stack: [
                                                { text: 'GESTOR DO CONTRATO', fontSize: 8, bold: true, color: '#6B7280', alignment: 'center', margin: [0, 0, 0, 50] },
                                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#4B5563' }], alignment: 'center', margin: [0, 0, 0, 5] },
                                                { text: 'Assinatura', fontSize: 8, color: '#6B7280', alignment: 'center' }
                                            ], fillColor: '#F9FAFB', margin: [10, 15, 10, 15] }]] }, layout: layoutBordas
                                        },
                                        {
                                            table: { widths: ['*'], body: [[{ stack: [
                                                { text: 'RESPONSÁVEL TÉCNICO', fontSize: 8, bold: true, color: '#6B7280', alignment: 'center', margin: [0, 0, 0, 50] },
                                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: '#4B5563' }], alignment: 'center', margin: [0, 0, 0, 5] },
                                                { text: 'Assinatura', fontSize: 8, color: '#6B7280', alignment: 'center' }
                                            ], fillColor: '#F9FAFB', margin: [10, 15, 10, 15] }]] }, layout: layoutBordas
                                        }
                                    ]
                                }
                            ], margin: [15, 15, 15, 15]
                        }]]
                    }, layout: layoutBordas, margin: [0, 0, 0, 15]
                },

                // OBSERVAÇÕES
                {
                    unbreakable: true,
                    table: {
                        widths: ['*'],
                        body: [[{
                            stack: [
                                { text: 'OBSERVAÇÕES', fontSize: 10, bold: true, color: '#EA580C' },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 2, lineColor: '#F3F4F6' }], margin: [0, 6, 0, 20] },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.5, lineColor: '#D1D5DB' }], margin: [0, 0, 0, 25] },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.5, lineColor: '#D1D5DB' }], margin: [0, 0, 0, 25] },
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 485, y2: 0, lineWidth: 0.5, lineColor: '#D1D5DB' }] }
                            ], margin: [15, 15, 15, 15]
                        }]]
                    }, layout: layoutBordas
                }
            ]
        };

        // Geração e Download via pdfMake
        pdfMake.createPdf(docDefinition).download(`OS_${safeOS}.pdf`);
        UI.showToast("PDF gerado com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        UI.showToast("Erro ao gerar o PDF.", "error");
    } finally {
        UI.setButtonLoading('btn-download-pdf', false, originalText);
    }
}
}