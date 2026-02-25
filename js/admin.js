import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class AdminController {
    static currentRequest = null; // Armazena os dados da solicitação atual para o PDF

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
            
            // Formata a OS com zeros à esquerda (ex: 1 -> 0001, 42 -> 0042)
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico).padStart(4, '0'));
            const safeNome = UI.escapeHTML(req.nome);
            const safeAssunto = UI.escapeHTML(req.assunto);

            el.innerHTML = `
                <div class="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                    <div class="col-span-2 text-sm font-mono text-gray-500 truncate">#${safeOS}</div>
                    <div class="col-span-3 text-sm font-medium text-dark truncate">${safeNome}</div>
                    <div class="col-span-4 text-sm text-gray-600 truncate">${safeAssunto}</div>
                    <div class="col-span-2">${UI.renderPriorityBadge(req.prioridade)}</div>
                    <div class="col-span-1 text-right">
                        <button class="text-gray-400 hover:text-brand-500 p-1"><i data-lucide="eye" class="w-4 h-4"></i></button>
                    </div>
                </div>
                
                <div class="md:hidden p-4 space-y-2">
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-mono text-gray-500">OS: #${safeOS}</span>
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
        const btnPdf = document.getElementById('btn-download-pdf');
        
        if (btnPdf) btnPdf.classList.add('hidden'); // Oculta botão até carregar os dados
        body.innerHTML = '<div class="flex justify-center py-10"><div class="loader border-t-dark"></div></div>';
        this.currentRequest = null;
        
        try {
            const req = await ApiService.getSolicitacaoById(id);
            this.currentRequest = req;
            
            if (btnPdf) btnPdf.classList.remove('hidden'); // Mostra botão de PDF
            
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

            // Destaca a OS formatada e lê do novo field nome_da_unidade
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico).padStart(4, '0'));

            body.innerHTML = `
                <div class="space-y-6">
                    <div class="flex flex-wrap justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <p class="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Ordem de Serviço</p>
                            <p class="font-medium text-dark text-lg">#${safeOS}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Prioridade</p>
                            ${UI.renderPriorityBadge(req.prioridade)}
                        </div>
                    </div>

                    <div>
                        <h4 class="text-lg font-bold text-dark mb-1">${UI.escapeHTML(req.assunto)}</h4>
                        ${req.nome_da_unidade ? `<p class="text-sm font-medium text-brand-600 mb-3 flex items-center gap-1"><i data-lucide="map-pin" class="w-4 h-4"></i> Unidade: ${UI.escapeHTML(req.nome_da_unidade)}</p>` : ''}
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

    static async downloadPDF() {
        if (!this.currentRequest) return;
        const req = this.currentRequest;
        const btnPdf = document.getElementById('btn-download-pdf');
        
        // UI Loading State
        const originalText = btnPdf.innerHTML;
        UI.setButtonLoading('btn-download-pdf', true, '');

        try {
            // Busca os dados completos do Local antes de gerar o PDF
            let localInfo = { nome: 'Não informado', cidade: '-', estado: '-' };
            try {
                localInfo = await ApiService.getLocalById(req.local_id);
            } catch (e) {
                console.warn("Não foi possível carregar os dados do local para o PDF.");
            }

            const safeOS = UI.escapeHTML(String(req.ordem_de_servico).padStart(4, '0'));
            const dataHora = new Date();
            
            // DICA: Layout reestruturado. Uso de tabelas para a grade estrutural evita falhas no canvas.
            // Os campos de texto longo (Descrição) agora ocupam linhas isoladas (div) para prevenir perdas de espaço/palavras grudadas.
            const element = document.createElement('div');
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
                                CNPJ: 42.907.720/0001-85<br>
                                Al. Botafogo, 174 - Qd 77, L 11 - St. Central<br>
                                Goiânia - GO, 74030-020<br>
                                Tel: (62) 99616-4188
                            </td>
                        </tr>
                    </table>

                    <!-- TÍTULO DA ORDEM DE SERVIÇO (Usando tabela para garantir flexbox fallback no PDF) -->
                    <table style="width: 100%; background-color: #f97316; color: white; margin-bottom: 30px; border-collapse: collapse; border-radius: 6px;">
                        <tr>
                            <td style="padding: 15px 20px;">
                                <h1 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">ORDEM&nbsp;DE&nbsp;SERVIÇO&nbsp;#${safeOS}</h1>
                            </td>
                            <td style="padding: 15px 20px; text-align: right; font-size: 14px;">
                                <strong>Data:</strong> ${dataHora.toLocaleDateString('pt-BR')}
                            </td>
                        </tr>
                    </table>

                    <!-- SEÇÃO 1 E 2: LOCAL E SOLICITANTE LADO A LADO -->
                    <table style="width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 0;">
                        <tr>
                            <!-- Dados do Local -->
                            <td style="width: 48%; vertical-align: top; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
                                <h3 style="color: #ea580c; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px;"> Local</h3>
                                <div style="margin-bottom: 10px;">
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase;">Secretaria</span>
                                    <strong style="font-size: 14px; color: #111827;">${UI.escapeHTML(localInfo.nome).toUpperCase()}</strong>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase;">Cidade / UF</span>
                                    <strong style="font-size: 14px; color: #111827;">${UI.escapeHTML(localInfo.cidade).toUpperCase()} - ${UI.escapeHTML(localInfo.estado).toUpperCase()}</strong>
                                </div>
                                <div>
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase;">Unidade / Setor</span>
                                    <strong style="font-size: 14px; color: #111827;">${req.nome_da_unidade ? UI.escapeHTML(req.nome_da_unidade).toUpperCase() : 'NÃO INFORMADO'}</strong>
                                </div>
                            </td>
                            <!-- Espaçamento -->
                            <td style="width: 4%;"></td>
                            <!-- Dados do Solicitante -->
                            <td style="width: 48%; vertical-align: top; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
                                <h3 style="color: #ea580c; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px;"> Solicitante</h3>
                                <div style="margin-bottom: 10px;">
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase;">Nome Completo</span>
                                    <strong style="font-size: 14px; color: #111827;">${UI.escapeHTML(req.nome).toUpperCase()}</strong>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase;">E-mail</span>
                                    <strong style="font-size: 14px; color: #111827;">${UI.escapeHTML(req.email)}</strong>
                                </div>
                                <div>
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase;">Telefone</span>
                                    <strong style="font-size: 14px; color: #111827;">${UI.escapeHTML(req.telefone)}</strong>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- SEÇÃO 3: DETALHES DO SERVIÇO (Bloco centralizado e isolado) -->
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background-color: #ffffff; margin-bottom: 30px;">
                        <h3 style="color: #ea580c; font-size: 13px; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;"> Detalhes da Solicitação</h3>
                        
                        <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                            <tr>
                                <td style="width: 70%; vertical-align: top; padding-right: 15px;">
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; margin-bottom: 3px;">Assunto</span>
                                    <strong style="font-size: 16px; color: #111827;">${UI.escapeHTML(req.assunto).toUpperCase()}</strong>
                                </td>
                                <td style="width: 30%; vertical-align: top; text-align: right;">
                                    <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; margin-bottom: 6px;">Prioridade</span>
                                    <strong style="font-size: 13px; padding: 6px 12px; border-radius: 4px; border: 1px solid currentColor; color: ${req.prioridade === 'alta' ? '#dc2626' : req.prioridade === 'média' ? '#d97706' : '#16a34a'}; background-color: ${req.prioridade === 'alta' ? '#fef2f2' : req.prioridade === 'média' ? '#fffbeb' : '#f0fdf4'};">${UI.escapeHTML(req.prioridade).toUpperCase()}</strong>
                                </td>
                            </tr>
                        </table>

                        <!-- DESCRIÇÃO (Retirado da tabela para consertar o bug do espaço e pre-wrap) -->
                        <div style="margin-bottom: ${req.informacoes_adicionais ? '20px' : '0'};">
                            <span style="font-size: 12px; font-weight: bold; color: #4b5563; display: block; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">Descrição do Problema / Serviço</span>
                            <div style="font-size: 14px; color: #374151; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #f3f4f6;">${UI.escapeHTML(req.descricao)}</div>
                        </div>

                        <!-- INFO ADICIONAIS -->
                        ${req.informacoes_adicionais ? `
                        <div>
                            <span style="font-size: 12px; font-weight: bold; color: #4b5563; display: block; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">Informações Adicionais</span>
                            <div style="font-size: 14px; color: #374151; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; background-color: #fffbeb; padding: 15px; border-radius: 6px; border: 1px solid #fef3c7;">${UI.escapeHTML(req.informacoes_adicionais)}</div>
                        </div>` : ''}
                    </div>

                    <!-- RODAPÉ -->
                    <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                        Documento gerado eletronicamente pelo Sistema de Solicitações Arcaika Engenharia.<br>
                        Gerado em ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR')}.
                    </div>
                </div>
            `;

            // Configuração do motor PDF
            const opt = {
                margin:       10,
                filename:     `OS_${safeOS}_Arcaika.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true }, // letterRendering ajuda em correções de espaço adicionais
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Gera e baixa o PDF
            await html2pdf().set(opt).from(element).save();
            
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "PDF gerado com sucesso!", type: 'success' }}));
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Erro ao gerar o documento PDF.", type: 'error' }}));
        } finally {
            UI.setButtonLoading('btn-download-pdf', false, originalText);
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