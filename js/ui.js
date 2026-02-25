export class UI {
    // Sanitização para prevenir XSS attacks em conteúdos vindos da API
    static escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    static showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        const icon = type === 'success' ? 'check-circle' : 'alert-circle';
        
        toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0`;
        toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i> <span class="text-sm font-medium">${this.escapeHTML(message)}</span>`;
        
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
            btn.innerHTML = `<div class="loader"></div>`;
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            // Safe injection - originalText é fixo no source, não manipulável.
            btn.innerHTML = originalText;
            lucide.createIcons({ root: btn });
        }
    }

    static openModal(id) {
        const modal = document.getElementById(id);
        const content = document.getElementById(`${id}-content`);
        if(!modal || !content) return;

        modal.classList.remove('hidden');
        void modal.offsetWidth; // Force Browser Reflow
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }

    static closeModal(id) {
        const modal = document.getElementById(id);
        const content = document.getElementById(`${id}-content`);
        if(!modal || !content) return;

        modal.classList.add('opacity-0');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    static renderPriorityBadge(prioridade) {
        const prioridadeSafe = this.escapeHTML(prioridade);
        const map = {
            'ALTA': 'bg-red-100 text-red-700 border-red-200',
            'MEDIA': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'BAIXA': 'bg-green-100 text-green-700 border-green-200'
        };
        const classes = map[prioridadeSafe] || 'bg-gray-100 text-gray-700 border-gray-200';
        return `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes}">${prioridadeSafe}</span>`;
    }
}