import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class AdminController {
    static currentRequest = null;

    static async initDashboard() {
        this.setupTabs();
        
        // MELHORIA UX: O Dashboard agora sempre começa buscando solicitações 
        // recém-criadas (estado pendente) em vez de obrigar a buscar por local primeiro.
        this.triggerLoad(); 

        // Mantém a funcionalidade de preencher o input caso o usuário troque para a aba 'local' depois
        const cityInput = document.getElementById('admin-search-city');
        const ufSelect = document.getElementById('admin-search-uf');
        if(cityInput && ufSelect && cityInput.value) {
            // Apenas pré-carrega silenciosamente os locais, sem forçar visualização
            this.searchLocaisAdmin(cityInput.value, ufSelect.value, true);
        }
    }

    static setupTabs() {
        const btnModeLocal = document.getElementById('btn-mode-local');
        const btnModeStatus = document.getElementById('btn-mode-status');
        const panelLocal = document.getElementById('filter-panel-local');
        const panelStatus = document.getElementById('filter-panel-status');

        const switchMode = (mode) => {
            if (AppState.admin.filterMode === mode) return; 
            AppState.admin.filterMode = mode;
            this.resetPagination();

            if(mode === 'local') {
                btnModeLocal.classList.add('bg-white', 'shadow-sm', 'text-gray-900', 'font-semibold');
                btnModeLocal.classList.remove('text-gray-500', 'hover:text-gray-700', 'font-medium');
                btnModeStatus.classList.remove('bg-white', 'shadow-sm', 'text-gray-900', 'font-semibold');
                btnModeStatus.classList.add('text-gray-500', 'hover:text-gray-700', 'font-medium');
                panelLocal.classList.remove('hidden');
                panelLocal.classList.add('flex'); // Para funcionar com Tailwind no mobile
                panelStatus.classList.remove('flex');
                panelStatus.classList.add('hidden');
                this.triggerLoad();
            } else {
                btnModeStatus.classList.add('bg-white', 'shadow-sm', 'text-gray-900', 'font-semibold');
                btnModeStatus.classList.remove('text-gray-500', 'hover:text-gray-700', 'font-medium');
                btnModeLocal.classList.remove('bg-white', 'shadow-sm', 'text-gray-900', 'font-semibold');
                btnModeLocal.classList.add('text-gray-500', 'hover:text-gray-700', 'font-medium');
                panelStatus.classList.remove('hidden');
                panelStatus.classList.add('flex');
                panelLocal.classList.remove('flex');
                panelLocal.classList.add('hidden');
                this.triggerLoad();
            }
        };

        if(btnModeLocal) btnModeLocal.addEventListener('click', () => switchMode('local'));
        if(btnModeStatus) btnModeStatus.addEventListener('click', () => switchMode('status'));
        
        const globalStatus = document.getElementById('admin-global-status');
        if(globalStatus) {
            globalStatus.addEventListener('change', (e) => {
                AppState.admin.currentStatus = e.target.value;
                this.resetPagination();
                this.triggerLoad();
            });
        }

        // CORREÇÃO: Garante que o select do local dispare a alteração e o botão seja funcional
        const adminLocalSelect = document.getElementById('admin-local-select');
        if(adminLocalSelect) {
            adminLocalSelect.addEventListener('change', (e) => this.changeLocal(e.target.value));
        }

        const btnCopyLink = document.getElementById('btn-copy-link');
        if(btnCopyLink) {
            btnCopyLink.addEventListener('click', () => this.copyLocalLink());
        }
    }

    // Adicionado parâmetro silentLoad para não atrapalhar o UI loading do modo Status no boot
    static async searchLocaisAdmin(city, state, silentLoad = false) {
        const btn = document.getElementById('btn-admin-search-locais');
        if(btn && !silentLoad) UI.setButtonLoading('btn-admin-search-locais', true, '<i data-lucide="search" class="w-4 h-4"></i>');
        
        try {
            const locais = await ApiService.getLocais(city, state); 
            const select = document.getElementById('admin-local-select');
            select.innerHTML = '<option value="">Selecione um Local...</option>';
            
            if(locais && locais.length > 0) {
                locais.forEach(l => {
                    select.innerHTML += `<option value="${UI.escapeHTML(l.id)}">${UI.escapeHTML(l.nome)} - ${UI.escapeHTML(l.cidade)}</option>`;
                });
            } else {
                select.innerHTML = '<option value="">Nenhum local encontrado</option>';
            }
            // Só dispara a troca caso o modo ativo seja 'local'
            if(AppState.admin.filterMode === 'local') {
                this.changeLocal("");
            }
        } catch(e) { 
            if(!silentLoad) UI.showToast("Erro ao buscar locais.", "error");
        } finally {
            if(btn && !silentLoad) UI.setButtonLoading('btn-admin-search-locais', false, '<i data-lucide="search" class="w-4 h-4"></i>');
        }
    }

    static changeLocal(localId) {
        if (!localId) return; // não reseta se vazio

        AppState.admin.currentLocalId = localId;
        
        const btnCopyLink = document.getElementById('btn-copy-link');
        if(btnCopyLink) {
            // CORREÇÃO: Força o estilo "display" em caso de conflitos com classes do Tailwind
            if (localId) {
                btnCopyLink.classList.remove('hidden');
                btnCopyLink.style.display = 'inline-flex';
            } else {
                btnCopyLink.classList.add('hidden');
                btnCopyLink.style.display = 'none';
            }
        }
        this.triggerLoad();
    }

    static resetPagination() {
        AppState.admin.page = 1;
        AppState.admin.requests = [];
        AppState.admin.hasMore = true;
    }

    static triggerLoad() {
        const list = document.getElementById('admin-requests-list');
        
        if(AppState.admin.filterMode === 'local' && !AppState.admin.currentLocalId) {
            list.innerHTML = `
                <div id="admin-empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <div class="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm"><i data-lucide="map" class="w-8 h-8 text-slate-400"></i></div>
                    <h4 class="text-slate-800 font-bold mb-1">Nenhum local selecionado</h4>
                    <p class="text-sm text-slate-500">Selecione uma unidade no filtro acima.</p>
                </div>`;
            lucide.createIcons({ root: list });
            return;
        }
        
        if(AppState.admin.page === 1) {
            list.innerHTML = '<div class="absolute inset-0 flex flex-col items-center justify-center"><div class="loader-sm border-brand-500 border-t-transparent border-4 rounded-full w-10 h-10 animate-spin"></div><span class="mt-4 text-sm font-medium text-slate-500">Buscando...</span></div>';
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
            if(AppState.admin.filterMode === 'local') {
                data = await ApiService.getSolicitacoes(AppState.admin.currentLocalId, AppState.admin.page, AppState.admin.limit);
            } else {
                data = await ApiService.getSolicitacoesByStatus(AppState.admin.currentStatus, AppState.admin.page, AppState.admin.limit);
            }
            
            if(AppState.admin.page === 1) document.getElementById('admin-requests-list').innerHTML = '';
            
            if(!data || data.length === 0) {
                AppState.admin.hasMore = false;
                if(AppState.admin.page === 1) {
                    // UX: Empty state mais claro e amigável
                    const statusName = AppState.admin.filterMode === 'status' ? AppState.admin.currentStatus : 'neste local';
                    document.getElementById('admin-requests-list').innerHTML = `
                        <div id="admin-empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 fade-in">
                            <div class="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                <i data-lucide="inbox" class="w-8 h-8 text-slate-400"></i>
                            </div>
                            <h4 class="text-slate-800 font-bold mb-1">Caixa Vazia</h4>
                            <p class="text-sm text-slate-500">Não há solicitações na categoria "${statusName.replace('_', ' ')}".</p>
                        </div>`;
                    lucide.createIcons({ root: document.getElementById('admin-requests-list') });
                }
            } else {
                if(data.length < AppState.admin.limit) AppState.admin.hasMore = false;
                AppState.admin.page++;
                this.renderRequestCards(data);
            }

        } catch(error) {
            UI.showToast("Erro ao buscar a lista de solicitações.", "error");
            AppState.admin.hasMore = false; 
            if(AppState.admin.page === 1) {
                document.getElementById('admin-requests-list').innerHTML = `<div class="p-8 text-center text-red-500 font-medium w-full flex flex-col items-center"><i data-lucide="wifi-off" class="w-8 h-8 mb-2"></i> Falha de conexão. Tente recarregar a página.</div>`;
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
            // UX: Melhor feedback visual de hover (bg-slate-50 -> hover:bg-slate-100)
            el.className = "request-item group border-b border-slate-100 hover:bg-slate-50 transition-all duration-200 cursor-pointer bg-white relative";
            el.dataset.id = req.id;
            
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            const safeNome = UI.escapeHTML(req.nome);
            const safeAssunto = UI.escapeHTML(req.assunto);
            const statusBadge = UI.renderStatusBadge(req.status || 'criado');

            el.innerHTML = `
                <!-- Hover indicator side bar -->
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <!-- Desktop Layout -->
                <div class="hidden md:flex items-center px-6 py-4 gap-4">
                    <div class="w-24 flex-shrink-0 text-sm font-mono font-semibold text-slate-600">#${safeOS}</div>
                    <div class="w-48 flex-shrink-0 text-sm font-medium text-slate-900 truncate pr-4">${safeNome}</div>
                    <div class="flex-grow text-sm text-slate-600 truncate pr-4 group-hover:text-slate-900 transition-colors">${safeAssunto}</div>
                    <div class="w-32 flex-shrink-0 status-col">${statusBadge}</div>
                    <div class="w-24 flex-shrink-0 text-right">
                        ${UI.renderPriorityBadge(req.prioridade)}
                    </div>
                </div>
                
                <!-- Mobile Card Layout (UX Aprimorado) -->
                <div class="md:hidden p-5 space-y-3">
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-mono font-bold text-slate-500">OS #${safeOS}</span>
                            <div class="font-semibold text-slate-900 text-base leading-snug pr-2">${safeAssunto}</div>
                        </div>
                        <div class="flex-shrink-0">${UI.renderPriorityBadge(req.prioridade)}</div>
                    </div>
                    
                    <div class="flex justify-between items-end mt-4 pt-3 border-t border-slate-100">
                        <span class="text-sm text-slate-600 flex items-center gap-1.5"><i data-lucide="user" class="w-4 h-4 text-slate-400"></i> ${safeNome}</span>
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
            
            let anexosHTML = '<div class="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-gray-100">Nenhum anexo enviado.</div>';
            if(req.anexos && req.anexos.length > 0) {
                anexosHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">`;
                req.anexos.forEach(anexo => {
                    anexosHTML += `
                        <a href="${UI.escapeHTML(anexo.url)}" target="_blank" class="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all group bg-white">
                            <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-brand-500 group-hover:bg-brand-50 transition-colors">
                                <i data-lucide="paperclip" class="w-5 h-5"></i>
                            </div>
                            <span class="text-sm font-medium text-gray-700 truncate">${UI.escapeHTML(anexo.title)}</span>
                        </a>
                    `;
                });
                anexosHTML += `</div>`;
            }

            // Status Control HTML
            const statusAtual = (req.status || 'criado').toLowerCase();
            const statusControl = `
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gestão de Status</p>
                        <p class="text-sm text-slate-700">Atualize o andamento desta solicitação.</p>
                    </div>
                    <select id="select-update-status" onchange="AdminController.updateStatus('${id}', this.value)" class="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full sm:w-auto p-2.5 font-medium shadow-sm transition">
                        <option value="criado" ${statusAtual === 'criado' ? 'selected' : ''}>Criado</option>
                        <option value="em_andamento" ${statusAtual === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido" ${statusAtual === 'concluido' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
            `;

            body.innerHTML = `
                <div class="max-w-3xl mx-auto space-y-6">
                    ${statusControl}
                    
                    <div class="flex flex-wrap justify-between gap-4 mb-2">
                        <h4 class="text-xl font-bold text-gray-900 leading-tight">${UI.escapeHTML(req.assunto)}</h4>
                        <div>${UI.renderPriorityBadge(req.prioridade)}</div>
                    </div>

                    ${req.nome_da_unidade ? `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-sm font-medium mb-4"><i data-lucide="map-pin" class="w-4 h-4"></i> ${UI.escapeHTML(req.nome_da_unidade)}</div>` : ''}
                    
                    <div class="bg-white border border-gray-100 shadow-sm rounded-xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${UI.escapeHTML(req.descricao)}</div>
                    
                    ${req.informacoes_adicionais ? `
                    <div class="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mt-4">
                        <p class="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Info Adicional</p>
                        <p class="text-sm text-amber-900">${UI.escapeHTML(req.informacoes_adicionais)}</p>
                    </div>` : ''}

                    <hr class="border-gray-100 my-8">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Solicitante</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                    ${req.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-900">${UI.escapeHTML(req.nome)}</p>
                                    <p class="text-xs text-gray-500">${UI.escapeHTML(req.email)}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contato</p>
                            <p class="text-sm text-gray-900 flex items-center gap-2"><i data-lucide="phone" class="w-4 h-4 text-gray-400"></i> ${UI.escapeHTML(req.telefone)}</p>
                        </div>
                    </div>

                    <hr class="border-gray-100 my-8">

                    <div>
                        <h4 class="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i data-lucide="folder-open" class="w-4 h-4 text-gray-400"></i> Arquivos Anexos
                        </h4>
                        ${anexosHTML}
                    </div>
                </div>
            `;
            lucide.createIcons({ root: body });

        } catch(error) {
            body.innerHTML = `<div class="p-8 text-center text-red-500 font-medium bg-red-50 rounded-xl border border-red-100">Erro ao carregar detalhes da solicitação.</div>`;
        }
    }

    static async updateStatus(id, newStatus) {
        const selectEl = document.getElementById('select-update-status');
        if(selectEl) selectEl.disabled = true; // Previne múltiplos cliques
        
        try {
            await ApiService.updateSolicitacaoStatus(id, newStatus);
            UI.showToast('Status atualizado com sucesso!', 'success');
            
            // Atualização Otimista robusta: atualiza as tags tanto no design mobile quanto desktop simultaneamente
            const listItems = document.querySelectorAll(`.request-item[data-id="${id}"] .status-col`);
            listItems.forEach(el => el.innerHTML = UI.renderStatusBadge(newStatus));
            
            // Atualiza objeto atual para eventual geração de PDF
            if(this.currentRequest) this.currentRequest.status = newStatus;

        } catch(e) {
            UI.showToast(e.message || 'Erro ao atualizar status', 'error');
            // Reverte o select se falhar
            if(selectEl && this.currentRequest) selectEl.value = this.currentRequest.status || 'criado';
        } finally {
            if(selectEl) selectEl.disabled = false;
        }
    }

    static async downloadPDF() {
        if (!this.currentRequest) return;
        const req = this.currentRequest;
        const originalText = document.getElementById('btn-download-pdf').innerHTML;
        UI.setButtonLoading('btn-download-pdf', true, '');

        try {
            let localInfo = { nome: 'Não informado', cidade: '-', estado: '-' };
            try {
                if(req.local_id) localInfo = await ApiService.getLocalById(req.local_id);
            } catch (e) { console.warn("Local info miss no PDF."); }

            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            const dataHora = new Date();
            const element = document.createElement('div');
            
            // Reutiliza o layout PDF exato do original para manter integridade visual impressa
            element.innerHTML = `
                <div style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 800px; margin: 0 auto; line-height: 1.5;">
                    <!-- CABEÇALHO -->
                    <table style="width: 100%; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; vertical-align: middle;">
                                <img src="${window.location.origin}/assets/logo.png" style="max-height: 65px; width: auto;" onerror="this.style.display='none'">
                            </td>
                            <td style="width: 50%; text-align: right; vertical-align: middle; font-size: 11px; color: #4b5563; line-height: 1.4;">
                                <strong style="font-size: 12px; color: #111827;">ARCAIKA ENGENHARIA LTDA</strong><br>
                                Documento Interno de Serviço
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; background-color: #f97316; color: white; margin-bottom: 30px; border-radius: 6px;">
                        <tr>
                            <td style="padding: 15px 20px;"><h1 style="margin: 0; font-size: 22px;">ORDEM DE SERVIÇO #${safeOS}</h1></td>
                            <td style="padding: 15px 20px; text-align: right; font-size: 14px;"><strong>Data:</strong> ${dataHora.toLocaleDateString('pt-BR')}</td>
                        </tr>
                    </table>
                    <table style="width: 100%; margin-bottom: 30px; border-spacing: 0;">
                        <tr>
                            <td style="width: 48%; vertical-align: top; padding: 18px; border: 1px solid #e5e7eb; background-color: #f9fafb;">
                                <h3 style="color: #ea580c; font-size: 12px; margin-bottom: 12px;">Local / Unidade</h3>
                                <strong>${UI.escapeHTML(localInfo.nome)} - ${UI.escapeHTML(localInfo.cidade)}</strong><br>
                                Unidade: ${req.nome_da_unidade ? UI.escapeHTML(req.nome_da_unidade) : 'N/A'}
                            </td>
                            <td style="width: 4%;"></td>
                            <td style="width: 48%; vertical-align: top; padding: 18px; border: 1px solid #e5e7eb; background-color: #f9fafb;">
                                <h3 style="color: #ea580c; font-size: 12px; margin-bottom: 12px;">Solicitante</h3>
                                <strong>${UI.escapeHTML(req.nome)}</strong><br>
                                ${UI.escapeHTML(req.telefone)} | ${UI.escapeHTML(req.email)}
                            </td>
                        </tr>
                    </table>
                    <div style="border: 1px solid #e5e7eb; padding: 20px;">
                        <h3 style="color: #ea580c; font-size: 13px; margin-bottom: 15px;">Detalhes da Solicitação</h3>
                        <p><strong>Assunto:</strong> ${UI.escapeHTML(req.assunto)}</p>
                        <p><strong>Prioridade:</strong> ${UI.escapeHTML(req.prioridade).toUpperCase()}</p>
                        <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border: 1px solid #f3f4f6;">
                            <strong>Descrição:</strong><br>
                            <span style="white-space: pre-wrap;">${UI.escapeHTML(req.descricao)}</span>
                        </div>
                    </div>
                </div>
            `;
            const opt = { margin: 10, filename: `OS_${safeOS}_Arcaika.pdf`, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            await html2pdf().set(opt).from(element).save();
            UI.showToast("PDF gerado com sucesso!", "success");
        } catch (error) {
            UI.showToast("Erro ao gerar o documento PDF.", "error");
        } finally {
            UI.setButtonLoading('btn-download-pdf', false, originalText);
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
            UI.showToast("Local cadastrado com sucesso!", "success");
            
            // Limpa form e fecha modal
            document.getElementById('form-create-local').reset();
            UI.closeModal('create-local-modal');
            
            // Automatiza a UX preenchendo o filtro com a cidade recém cadastrada
            const cityInput = document.getElementById('admin-search-city');
            const ufSelect = document.getElementById('admin-search-uf');
            if(cityInput) cityInput.value = cidade;
            if(ufSelect) ufSelect.value = estado;
            
            // Volta para a aba de filtro por Localidade se estiver na global
            const btnModeLocal = document.getElementById('btn-mode-local');
            if(btnModeLocal) btnModeLocal.click();
            
            await this.searchLocaisAdmin(cidade, estado);

        } catch(error) {
            UI.showToast(error.message || "Erro ao cadastrar local.", "error");
        } finally {
            UI.setButtonLoading('btn-submit-create-local', false, '<i data-lucide="save" class="w-4 h-4"></i> Salvar Local');
        }
    }
    
    static async copyLocalLink() {
        if (!AppState.admin.currentLocalId) {
            UI.showToast("Selecione um local primeiro.", "error");
            return;
        }

        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('local', AppState.admin.currentLocalId);
        const textToCopy = url.toString();

        try {
            // Caminho moderno (Clipboard API)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                throw new Error("Clipboard API indisponível");
            }

            UI.showToast("Link copiado para a área de transferência!", "success");

        } catch (err) {
            // Fallback legado
            try {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                document.execCommand("copy");

                document.body.removeChild(textArea);

                UI.showToast("Link copiado para a área de transferência!", "success");

            } catch (fallbackErr) {
                UI.showToast("O navegador bloqueou a cópia. Copie manualmente.", "error");
            }
        }
    }
}