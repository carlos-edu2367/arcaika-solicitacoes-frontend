import { ApiService } from './api.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

export class ClientController {
    static async searchLocais(e) {
        e.preventDefault();
        const uf = document.getElementById('search-uf').value;
        const city = document.getElementById('search-city').value;
        
        UI.setButtonLoading('btn-search-local', true, 'Buscar Locais');
        try {
            const locais = await ApiService.getLocais(city, uf);
            const resultsContainer = document.getElementById('local-results');
            resultsContainer.innerHTML = '';
            
            if(!locais || locais.length === 0) {
                resultsContainer.innerHTML = `<div class="p-4 text-sm text-slate-500 font-medium text-center bg-slate-50 border border-slate-100 rounded-xl">Nenhum local encontrado para esta região.</div>`;
            } else {
                locais.forEach(local => {
                    // Safe injection preventing DOM XSS
                    const safeNome = UI.escapeHTML(local.nome);
                    const safeCidade = UI.escapeHTML(local.cidade);
                    const safeEstado = UI.escapeHTML(local.estado);
                    
                    resultsContainer.innerHTML += `
                        <div class="local-item p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:border-brand-500 transition-all cursor-pointer bg-slate-50 hover:bg-white shadow-sm hover:shadow-md"
                             data-id="${UI.escapeHTML(local.id)}" data-name="${safeNome}">
                            <div>
                                <h4 class="font-bold text-slate-900 text-sm mb-0.5">${safeNome}</h4>
                                <p class="text-xs text-slate-500 font-medium">${safeCidade} - ${safeEstado}</p>
                            </div>
                            <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
                        </div>
                    `;
                });
                lucide.createIcons({ root: resultsContainer });
            }
            resultsContainer.classList.remove('hidden');
        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error.message, type: 'error' }}));
        } finally {
            UI.setButtonLoading('btn-search-local', false, 'Buscar Locais');
        }
    }

    static selectLocal(id, name) {
        AppState.selectedLocalId = id;
        AppState.selectedLocalName = name;
        window.history.pushState({}, '', `?local=${id}`);
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'request' }}));
    }

    static updateFileList(input) {
        const list = document.getElementById('file-list');
        list.innerHTML = '';
        Array.from(input.files).forEach((file) => {
            const safeName = UI.escapeHTML(file.name);
            list.innerHTML += `
                <li class="flex items-center justify-between py-2.5 px-4 bg-white border border-slate-200 shadow-sm rounded-xl text-sm">
                    <span class="truncate text-slate-700 font-bold flex items-center gap-3">
                        <i data-lucide="file" class="w-4 h-4 text-brand-500"></i> ${safeName}
                    </span>
                    <span class="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </li>
            `;
        });
        lucide.createIcons({ root: list });
    }

    static async submitRequest(e) {
        e.preventDefault();
        
        if(!AppState.selectedLocalId) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Erro de integridade: Local não selecionado.", type: 'error' }}));
            return;
        }

        const payload = {
            local_id: AppState.selectedLocalId,
            nome: document.getElementById('req-nome').value.trim(),
            email: document.getElementById('req-email').value.trim(),
            telefone: document.getElementById('req-telefone').value.trim(),
            nome_unidade: document.getElementById('req-unidade').value.trim(),
            assunto: document.getElementById('req-assunto').value.trim(),
            descricao: document.getElementById('req-descricao').value.trim(),
            prioridade: document.getElementById('req-prioridade').value,
            informacoes_adicionais: document.getElementById('req-info').value.trim() || null
        };

        const files = document.getElementById('req-anexos').files;

        UI.setButtonLoading('btn-submit-request', true, '');
        
        try {
            // 1. Cria a solicitação primeiro e obtém o ID
            const novaSolicitacaoId = await ApiService.createSolicitacao(payload);
            
            // 2. Se houver arquivos, envia todos eles em uma única requisição
            // O backend espera `file: list[UploadFile]`, o que combina perfeitamente com o envio único
            if(files.length > 0) {
                await ApiService.uploadAnexo(files, novaSolicitacaoId, "cliente");
            }

            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Solicitação registrada com sucesso!", type: 'success' }}));
            
            // Limpa o formulário
            document.getElementById('form-request').reset();
            document.getElementById('file-list').innerHTML = '';
            
            // Feedback de sucesso visual no botão
            const btn = document.getElementById('btn-submit-request');
            btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Recebido com Sucesso`;
            btn.classList.replace('bg-brand-500', 'bg-emerald-500');
            btn.classList.replace('hover:bg-brand-600', 'hover:bg-emerald-600');
            btn.classList.replace('shadow-[0_8px_20px_-6px_rgba(249,115,22,0.5)]', 'shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)]');
            lucide.createIcons({ root: btn });
            
            // Restaura o botão após alguns segundos
            setTimeout(() => {
                btn.classList.replace('bg-emerald-500', 'bg-brand-500');
                btn.classList.replace('hover:bg-emerald-600', 'hover:bg-brand-600');
                btn.classList.replace('shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)]', 'shadow-[0_8px_20px_-6px_rgba(249,115,22,0.5)]');
                btn.innerHTML = `<span>Enviar Solicitação</span><i data-lucide="send" class="w-4 h-4"></i>`;
                lucide.createIcons({ root: btn });
            }, 4000);

        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error.message || "Não foi possível enviar a solicitação.", type: 'error' }}));
        } finally {
            const btn = document.getElementById('btn-submit-request');
            // Só reseta o loading se o botão não estiver no estado de "Recebido com sucesso"
            if(!btn.innerHTML.includes('Recebido')) {
                UI.setButtonLoading('btn-submit-request', false, `<span>Enviar Solicitação</span><i data-lucide="send" class="w-4 h-4"></i>`);
            } else {
                btn.disabled = false;
                btn.classList.remove('opacity-80', 'cursor-not-allowed');
            }
        }
    }
}