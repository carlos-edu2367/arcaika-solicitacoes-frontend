export class UI {
    static escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }

    static showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-gray-900' : 'bg-red-600';
        const icon = type === 'success' ? 'check-circle' : 'alert-octagon';
        
        toast.className = `${bgColor} text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0 border border-white/10`;
        toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 ${type === 'success' ? 'text-green-400' : 'text-white'}"></i> <span class="text-sm font-medium tracking-wide">${this.escapeHTML(message)}</span>`;
        
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
            btn.innerHTML = `<div class="loader-sm border-white border-t-transparent border-2 rounded-full w-4 h-4 animate-spin"></div>`;
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
        document.body.style.overflow = 'hidden'; // Previne scroll do body
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
        const classes = map[prioridadeSafe] || 'bg-gray-50 text-gray-700 border-gray-200 ring-gray-100';
        return `<span class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold tracking-wider border ring-2 ring-offset-1 ${classes}">${prioridadeSafe}</span>`;
    }

    // Novo Renderizador de Status
    static renderStatusBadge(status) {
        const statusStr = (status || 'criado').toLowerCase();
        let config = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400', label: 'Criado' };
        
        if (statusStr === 'em_andamento') config = { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500 animate-pulse', label: 'Em Andamento' };
        else if (statusStr === 'concluido') config = { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', label: 'Concluído' };

        return `
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}">
                <div class="w-1.5 h-1.5 rounded-full ${config.dot}"></div>
                ${config.label}
            </div>
        `;
    }
}