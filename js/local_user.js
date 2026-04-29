import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class LocalUserController {
    static currentRequest = null;

    static async initDashboard() {
        AppState.localUser.page = 1;
        AppState.localUser.requests = [];
        AppState.localUser.hasMore = true;
        
        this.triggerLoad();
    }

    static triggerLoad() {
        const list = document.getElementById('local-user-requests-list');
        if (AppState.localUser.page === 1) {
            list.innerHTML = `
                <div class="absolute inset-0 flex flex-col items-center justify-center fade-in">
                    <div class="loader-sm border-brand-500 border-t-transparent border-4 rounded-full w-10 h-10 animate-spin"></div>
                    <span class="mt-4 text-sm font-medium text-slate-500">Sincronizando dados...</span>
                </div>`;
        }
        this.loadRequests();
    }

    static async loadRequests() {
        if (AppState.localUser.isLoading || !AppState.localUser.hasMore) return;
        
        AppState.localUser.isLoading = true;
        const trigger = document.getElementById('local-user-load-more');
        if (trigger) trigger.classList.remove('hidden');
        
        try {
            const data = await ApiService.getLocalUserSolicitacoes(AppState.localUser.page, AppState.localUser.limit);
            
            if (AppState.localUser.page === 1) {
                document.getElementById('local-user-requests-list').innerHTML = '';
            }
            
            if (!data || data.length === 0) {
                AppState.localUser.hasMore = false;
                if (AppState.localUser.page === 1) {
                    document.getElementById('local-user-requests-list').innerHTML = `
                        <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 fade-in px-6 text-center">
                            <div class="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
                                <i data-lucide="shield-check" class="w-10 h-10 text-brand-500 opacity-80"></i>
                            </div>
                            <h4 class="text-slate-800 font-bold text-lg mb-2">Tudo tranquilo por aqui</h4>
                            <p class="text-sm text-slate-500 max-w-xs">Nenhuma solicitação foi registrada para a sua unidade até o momento.</p>
                        </div>`;
                    lucide.createIcons({ root: document.getElementById('local-user-requests-list') });
                }
            } else {
                if (data.length < AppState.localUser.limit) AppState.localUser.hasMore = false;
                AppState.localUser.page++;
                this.renderRequestCards(data);
            }

        } catch (error) {
            UI.showToast("Erro ao carregar as solicitações da sua unidade.", "error");
            AppState.localUser.hasMore = false; 
            if (AppState.localUser.page === 1) {
                document.getElementById('local-user-requests-list').innerHTML = `
                    <div class="p-8 text-center text-red-500 font-medium w-full flex flex-col items-center">
                        <i data-lucide="wifi-off" class="w-8 h-8 mb-2"></i> Falha de conexão. Tente recarregar a página.
                    </div>`;
                lucide.createIcons({ root: document.getElementById('local-user-requests-list') });
            }
        } finally {
            AppState.localUser.isLoading = false;
            if (!AppState.localUser.hasMore && trigger) trigger.classList.add('hidden');
        }
    }

    static renderRequestCards(requests) {
        const list = document.getElementById('local-user-requests-list');
        requests.forEach(req => {
            const el = document.createElement('div');
            el.className = "group border-b border-slate-100 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer bg-white relative p-4 sm:p-5 flex flex-col gap-3";
            el.dataset.id = req.id;
            
            el.onclick = () => this.openDetails(req.id);
            
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            const safeAssunto = UI.escapeHTML(req.assunto);
            const statusBadge = UI.renderStatusBadge(req.status || 'criado');

            el.innerHTML = `
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full"></div>
                
                <div class="flex justify-between items-start gap-4">
                    <div class="flex items-center gap-2">
                        <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider border border-slate-200">OS #${safeOS}</span>
                        ${UI.renderPriorityBadge(req.prioridade)}
                    </div>
                    <div class="flex-shrink-0">${statusBadge}</div>
                </div>
                
                <div>
                    <h3 class="font-bold text-slate-900 text-base sm:text-lg leading-tight mb-1 group-hover:text-brand-600 transition-colors">${safeAssunto}</h3>
                    <p class="text-sm text-slate-500 flex items-center gap-1.5 truncate">
                        <i data-lucide="user" class="w-3.5 h-3.5"></i> ${UI.escapeHTML(req.nome)}
                    </p>
                </div>
            `;
            list.appendChild(el);
        });
        lucide.createIcons({ root: list });
    }

    static updateCardInList(updatedReq) {
        const list = document.getElementById('local-user-requests-list');
        if (!list) return;
        
        const el = Array.from(list.children).find(c => c.dataset && c.dataset.id === updatedReq.id);
        if (el) {
            const safeOS = UI.escapeHTML(String(updatedReq.ordem_de_servico || updatedReq.ordem_servico || '0').padStart(4, '0'));
            const safeAssunto = UI.escapeHTML(updatedReq.assunto);
            const statusBadge = UI.renderStatusBadge(updatedReq.status || 'criado');
            
            el.innerHTML = `
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full"></div>
                
                <div class="flex justify-between items-start gap-4">
                    <div class="flex items-center gap-2">
                        <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider border border-slate-200">OS #${safeOS}</span>
                        ${UI.renderPriorityBadge(updatedReq.prioridade)}
                    </div>
                    <div class="flex-shrink-0">${statusBadge}</div>
                </div>
                
                <div>
                    <h3 class="font-bold text-slate-900 text-base sm:text-lg leading-tight mb-1 group-hover:text-brand-600 transition-colors">${safeAssunto}</h3>
                    <p class="text-sm text-slate-500 flex items-center gap-1.5 truncate">
                        <i data-lucide="user" class="w-3.5 h-3.5"></i> ${UI.escapeHTML(updatedReq.nome)}
                    </p>
                </div>
            `;
            lucide.createIcons({ root: el });
        }
    }

    static renderEditableField(req, fieldKey, displayHtml, inputType = 'text') {
        const isEditable = (req.status === 'criado' || req.status === 'CRIADO');
        if (!isEditable) return displayHtml;

        const value = req[fieldKey] || '';
        const safeValue = UI.escapeHTML(value);

        let inputHtml = '';
        if (inputType === 'textarea') {
            inputHtml = `<textarea id="edit-input-${fieldKey}" class="w-full px-3 py-2 bg-white border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition text-sm font-medium resize-none" rows="4">${safeValue}</textarea>`;
        } else if (inputType === 'select-prioridade') {
            inputHtml = `
                <select id="edit-input-${fieldKey}" class="w-full px-3 py-2 bg-white border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition text-sm font-bold text-slate-800">
                    <option value="BAIXA" ${value.toUpperCase() === 'BAIXA' ? 'selected' : ''}>🟢 Baixa (Rotina)</option>
                    <option value="MEDIA" ${value.toUpperCase() === 'MEDIA' || value.toUpperCase() === 'MÉDIA' ? 'selected' : ''}>🟠 Média (Importante)</option>
                    <option value="ALTA" ${value.toUpperCase() === 'ALTA' ? 'selected' : ''}>🔴 Alta (Urgente)</option>
                </select>
            `;
        } else {
            inputHtml = `<input type="${inputType}" id="edit-input-${fieldKey}" value="${safeValue}" class="w-full px-3 py-2 bg-white border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition text-sm font-medium">`;
        }

        return `
            <div class="relative group/edit block w-full">
                <div id="display-container-${fieldKey}" class="flex items-start justify-between gap-2 w-full">
                    <div class="flex-grow min-w-0 break-words" id="display-value-${fieldKey}">${displayHtml}</div>
                    <button onclick="LocalUserController.enableEdit('${fieldKey}')" class="opacity-0 group-hover/edit:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg flex-shrink-0 border border-transparent hover:border-brand-200" title="Editar este campo">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                </div>
                <div id="edit-container-${fieldKey}" class="hidden w-full bg-brand-50/80 p-3 rounded-xl border border-brand-200 shadow-sm mt-1">
                    <div class="mb-2">${inputHtml}</div>
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="LocalUserController.cancelEdit('${fieldKey}')" class="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                        <button onclick="LocalUserController.saveEdit('${fieldKey}', '${inputType}')" id="btn-save-${fieldKey}" class="px-3 py-1.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
                            <i data-lucide="check" class="w-3.5 h-3.5"></i> Salvar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    static enableEdit(fieldKey) {
        document.getElementById(`display-container-${fieldKey}`).classList.add('hidden');
        document.getElementById(`edit-container-${fieldKey}`).classList.remove('hidden');
    }

    static cancelEdit(fieldKey) {
        document.getElementById(`edit-container-${fieldKey}`).classList.add('hidden');
        document.getElementById(`display-container-${fieldKey}`).classList.remove('hidden');
    }

    static async saveEdit(fieldKey, inputType) {
        if (!this.currentRequest) return;
        
        const inputEl = document.getElementById(`edit-input-${fieldKey}`);
        let newValue = inputEl.value;
        
        if (inputType !== 'textarea' && inputType !== 'select-prioridade') {
            newValue = newValue.trim();
        }

        if (newValue === (this.currentRequest[fieldKey] || '') && fieldKey !== 'informacoes_adicionais') {
             this.cancelEdit(fieldKey);
             return;
        }

        const btn = document.getElementById(`btn-save-${fieldKey}`);
        const originalBtnHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<div class="loader-sm border-white border-t-transparent border-2 rounded-full w-3.5 h-3.5 animate-spin mx-auto"></div>`;

        try {
            const payload = {
                solicitacao_id: this.currentRequest.id,
                [fieldKey]: newValue
            };
            
            await ApiService.updateLocalUserSolicitacao(payload);
            
            this.currentRequest[fieldKey] = newValue;
            UI.showToast("Campo atualizado com sucesso!", "success");
            
            this.updateCardInList(this.currentRequest);
            this.openDetails(this.currentRequest.id);

        } catch (error) {
            UI.showToast(error.message || "Erro ao atualizar o campo.", "error");
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
            lucide.createIcons({ root: btn });
        }
    }

    static async handleUpload(inputElement) {
        const files = inputElement.files;
        if (!files.length || !this.currentRequest) return;

        const label = document.getElementById('localuser-upload-label');
        const originalHtml = label.innerHTML;
        
        label.classList.add('pointer-events-none', 'opacity-70');
        label.innerHTML = `<div class="loader-sm border-brand-500 border-t-transparent border-2 rounded-full w-4 h-4 animate-spin"></div> Enviando...`;

        try {
            await ApiService.uploadAnexo(files, this.currentRequest.id, "cliente");
            UI.showToast("Anexos adicionados com sucesso!", "success");
            
            this.openDetails(this.currentRequest.id);
        } catch (error) {
            UI.showToast(error.message || "Erro no upload dos anexos.", "error");
        } finally {
            label.classList.remove('pointer-events-none', 'opacity-70');
            label.innerHTML = originalHtml;
            inputElement.value = ''; 
            lucide.createIcons({ root: label });
        }
    }

    static async deleteCurrentSolicitacao() {
        if (!this.currentRequest) return;
        
        const confirmDelete = confirm("Tem certeza que deseja excluir esta Ordem de Serviço? Esta ação não pode ser desfeita.");
        if (!confirmDelete) return;

        try {
            await ApiService.deleteLocalUserSolicitacao(this.currentRequest.id);
            UI.showToast("Ordem de Serviço excluída com sucesso!", "success");
            
            const list = document.getElementById('local-user-requests-list');
            if (list) {
                const el = Array.from(list.children).find(c => c.dataset && c.dataset.id === this.currentRequest.id);
                if (el) el.remove();
            }
            
            UI.closeModal('details-modal');
        } catch (error) {
            UI.showToast(error.message || "Erro ao excluir a Ordem de Serviço.", "error");
        }
    }

    static async openDetails(id) {
        UI.openModal('details-modal');
        const body = document.getElementById('details-modal-body');
        const headerOs = document.getElementById('modal-header-os');
        const btnPdf = document.getElementById('btn-download-pdf');
        
        btnPdf.onclick = () => this.downloadPDF();
        
        btnPdf.classList.add('hidden');
        headerOs.textContent = "Carregando...";
        body.innerHTML = '<div class="flex justify-center py-16"><div class="loader-sm border-brand-500 border-t-transparent border-4 rounded-full w-10 h-10 animate-spin"></div></div>';
        this.currentRequest = null;
        
        try {
            const req = await ApiService.getLocalUserSolicitacaoById(id);
            this.currentRequest = req;
            
            btnPdf.classList.remove('hidden');
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            headerOs.textContent = `OS #${safeOS}`;
            
            let anexosHTML = '<div class="text-sm text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">Nenhum anexo enviado.</div>';
            if(req.anexos && req.anexos.length > 0) {
                anexosHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">`;
                req.anexos.forEach(anexo => {
                    anexosHTML += `
                        <a href="${UI.escapeHTML(anexo.url)}" target="_blank" class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all group bg-white">
                            <div class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 transition-colors">
                                <i data-lucide="paperclip" class="w-5 h-5"></i>
                            </div>
                            <span class="text-sm font-medium text-slate-700 truncate">${UI.escapeHTML(anexo.title)}</span>
                        </a>
                    `;
                });
                anexosHTML += `</div>`;
            }

            const isEditable = (req.status === 'criado' || req.status === 'CRIADO');
            let editUploadZone = '';
            let deleteBtnHtml = '';

            if (isEditable) {
                editUploadZone = `
                    <div class="mt-6 bg-brand-50/50 border border-brand-100 rounded-xl p-5">
                        <h4 class="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2">
                            <i data-lucide="upload-cloud" class="w-4 h-4 text-brand-500"></i> Adicionar Novo Anexo
                        </h4>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                            <input type="file" id="localuser-upload-input" multiple class="hidden" onchange="LocalUserController.handleUpload(this)">
                            <label for="localuser-upload-input" id="localuser-upload-label" class="cursor-pointer bg-white border border-brand-200 text-brand-700 hover:bg-brand-500 hover:text-white hover:border-brand-500 font-semibold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto">
                                <i data-lucide="plus" class="w-4 h-4"></i> Selecionar Arquivos
                            </label>
                            <span class="text-xs text-brand-600 font-medium text-center sm:text-left">PNG, JPG, PDF permitidos.</span>
                        </div>
                    </div>
                `;

                deleteBtnHtml = `
                    <button onclick="LocalUserController.deleteCurrentSolicitacao()" class="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm" title="Excluir O.S.">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> <span class="hidden sm:inline">Excluir</span>
                    </button>
                `;
            }

            // Tratamento e exibição da data de criação
            let dataCriacaoDisplay = '';
            if (req.data_criacao) {
                const d = new Date(req.data_criacao);
                if (!isNaN(d.getTime())) {
                    const dateStr = d.toLocaleDateString('pt-BR');
                    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    dataCriacaoDisplay = `
                        <div class="flex items-center gap-1.5 mt-2.5 text-xs font-medium text-slate-500 bg-slate-50 py-1.5 px-2.5 rounded-md border border-slate-100 w-fit">
                            <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
                            Aberto em: ${dateStr} às ${timeStr}
                        </div>
                    `;
                }
            }

            const statusBadge = UI.renderStatusBadge(req.status || 'criado');
            const statusDisplay = `
                <div class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-6 flex flex-row items-center justify-between gap-4">
                    <div class="flex flex-col">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Status Atual</p>
                        <p class="text-sm text-slate-500">Acompanhamento do chamado</p>
                        ${dataCriacaoDisplay}
                    </div>
                    <div class="flex items-center gap-4">
                        ${deleteBtnHtml}
                        <div class="transform scale-110 origin-right">${statusBadge}</div>
                    </div>
                </div>
            `;

            const safeAssunto = this.renderEditableField(req, 'assunto', `<h4 class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">${UI.escapeHTML(req.assunto)}</h4>`, 'text');
            const safePrioridade = this.renderEditableField(req, 'prioridade', UI.renderPriorityBadge(req.prioridade), 'select-prioridade');
            
            const displayUnidade = req.nome_da_unidade 
                ? `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-sm font-medium"><i data-lucide="map-pin" class="w-4 h-4"></i> ${UI.escapeHTML(req.nome_da_unidade)}</div>` 
                : `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium border border-slate-200"><i data-lucide="map-pin" class="w-4 h-4"></i> Adicionar Unidade/Setor</div>`;
            const safeUnidade = this.renderEditableField(req, 'nome_da_unidade', displayUnidade, 'text');

            const safeDescricao = this.renderEditableField(req, 'descricao', `<div class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">${UI.escapeHTML(req.descricao)}</div>`, 'textarea');
            
            const displayInfo = req.informacoes_adicionais
                ? `<p class="text-sm text-amber-900">${UI.escapeHTML(req.informacoes_adicionais)}</p>`
                : `<p class="text-sm text-amber-700/60 italic">Nenhuma informação adicional. Clique para adicionar.</p>`;
            const safeInfo = this.renderEditableField(req, 'informacoes_adicionais', displayInfo, 'textarea');

            const safeNome = this.renderEditableField(req, 'nome', `<p class="text-sm font-bold text-slate-900">${UI.escapeHTML(req.nome)}</p>`, 'text');
            const safeEmail = this.renderEditableField(req, 'email', `<p class="text-xs text-slate-500">${UI.escapeHTML(req.email)}</p>`, 'email');
            const safeTelefone = this.renderEditableField(req, 'telefone', `<span class="text-sm font-medium text-slate-900">${UI.escapeHTML(req.telefone)}</span>`, 'tel');

            body.innerHTML = `
                <div class="max-w-3xl mx-auto space-y-6 fade-in">
                    ${statusDisplay}
                    
                    <div class="flex flex-col sm:flex-row justify-between gap-4 mb-2 items-start w-full">
                        <div class="flex-grow w-full sm:w-auto">${safeAssunto}</div>
                        <div class="flex-shrink-0 min-w-[140px]">${safePrioridade}</div>
                    </div>

                    <div class="mb-4">${safeUnidade}</div>
                    
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-5 w-full">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Descrição do Problema</p>
                        ${safeDescricao}
                    </div>
                    
                    <div class="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mt-4 w-full">
                        <p class="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Info Adicional</p>
                        ${safeInfo}
                    </div>

                    <hr class="border-slate-100 my-8">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitante</p>
                            <div class="flex items-start gap-3 w-full">
                                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 flex-shrink-0 mt-1">
                                    ${req.nome.charAt(0).toUpperCase()}
                                </div>
                                <div class="flex-grow min-w-0">
                                    ${safeNome}
                                    <div class="mt-1">${safeEmail}</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contato</p>
                            <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 w-full">
                                <i data-lucide="phone" class="w-4 h-4 text-slate-400 flex-shrink-0"></i>
                                <div class="flex-grow min-w-0">${safeTelefone}</div>
                            </div>
                        </div>
                    </div>

                    <hr class="border-slate-100 my-8">

                    <div>
                        <h4 class="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i data-lucide="folder-open" class="w-4 h-4 text-slate-400"></i> Arquivos Anexos
                        </h4>
                        ${anexosHTML}
                        ${editUploadZone}
                    </div>
                </div>
            `;
            lucide.createIcons({ root: body });

        } catch(error) {
            body.innerHTML = `<div class="p-8 text-center text-red-500 font-medium bg-red-50 rounded-xl border border-red-100">Erro ao carregar detalhes. Acesso negado ou item não encontrado.</div>`;
        }
    }

    static async downloadPDF() {
        if (!this.currentRequest) return;
        const req = this.currentRequest;
        const originalText = document.getElementById('btn-download-pdf').innerHTML;
        UI.setButtonLoading('btn-download-pdf', true, 'Preparando PDF...');

        try {
            // --- 1. CARREGAMENTO DINÂMICO DO PDFMAKE ---
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
            const dataHoraPdf = new Date();
            const genDateStr = dataHoraPdf.toLocaleDateString('pt-BR');
            const genTimeStr = dataHoraPdf.toLocaleTimeString('pt-BR', { hour12: false });

            // Data de criação da solicitação em Horário de Brasília
            const dataCriacao = req.data_criacao ? new Date(req.data_criacao) : dataHoraPdf;
            const creationDateStr = dataCriacao.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const creationTimeStr = dataCriacao.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });

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

            // --- 3. CONSTRUÇÃO ESTRUTURAL DO PDF ---
            const layoutBordas = {
                hLineWidth: () => 1, vLineWidth: () => 1,
                hLineColor: () => '#E5E7EB', vLineColor: () => '#E5E7EB'
            };

            const docDefinition = {
                pageSize: 'A4',
                pageMargins: [40, 40, 40, 65],
                defaultStyle: { font: 'Roboto', lineHeight: 1.2 },
                footer: function(currentPage, pageCount) {
                    return {
                        stack: [
                            { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 555, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }], margin: [0, 0, 0, 10] },
                            { text: 'Documento gerado eletronicamente pelo Sistema de Solicitações Arcaika Engenharia.', alignment: 'center', fontSize: 8, color: '#9CA3AF', margin: [0, 0, 0, 2] },
                            { text: `Solicitação criada em ${creationDateStr} às ${creationTimeStr} (Horário de Brasília)`, alignment: 'center', fontSize: 8, color: '#9CA3AF', margin: [0, 0, 0, 2] },
                            { text: `PDF gerado em ${genDateStr} às ${genTimeStr} - Página ${currentPage} de ${pageCount}`, alignment: 'center', fontSize: 8, color: '#9CA3AF' }
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
                                    { text: `Data: ${creationDateStr}`, fontSize: 10, bold: true, color: 'white', alignment: 'right', border: [false, false, false, false], margin: [10, 12] }
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

                    // DETALHES DA SOLICITAÇÃO
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

                    // ASSINATURAS
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