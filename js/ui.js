export class UI {
    static escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    static showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-slate-900' : 'bg-red-600';
        const icon = type === 'success' ? 'check-circle' : 'alert-octagon';
        
        toast.className = `${bgColor} text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0 border border-white/10`;
        toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 ${type === 'success' ? 'text-emerald-400' : 'text-white'}"></i> <span class="text-sm font-medium tracking-wide">${this.escapeHTML(message)}</span>`;
        
        container.appendChild(toast);
        lucide.createIcons({ root: toast });

        requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-10');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    static setButtonLoading(btnId, isLoading, originalText) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('opacity-80', 'cursor-not-allowed');
            // Mantém as dimensões
            btn.innerHTML = `<div class="loader-sm border-white border-t-transparent border-2 rounded-full w-5 h-5 animate-spin mx-auto"></div>`;
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            btn.innerHTML = originalText;
            lucide.createIcons({ root: btn });
        }
    }

    static openModal(id) {
        const modal = document.getElementById(id);
        const content = document.getElementById(`${id}-content`);
        if(!modal || !content) return;
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'translate-y-4');
        content.classList.add('scale-100', 'translate-y-0');
        document.body.style.overflow = 'hidden'; 
    }

    static closeModal(id) {
        const modal = document.getElementById(id);
        const content = document.getElementById(`${id}-content`);
        if(!modal || !content) return;
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100', 'translate-y-0');
        content.classList.add('scale-95', 'translate-y-4');
        setTimeout(() => { modal.classList.add('hidden'); document.body.style.overflow = ''; }, 300);
    }

    static renderPriorityBadge(prioridade) {
        const prioridadeSafe = this.escapeHTML(prioridade).toUpperCase();
        const map = {
            'ALTA': 'bg-red-50 text-red-700 border-red-200 ring-red-100',
            'MEDIA': 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-100',
            'BAIXA': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100'
        };
        const classes = map[prioridadeSafe] || 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-100';
        return `<span class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold tracking-wider border ring-2 ring-offset-1 ${classes}">${prioridadeSafe}</span>`;
    }

    static renderStatusBadge(status) {
        const statusStr = (status || 'criado').toLowerCase();
        let config = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400', label: 'Criado' };
        
        if (statusStr === 'em_andamento') config = { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500 animate-pulse', label: 'Em Andamento' };
        else if (statusStr === 'concluido') config = { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Concluído' };

        return `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} shadow-sm">
                <div class="w-1.5 h-1.5 rounded-full ${config.dot}"></div>
                ${config.label}
            </div>
        `;
    }

    static renderAnexoCard(anexo) {
        return `
            <a href="${this.escapeHTML(anexo.url)}" target="_blank" class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-brand-500 hover:shadow-md transition-all group bg-white shadow-sm">
                <div class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 transition-colors">
                    <i data-lucide="file-text" class="w-5 h-5"></i>
                </div>
                <div class="flex-grow min-w-0">
                    <p class="text-sm font-semibold text-slate-700 truncate group-hover:text-brand-700">${this.escapeHTML(anexo.title)}</p>
                    <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Visualizar Anexo</p>
                </div>
            </a>
        `;
    }
}