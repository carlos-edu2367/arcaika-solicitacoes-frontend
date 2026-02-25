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
                resultsContainer.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center bg-gray-50 rounded-lg">Nenhum local encontrado para esta região.</div>`;
            } else {
                locais.forEach(local => {
                    // Safe injection preventing DOM XSS
                    const safeNome = UI.escapeHTML(local.nome);
                    const safeCidade = UI.escapeHTML(local.cidade);
                    const safeEstado = UI.escapeHTML(local.estado);
                    
                    resultsContainer.innerHTML += `
                        <div class="local-item p-4 border border-gray-200 rounded-lg flex justify-between items-center hover:border-brand-500 transition cursor-pointer bg-gray-50 hover:bg-white"
                             data-id="${UI.escapeHTML(local.id)}" data-name="${safeNome}">
                            <div>
                                <h4 class="font-bold text-dark text-sm">${safeNome}</h4>
                                <p class="text-xs text-gray-500">${safeCidade} - ${safeEstado}</p>
                            </div>
                            <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400"></i>
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
                <li class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md text-sm">
                    <span class="truncate text-gray-700 flex items-center gap-2">
                        <i data-lucide="file" class="w-4 h-4 text-gray-400"></i> ${safeName}
                    </span>
                    <span class="text-xs text-gray-400">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
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
            const novaSolicitacaoId = await ApiService.createSolicitacao(payload);
            
            if(files.length > 0) {
                // Executar uploads em paralelo para maximizar performance de rede ao invés do loop for-await
                const uploadPromises = Array.from(files).map(file => ApiService.uploadAnexo(file, novaSolicitacaoId));
                await Promise.all(uploadPromises);
            }

            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: "Solicitação registrada com sucesso!", type: 'success' }}));
            
            document.getElementById('form-request').reset();
            document.getElementById('file-list').innerHTML = '';
            
            const btn = document.getElementById('btn-submit-request');
            btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> Enviado`;
            btn.classList.replace('bg-brand-500', 'bg-green-500');
            lucide.createIcons({ root: btn });
            
            setTimeout(() => {
                btn.classList.replace('bg-green-500', 'bg-brand-500');
                btn.innerHTML = `<span>Enviar Solicitação</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
                lucide.createIcons({ root: btn });
            }, 3000);

        } catch (error) {
            window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: error.message || "Não foi possível enviar a solicitação.", type: 'error' }}));
        } finally {
            UI.setButtonLoading('btn-submit-request', false, `<span>Enviar Solicitação</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`);
        }
    }
}