import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class LocalUserController {
    static currentRequest = null;

    static async initDashboard() {
        // Zera o estado ao entrar
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
            
            // Evento para abrir detalhes
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

    static async openDetails(id) {
        UI.openModal('details-modal');
        const body = document.getElementById('details-modal-body');
        const headerOs = document.getElementById('modal-header-os');
        const btnPdf = document.getElementById('btn-download-pdf');
        
        // Sobrescreve a função de PDF do botão para usar a lógica deste controller
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

            // Para o Local User, exibimos o status apenas como leitura (sem select)
            const statusBadge = UI.renderStatusBadge(req.status || 'criado');
            const statusDisplay = `
                <div class="bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-6 flex flex-row items-center justify-between gap-4">
                    <div>
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Status Atual</p>
                        <p class="text-sm text-slate-500">Acompanhamento do chamado</p>
                    </div>
                    <div class="transform scale-110 origin-right">${statusBadge}</div>
                </div>
            `;

            body.innerHTML = `
                <div class="max-w-3xl mx-auto space-y-6 fade-in">
                    ${statusDisplay}
                    
                    <div class="flex flex-wrap justify-between gap-4 mb-2">
                        <h4 class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">${UI.escapeHTML(req.assunto)}</h4>
                        <div>${UI.renderPriorityBadge(req.prioridade)}</div>
                    </div>

                    ${req.nome_da_unidade ? `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-sm font-medium mb-4"><i data-lucide="map-pin" class="w-4 h-4"></i> ${UI.escapeHTML(req.nome_da_unidade)}</div>` : ''}
                    
                    <div class="bg-slate-50 border border-slate-100 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">${UI.escapeHTML(req.descricao)}</div>
                    
                    ${req.informacoes_adicionais ? `
                    <div class="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mt-4">
                        <p class="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Info Adicional</p>
                        <p class="text-sm text-amber-900">${UI.escapeHTML(req.informacoes_adicionais)}</p>
                    </div>` : ''}

                    <hr class="border-slate-100 my-8">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitante</p>
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                    ${req.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900">${UI.escapeHTML(req.nome)}</p>
                                    <p class="text-xs text-slate-500">${UI.escapeHTML(req.email)}</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contato</p>
                            <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 w-fit">
                                <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i>
                                <span class="text-sm font-medium text-slate-900">${UI.escapeHTML(req.telefone)}</span>
                            </div>
                        </div>
                    </div>

                    <hr class="border-slate-100 my-8">

                    <div>
                        <h4 class="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i data-lucide="folder-open" class="w-4 h-4 text-slate-400"></i> Arquivos Anexos
                        </h4>
                        ${anexosHTML}
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
        UI.setButtonLoading('btn-download-pdf', true, '');

        try {
            const safeOS = UI.escapeHTML(String(req.ordem_de_servico || req.ordem_servico || '0').padStart(4, '0'));
            const dataHora = new Date();
            const dateStr = dataHora.toLocaleDateString('pt-BR');
            const timeStr = dataHora.toLocaleTimeString('pt-BR', { hour12: false });

            // Busca os detalhes da secretaria (local) via API caso não venha aninhado
            let localData = req.local;
            if (!localData && req.local_id) {
                try {
                    localData = await ApiService.getLocalById(req.local_id);
                } catch (e) {
                    console.warn("Aviso: Não foi possível buscar os detalhes do local na API.", e);
                }
            }

            // Tratamento das propriedades do objeto para espelhar o backend
            const localNome = UI.escapeHTML((localData && localData.nome) ? localData.nome : 'Não informado');
            const localCidade = UI.escapeHTML((localData && localData.cidade) ? localData.cidade : '-');
            const localEstado = UI.escapeHTML((localData && localData.estado) ? localData.estado : '-');
            const unidadeNome = UI.escapeHTML(req.nome_da_unidade || 'NÃO INFORMADO');

            // Cores da prioridade baseadas no script python
            let priText = String(req.prioridade || 'BAIXA').toUpperCase();
            let priColorText = '#16A34A'; // Verde Padrão
            let priColorBg = '#F0FDF4';
            
            if (priText === 'ALTA') {
                priColorText = '#DC2626'; 
                priColorBg = '#FEF2F2';
            } else if (priText === 'MÉDIA' || priText === 'MEDIA') {
                priColorText = '#D97706'; 
                priColorBg = '#FFFBEB';
            }

            const descHtml = UI.escapeHTML(req.descricao || '').replace(/\n/g, '<br/>');
            const infoHtml = req.informacoes_adicionais ? UI.escapeHTML(req.informacoes_adicionais).replace(/\n/g, '<br/>') : '';

            const element = document.createElement('div');
            
            // Montagem exata baseada nas dimensões (A4 180mm content width) e cores (ReportLab)
            element.innerHTML = `
                <div style="width: 180mm; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; background: white;">

                    <!-- CABEÇALHO -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <tr>
                            <td style="width: 50%; vertical-align: middle;">
                                <img src="${window.location.origin}/assets/logo.png" style="max-height: 20mm; max-width: 50mm;" onerror="this.outerHTML='<b style=\\'font-size:11pt; color:#111827;\\'>ARCAIKA ENGENHARIA</b>'">
                            </td>
                            <td style="width: 50%; text-align: right; vertical-align: middle; font-size: 9pt; color: #4B5563; line-height: 1.3;">
                                <strong style="color: #111827;">ARCAIKA ENGENHARIA LTDA</strong><br>
                                CNPJ: 42.907.720/0001-85<br>
                                Al. Botafogo, 174 - Qd 77, L 11 - St. Central<br>
                                Goiânia - GO, 74030-020<br>
                                Tel: (62) 99616-4188
                            </td>
                        </tr>
                    </table>
                    <div style="border-bottom: 2pt solid #F97316; margin-bottom: 15px;"></div>

                    <!-- TÍTULO OS -->
                    <table style="width: 100%; background-color: #F97316; color: white; border-collapse: collapse; margin-bottom: 15px;">
                        <tr>
                            <td style="padding: 10px 15px; font-size: 16pt; font-weight: bold;">
                                ORDEM DE SERVIÇO #${safeOS}
                            </td>
                            <td style="padding: 10px 15px; text-align: right; font-size: 10pt;">
                                <b>Data:</b> ${dateStr}
                            </td>
                        </tr>
                    </table>

                    <!-- SEÇÃO 1 E 2 (CARDS LOCAL E SOLICITANTE) -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">
                        <tr>
                            <!-- CARD LOCAL -->
                            <td style="width: 88mm; background: #F9FAFB; border: 1px solid #E5E7EB; padding: 10px; vertical-align: top;">
                                <div style="color: #EA580C; font-size: 10pt; font-weight: bold; text-transform: uppercase;">LOCAL</div>
                                <div style="border-bottom: 1px solid #E5E7EB; margin: 4px 0 8px 0;"></div>

                                <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">SECRETARIA</div>
                                <div style="color: #111827; font-size: 11pt; font-weight: bold; margin-bottom: 8px;">${localNome.toUpperCase()}</div>

                                <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">CIDADE / UF</div>
                                <div style="color: #111827; font-size: 11pt; font-weight: bold; margin-bottom: 8px;">${localCidade.toUpperCase()} - ${localEstado.toUpperCase()}</div>

                                <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">UNIDADE / SETOR</div>
                                <div style="color: #111827; font-size: 11pt; font-weight: bold; margin-bottom: 0;">${unidadeNome.toUpperCase()}</div>
                            </td>
                            <td style="width: 4mm;"></td> <!-- Espaçamento -->
                            
                            <!-- CARD SOLICITANTE -->
                            <td style="width: 88mm; background: #F9FAFB; border: 1px solid #E5E7EB; padding: 10px; vertical-align: top;">
                                <div style="color: #EA580C; font-size: 10pt; font-weight: bold; text-transform: uppercase;">SOLICITANTE</div>
                                <div style="border-bottom: 1px solid #E5E7EB; margin: 4px 0 8px 0;"></div>

                                <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">NOME COMPLETO</div>
                                <div style="color: #111827; font-size: 11pt; font-weight: bold; margin-bottom: 8px;">${UI.escapeHTML(req.nome).toUpperCase()}</div>

                                <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">E-MAIL</div>
                                <div style="color: #111827; font-size: 11pt; font-weight: bold; margin-bottom: 8px;">${UI.escapeHTML(req.email)}</div>

                                <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">TELEFONE</div>
                                <div style="color: #111827; font-size: 11pt; font-weight: bold; margin-bottom: 0;">${UI.escapeHTML(req.telefone)}</div>
                            </td>
                        </tr>
                    </table>

                    <!-- DETALHES DA SOLICITAÇÃO -->
                    <div style="background: white; border: 1px solid #E5E7EB; padding: 15px; margin-bottom: 15px;">
                        <div style="color: #EA580C; font-size: 10pt; font-weight: bold; text-transform: uppercase;">DETALHES DA SOLICITAÇÃO</div>
                        <div style="border-bottom: 2pt solid #F3F4F6; margin: 6px 0 10px 0;"></div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                            <tr>
                                <td style="vertical-align: top;">
                                    <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 2px;">ASSUNTO</div>
                                    <div style="color: #111827; font-size: 11pt; font-weight: bold;">${UI.escapeHTML(req.assunto).toUpperCase()}</div>
                                </td>
                                <td style="vertical-align: top; text-align: right; width: 40mm;">
                                    <div style="color: #6B7280; font-size: 8pt; font-weight: bold; margin-bottom: 4px;">PRIORIDADE</div>
                                    <div style="display: inline-block; padding: 4px; background: ${priColorBg}; color: ${priColorText}; border: 1pt solid ${priColorText}; font-size: 10pt; font-weight: bold; text-align: center; width: 35mm;">
                                        ${priText}
                                    </div>
                                </td>
                            </tr>
                        </table>

                        <div style="color: #4B5563; font-size: 9pt; font-weight: bold; margin-bottom: 2px;">DESCRIÇÃO DO PROBLEMA / SERVIÇO</div>
                        <div style="border-bottom: 1px solid #F3F4F6; margin-bottom: 6px;"></div>
                        <div style="background: #F9FAFB; border: 1px solid #F3F4F6; padding: 10px 12px; color: #374151; font-size: 10pt; line-height: 1.4;">
                            ${descHtml}
                        </div>

                        ${infoHtml ? `
                        <div style="margin-top: 15px;">
                            <div style="color: #4B5563; font-size: 9pt; font-weight: bold; margin-bottom: 2px;">INFORMAÇÕES ADICIONAIS</div>
                            <div style="border-bottom: 1px solid #F3F4F6; margin-bottom: 6px;"></div>
                            <div style="background: #FFFBEB; border: 1px solid #FEF3C7; padding: 10px 12px; color: #374151; font-size: 10pt; line-height: 1.4;">
                                ${infoHtml}
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <!-- OBSERVAÇÕES -->
                    <div style="border: 1px solid #E5E7EB; background: white; padding: 15px; margin-bottom: 15px;">
                        <div style="color: #EA580C; font-size: 10pt; font-weight: bold; text-transform: uppercase;">OBSERVAÇÕES</div>
                        <div style="border-bottom: 2pt solid #F3F4F6; margin: 6px 0 10px 0;"></div>
                        <!-- Linhas pautadas -->
                        <div style="border-bottom: 0.5pt solid #D1D5DB; margin-top: 25px;"></div>
                        <div style="border-bottom: 0.5pt solid #D1D5DB; margin-top: 25px;"></div>
                        <div style="border-bottom: 0.5pt solid #D1D5DB; margin-top: 25px;"></div>
                        <div style="border-bottom: 0.5pt solid #D1D5DB; margin-top: 25px;"></div>
                    </div>

                    <!-- RODAPÉ -->
                    <div style="border-top: 1px solid #E5E7EB; padding-top: 10px; text-align: center; color: #9CA3AF; font-size: 8pt; line-height: 1.3;">
                        Documento gerado eletronicamente pelo Sistema de Solicitações Arcaika Engenharia.<br>
                        Gerado em ${dateStr} às ${timeStr}.
                    </div>

                </div>
            `;

            // Configuração idêntica de margens do ReportLab (A4 com 15mm de margem por default)
            const opt = { 
                margin: 15, 
                filename: `OS_${safeOS}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
            };
            
            await html2pdf().set(opt).from(element).save();
            UI.showToast("PDF gerado com sucesso!", "success");

        } catch (error) {
            UI.showToast("Erro ao gerar o documento PDF.", "error");
        } finally {
            UI.setButtonLoading('btn-download-pdf', false, originalText);
        }
    }
}