// Admin Panel JavaScript
class SignalAdmin {
    constructor() {
        this.baseURL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://trolleygames-server.onrender.com';
        this.signals = [];
        this.filteredSignals = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.sortField = null;
        this.sortDirection = 'asc';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSignals();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('addSignalBtn').addEventListener('click', () => this.openAddModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelImportBtn').addEventListener('click', () => this.closeImportModal());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.querySelectorAll('.modal .close')[1].addEventListener('click', () => this.closeImportModal());
        
        // Form submission
        document.getElementById('signalForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Filters
        document.getElementById('filterBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFiltersBtn').addEventListener('click', () => this.clearFilters());
        
        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => this.openImportModal());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportSignals());
        document.getElementById('executeImportBtn').addEventListener('click', () => this.executeImport());
        
        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));
        
        // Sorting
        this.setupSortingListeners();
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
                this.closeImportModal();
            }
        });
    }

    async loadSignals() {
        try {
            this.showLoading();
            const response = await fetch(`${this.baseURL}/api/signals`);
            const data = await response.json();
            
            if (response.ok) {
                this.signals = data.signals || [];
                this.filteredSignals = [...this.signals];
                this.updateStats();
                this.renderTable();
                this.updatePagination();
            } else {
                this.showError(data.error || 'Failed to load signals');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    showLoading() {
        document.getElementById('signalsTableBody').innerHTML = '<tr><td colspan="10" class="loading">Loading signals...</td></tr>';
    }

    showError(message) {
        document.getElementById('signalsTableBody').innerHTML = `<tr><td colspan="10" class="error">Error: ${message}</td></tr>`;
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        document.querySelector('.admin-container').insertBefore(successDiv, document.querySelector('.controls'));
        setTimeout(() => successDiv.remove(), 3000);
    }

    updateStats() {
        const total = this.signals.length;
        const correct = this.signals.filter(s => s.correct).length;
        const incorrect = total - correct;
        
        document.getElementById('totalCount').textContent = total;
        document.getElementById('correctCount').textContent = correct;
        document.getElementById('incorrectCount').textContent = incorrect;
    }

    renderTable() {
        const tbody = document.getElementById('signalsTableBody');
        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;
        const pageSignals = this.filteredSignals.slice(startIdx, endIdx);
        
        if (pageSignals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #666;">No signals found</td></tr>';
            return;
        }
        
        tbody.innerHTML = pageSignals.map(signal => `
            <tr>
                <td>${signal.id}</td>
                <td>${signal.prefix || ''}</td>
                <td><strong>${signal.number}</strong></td>
                <td>${signal.suffix || ''}</td>
                <td><span class="${signal.correct ? 'correct-signal' : 'incorrect-signal'}">${signal.correct ? '✓ Correct' : '✗ Incorrect'}</span></td>
                <td>${signal.location || ''}</td>
                <td class="hitbox-info" title="X: ${signal.hitbox_x}, Y: ${signal.hitbox_y}, W: ${signal.hitbox_width}, H: ${signal.hitbox_height}">
                    ${signal.hitbox_width}×${signal.hitbox_height}
                </td>
                <td>${signal.line}</td>
                <td>${signal.page || ''}</td>
                <td>
                    <button class="btn btn-edit" onclick="signalAdmin.editSignal(${signal.id})">Edit</button>
                    <button class="btn btn-danger" onclick="signalAdmin.deleteSignal(${signal.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredSignals.length / this.pageSize);
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.currentPage >= totalPages;
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredSignals.length / this.pageSize);
        const newPage = this.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTable();
            this.updatePagination();
        }
    }

    applyFilters() {
        const lineFilter = document.getElementById('lineFilter').value;
        const pageFilter = document.getElementById('pageFilter').value.toLowerCase();
        
        this.filteredSignals = this.signals.filter(signal => {
            const matchesLine = !lineFilter || signal.line === lineFilter;
            const matchesPage = !pageFilter || (signal.page && signal.page.toLowerCase().includes(pageFilter));
            return matchesLine && matchesPage;
        });
        
        // Re-apply current sorting
        if (this.sortField) {
            this.sortBy(this.sortField);
        } else {
            this.currentPage = 1;
            this.renderTable();
            this.updatePagination();
        }
    }

    clearFilters() {
        document.getElementById('lineFilter').value = '';
        document.getElementById('pageFilter').value = '';
        this.filteredSignals = [...this.signals];
        
        // Re-apply current sorting
        if (this.sortField) {
            this.sortBy(this.sortField);
        } else {
            this.currentPage = 1;
            this.renderTable();
            this.updatePagination();
        }
    }

    openAddModal() {
        document.getElementById('modalTitle').textContent = 'Add New Signal';
        document.getElementById('signalForm').reset();
        document.getElementById('signalId').value = '';
        document.getElementById('signalModal').style.display = 'block';
    }

    openEditModal(signal) {
        document.getElementById('modalTitle').textContent = 'Edit Signal';
        document.getElementById('signalId').value = signal.id;
        document.getElementById('prefix').value = signal.prefix || '';
        document.getElementById('number').value = signal.number;
        document.getElementById('suffix').value = signal.suffix || '';
        document.getElementById('correct').checked = signal.correct;
        document.getElementById('location').value = signal.location || '';
        document.getElementById('hitbox_x').value = signal.hitbox_x || 0;
        document.getElementById('hitbox_y').value = signal.hitbox_y || 0;
        document.getElementById('hitbox_width').value = signal.hitbox_width || 0;
        document.getElementById('hitbox_height').value = signal.hitbox_height || 0;
        document.getElementById('line').value = signal.line;
        document.getElementById('page').value = signal.page || '';
        document.getElementById('signalModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('signalModal').style.display = 'none';
    }

    openImportModal() {
        document.getElementById('importModal').style.display = 'block';
    }

    closeImportModal() {
        document.getElementById('importModal').style.display = 'none';
    }

    async editSignal(id) {
        const signal = this.signals.find(s => s.id === id);
        if (signal) {
            this.openEditModal(signal);
        }
    }

    async deleteSignal(id) {
        if (!confirm('Are you sure you want to delete this signal?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/signals/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess('Signal deleted successfully');
                this.loadSignals();
            } else {
                this.showError(data.error || 'Failed to delete signal');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const signalData = {
            prefix: formData.get('prefix'),
            number: formData.get('number'),
            suffix: formData.get('suffix'),
            correct: formData.get('correct') === 'on',
            location: formData.get('location'),
            hitbox_x: parseInt(formData.get('hitbox_x')) || 0,
            hitbox_y: parseInt(formData.get('hitbox_y')) || 0,
            hitbox_width: parseInt(formData.get('hitbox_width')) || 0,
            hitbox_height: parseInt(formData.get('hitbox_height')) || 0,
            line: formData.get('line'),
            page: formData.get('page')
        };

        const signalId = document.getElementById('signalId').value;
        const isEdit = signalId !== '';

        try {
            const url = isEdit ? `${this.baseURL}/api/signals/${signalId}` : `${this.baseURL}/api/signals`;
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signalData)
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Signal ${isEdit ? 'updated' : 'created'} successfully`);
                this.closeModal();
                this.loadSignals();
            } else {
                this.showError(data.error || `Failed to ${isEdit ? 'update' : 'create'} signal`);
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    async executeImport() {
        const importData = document.getElementById('importData').value.trim();
        const markAsCorrect = document.getElementById('markAsCorrect').checked;
        const clearExisting = document.getElementById('clearExisting').checked;
        
        if (!importData) {
            this.showError('Please provide JSON data to import');
            return;
        }

        try {
            const jsonData = JSON.parse(importData);
            
            if (clearExisting) {
                if (!confirm('This will delete ALL existing signals. Are you sure?')) {
                    return;
                }
                // Delete all signals first
                for (const signal of this.signals) {
                    await fetch(`${this.baseURL}/api/signals/${signal.id}`, { method: 'DELETE' });
                }
            }

            let importCount = 0;
            for (const [line, signals] of Object.entries(jsonData)) {
                for (const signalNumber of signals) {
                    // Parse signal number to extract prefix, number, suffix
                    const match = signalNumber.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
                    let prefix = '', number = signalNumber, suffix = '';
                    
                    if (match) {
                        prefix = match[1] || '';
                        number = match[2];
                        suffix = match[3] || '';
                    }

                    const signalData = {
                        prefix,
                        number,
                        suffix,
                        correct: markAsCorrect,
                        location: '',
                        hitbox_x: 0,
                        hitbox_y: 0,
                        hitbox_width: 0,
                        hitbox_height: 0,
                        line,
                        page: ''
                    };

                    const response = await fetch(`${this.baseURL}/api/signals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(signalData)
                    });

                    if (response.ok) {
                        importCount++;
                    }
                }
            }

            this.showSuccess(`Successfully imported ${importCount} signals`);
            this.closeImportModal();
            this.loadSignals();

        } catch (error) {
            this.showError('Invalid JSON data: ' + error.message);
        }
    }

    async exportSignals() {
        try {
            const response = await fetch(`${this.baseURL}/api/signals/export/correctSignals`);
            const data = await response.json();
            
            if (response.ok) {
                const exportData = {
                    correctSignals: data.correctSignals,
                    exportDate: new Date().toISOString(),
                    totalSignals: this.signals.length
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `signals-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showSuccess('Signals exported successfully');
            } else {
                this.showError(data.error || 'Failed to export signals');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    setupSortingListeners() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.field;
                this.sortBy(field);
            });
        });
    }

    sortBy(field) {
        // If clicking the same field, toggle direction
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        // Update visual indicators
        this.updateSortIndicators();

        // Sort the filtered signals
        this.filteredSignals.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // Handle different data types
            if (field === 'id' || field === 'hitbox_x' || field === 'hitbox_y' || 
                field === 'hitbox_width' || field === 'hitbox_height') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            } else if (field === 'correct') {
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            } else if (field === 'number') {
                // Sort numbers numerically if they're numeric, otherwise alphabetically
                const aNum = parseInt(aVal);
                const bNum = parseInt(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    aVal = aNum;
                    bVal = bNum;
                } else {
                    aVal = (aVal || '').toString().toLowerCase();
                    bVal = (bVal || '').toString().toLowerCase();
                }
            } else {
                // String comparison (case-insensitive)
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Reset to first page and refresh table
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    updateSortIndicators() {
        // Remove all existing sort indicators
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add indicator to current sort field
        if (this.sortField) {
            const currentHeader = document.querySelector(`[data-field="${this.sortField}"]`);
            if (currentHeader) {
                currentHeader.classList.add(`sort-${this.sortDirection}`);
            }
        }
    }
}

// Initialize the admin panel when the page loads
let signalAdmin;
document.addEventListener('DOMContentLoaded', () => {
    signalAdmin = new SignalAdmin();
});
