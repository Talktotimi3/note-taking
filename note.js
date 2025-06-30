// Enhanced Note Taking & Making System JavaScript with View Modal

class NoteTakingSystem {
    constructor() {
        // Initialize with empty array if localStorage is empty or invalid
        try {
            this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        } catch (error) {
            console.warn('Error loading notes from localStorage:', error);
            this.notes = [];
        }
        
        this.currentEditingId = null;
        this.isListening = false;
        this.recognition = null;
        this.autoSaveTimer = null;
        this.viewModal = null;
        
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        try {
            this.createViewModal();
            this.setupEventListeners();
            this.setupSpeechRecognition();
            this.renderNotes();
            this.updateStats();
            this.setupAutoSave();
            this.loadDraft();
        } catch (error) {
            console.error('Error initializing Note Taking System:', error);
        }
    }

    createViewModal() {
        // Create modal HTML structure
        const modalHTML = `
            <div id="note-view-modal" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2 id="modal-note-title"></h2>
                        <div class="modal-actions">
                            <button id="modal-edit-btn" class="modal-btn edit-btn" title="Edit Note">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button id="modal-delete-btn" class="modal-btn delete-btn" title="Delete Note">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                            <button id="modal-close-btn" class="modal-btn close-btn" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-meta">
                        <span class="modal-category" id="modal-note-category"></span>
                        <span class="modal-dates">
                            <span id="modal-created-date"></span>
                            <span id="modal-modified-date"></span>
                        </span>
                    </div>
                    <div class="modal-content">
                        <div id="modal-note-content" class="note-content-full"></div>
                    </div>
                    <div id="modal-note-tags" class="modal-tags"></div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add modal styles
        const modalStyles = `
            <style>
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(3px);
                }

                .modal-container {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    animation: modalSlideIn 0.3s ease-out;
                }

                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .modal-header {
                    padding: 24px 24px 16px;
                    border-bottom: 1px solid #e5e5e5;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #1f2937;
                    line-height: 1.4;
                    flex: 1;
                    word-break: break-word;
                }

                .modal-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .modal-btn {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    background: white;
                    color: #374151;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s;
                }

                .modal-btn:hover {
                    background: #f9fafb;
                    transform: translateY(-1px);
                }

                .modal-btn.edit-btn:hover {
                    border-color: #3b82f6;
                    color: #3b82f6;
                }

                .modal-btn.delete-btn:hover {
                    border-color: #ef4444;
                    color: #ef4444;
                }

                .modal-btn.close-btn:hover {
                    border-color: #6b7280;
                    color: #6b7280;
                }

                .modal-meta {
                    padding: 0 24px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                }

                .modal-category {
                    background: #3b82f6;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .modal-dates {
                    font-size: 0.875rem;
                    color: #6b7280;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 2px;
                }

                .modal-content {
                    padding: 24px;
                }

                .note-content-full {
                    font-size: 1rem;
                    line-height: 1.6;
                    color: #374151;
                    white-space: pre-wrap;
                    word-break: break-word;
                }

                .modal-tags {
                    padding: 0 24px 24px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .modal-tags .tag {
                    background: #f3f4f6;
                    color: #374151;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    border: 1px solid #e5e7eb;
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .modal-container {
                        background: #1f2937;
                        color: #f9fafb;
                    }

                    .modal-header {
                        border-bottom-color: #374151;
                    }

                    .modal-header h2 {
                        color: #f9fafb;
                    }

                    .modal-btn {
                        background: #374151;
                        border-color: #4b5563;
                        color: #d1d5db;
                    }

                    .modal-btn:hover {
                        background: #4b5563;
                    }

                    .note-content-full {
                        color: #d1d5db;
                    }

                    .modal-tags .tag {
                        background: #374151;
                        color: #d1d5db;
                        border-color: #4b5563;
                    }
                }

                /* Mobile responsiveness */
                @media (max-width: 768px) {
                    .modal-container {
                        width: 95%;
                        margin: 10px;
                    }

                    .modal-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }

                    .modal-actions {
                        justify-content: flex-end;
                    }

                    .modal-meta {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                    }

                    .modal-dates {
                        align-items: flex-start;
                    }
                }
            </style>
        `;

        // Add styles to head
        document.head.insertAdjacentHTML('beforeend', modalStyles);

        // Get modal element reference
        this.viewModal = document.getElementById('note-view-modal');

        // Setup modal event listeners
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const modal = this.viewModal;
        const closeBtn = document.getElementById('modal-close-btn');
        const editBtn = document.getElementById('modal-edit-btn');
        const deleteBtn = document.getElementById('modal-delete-btn');

        // Close modal when clicking close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeViewModal());
        }

        // Close modal when clicking overlay
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeViewModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
                this.closeViewModal();
            }
        });

        // Edit button functionality
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                const noteId = parseInt(modal.dataset.noteId);
                this.closeViewModal();
                this.editNote(noteId);
            });
        }

        // Delete button functionality
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const noteId = parseInt(modal.dataset.noteId);
                this.closeViewModal();
                this.deleteNote(noteId);
            });
        }
    }

    openViewModal(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note || !this.viewModal) return;

        // Store note ID in modal for actions
        this.viewModal.dataset.noteId = noteId;

        // Populate modal content
        const titleEl = document.getElementById('modal-note-title');
        const categoryEl = document.getElementById('modal-note-category');
        const contentEl = document.getElementById('modal-note-content');
        const tagsEl = document.getElementById('modal-note-tags');
        const createdEl = document.getElementById('modal-created-date');
        const modifiedEl = document.getElementById('modal-modified-date');

        if (titleEl) titleEl.textContent = note.title;
        if (categoryEl) categoryEl.textContent = note.category;
        if (contentEl) contentEl.textContent = note.content;
        
        if (createdEl) {
            const createdDate = new Date(note.created);
            createdEl.textContent = `Created: ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}`;
        }
        
        if (modifiedEl) {
            const modifiedDate = new Date(note.modified);
            modifiedEl.textContent = `Modified: ${modifiedDate.toLocaleDateString()} ${modifiedDate.toLocaleTimeString()}`;
        }

        // Handle tags
        if (tagsEl) {
            if (note.tags && note.tags.length > 0) {
                tagsEl.innerHTML = note.tags.map(tag => 
                    `<span class="tag">#${this.escapeHtml(tag)}</span>`
                ).join('');
            } else {
                tagsEl.innerHTML = '';
            }
        }

        // Show modal
        this.viewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeViewModal() {
        if (this.viewModal) {
            this.viewModal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    setupEventListeners() {
        // Mode toggle - with null checks
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                if (mode) this.switchMode(mode);
            });
        });

        // Form submission
        const noteForm = document.getElementById('note-form');
        if (noteForm) {
            noteForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        // Quick save - with debug logging
        const quickSaveBtn = document.getElementById('quick-save-btn');
        if (quickSaveBtn) {
            console.log('Quick save button found, adding event listener');
            quickSaveBtn.addEventListener('click', (e) => {
                console.log('Quick save button clicked');
                e.preventDefault();
                this.quickSave();
            });
        } else {
            console.error('Quick save button not found with ID: quick-save-btn');
        }

        // Search and filter
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
        }
        
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.filterByCategory(e.target.value));
        }
        
        const sortOptions = document.getElementById('sort-options');
        if (sortOptions) {
            sortOptions.addEventListener('change', (e) => this.sortNotes(e.target.value));
        }
        
        // View toggle
        const gridViewBtn = document.getElementById('grid-view');
        const listViewBtn = document.getElementById('list-view');
        if (gridViewBtn) gridViewBtn.addEventListener('click', () => this.setView('grid'));
        if (listViewBtn) listViewBtn.addEventListener('click', () => this.setView('list'));
        
        // Voice controls
        const voiceToTextBtn = document.getElementById('voice-to-text');
        const toggleListeningBtn = document.getElementById('toggle-listening');
        if (voiceToTextBtn) voiceToTextBtn.addEventListener('click', () => this.startVoiceRecording());
        if (toggleListeningBtn) toggleListeningBtn.addEventListener('click', () => this.toggleContinuousListening());
        
        // Template selection
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const templateType = e.target.closest('.template-card')?.dataset.template;
                if (templateType) this.useTemplate(templateType);
            });
        });
        
        // Export/Import
        const exportBtn = document.getElementById('export-notes');
        const importBtn = document.getElementById('import-notes');
        const importFile = document.getElementById('import-file');
        
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportNotes());
        if (importBtn) importBtn.addEventListener('click', () => importFile?.click());
        if (importFile) importFile.addEventListener('change', (e) => this.importNotes(e.target.files[0]));
        
        // Cancel edit
        const cancelEditBtn = document.getElementById('cancel-edit');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.cancelEdit());
        }
        
        // Debug: Log all found elements
        console.log('Event listeners setup complete. Elements found:');
        console.log('- Quick save button:', !!quickSaveBtn);
        console.log('- Quick capture input:', !!document.getElementById('quick-capture-input'));
        console.log('- Auto save status:', !!document.getElementById('auto-save-status'));
    }

    switchMode(mode) {
        // Update active button
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Show/hide sections based on mode
        const noteTakingSection = document.getElementById('note-taking-section');
        const templatesSection = document.getElementById('templates-section');
        const noteForm = document.getElementById('note-form');
        
        if (mode === 'taking') {
            if (noteTakingSection) noteTakingSection.classList.remove('hidden');
            if (templatesSection) templatesSection.classList.remove('hidden');
            if (noteForm) noteForm.classList.add('hidden');
        } else {
            if (noteTakingSection) noteTakingSection.classList.add('hidden');
            if (templatesSection) templatesSection.classList.add('hidden');
            if (noteForm) noteForm.classList.remove('hidden');
        }
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    const textarea = document.getElementById('quick-capture-input');
                    if (textarea) {
                        textarea.value += finalTranscript + ' ';
                        this.triggerAutoSave();
                    }
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                const voiceBtn = document.getElementById('voice-to-text');
                const toggleBtn = document.getElementById('toggle-listening');
                if (voiceBtn) voiceBtn.classList.remove('recording');
                if (toggleBtn) toggleBtn.classList.remove('recording');
            };
        }
    }

    startVoiceRecording() {
        if (this.recognition) {
            try {
                this.recognition.start();
                const voiceBtn = document.getElementById('voice-to-text');
                if (voiceBtn) voiceBtn.classList.add('recording');
                
                setTimeout(() => {
                    if (this.recognition) {
                        this.recognition.stop();
                        if (voiceBtn) voiceBtn.classList.remove('recording');
                    }
                }, 5000);
            } catch (error) {
                console.error('Error starting voice recognition:', error);
            }
        }
    }

    toggleContinuousListening() {
        if (this.recognition) {
            const toggleBtn = document.getElementById('toggle-listening');
            try {
                if (this.isListening) {
                    this.recognition.stop();
                    this.isListening = false;
                    if (toggleBtn) toggleBtn.classList.remove('recording');
                } else {
                    this.recognition.start();
                    this.isListening = true;
                    if (toggleBtn) toggleBtn.classList.add('recording');
                }
            } catch (error) {
                console.error('Error toggling continuous listening:', error);
                this.isListening = false;
                if (toggleBtn) toggleBtn.classList.remove('recording');
            }
        }
    }

    setupAutoSave() {
        const textarea = document.getElementById('quick-capture-input');
        if (!textarea) {
            console.error('Quick capture input not found - auto-save setup failed');
            return;
        }
        
        console.log('Setting up auto-save for quick capture');
        textarea.addEventListener('input', (e) => {
            console.log('Input detected in quick capture:', e.target.value.length, 'characters');
            this.triggerAutoSave();
        });
        
        // Also add keyup event for better responsiveness
        textarea.addEventListener('keyup', () => this.triggerAutoSave());
    }

    triggerAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            const textarea = document.getElementById('quick-capture-input');
            const statusEl = document.getElementById('auto-save-status');
            
            if (textarea) {
                const content = textarea.value;
                console.log('Auto-save triggered with content length:', content.length);
                
                if (content.trim()) {
                    try {
                        localStorage.setItem('quick-capture-draft', content);
                        console.log('Draft auto-saved to localStorage');
                        
                        if (statusEl) {
                            statusEl.textContent = 'Auto-saved';
                            statusEl.style.color = '#007bff';
                            setTimeout(() => {
                                statusEl.textContent = 'Auto-save enabled';
                                statusEl.style.color = '';
                            }, 2000);
                        }
                    } catch (error) {
                        console.error('Error auto-saving:', error);
                        if (statusEl) {
                            statusEl.textContent = 'Auto-save failed';
                            statusEl.style.color = '#dc3545';
                        }
                    }
                } else {
                    console.log('No content to auto-save');
                }
            } else {
                console.error('Quick capture textarea not found during auto-save');
            }
        }, 1000);
    }

    loadDraft() {
        try {
            const draft = localStorage.getItem('quick-capture-draft');
            const textarea = document.getElementById('quick-capture-input');
            if (draft && textarea) {
                textarea.value = draft;
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }

    quickSave() {
        const textarea = document.getElementById('quick-capture-input');
        if (!textarea) {
            console.error('Quick capture input element not found');
            return;
        }
        
        const content = textarea.value.trim();
        if (!content) {
            console.warn('No content to save in quick capture');
            return;
        }
        
        const note = {
            id: Date.now(),
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            content: content,
            category: 'Quick Note',
            tags: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        this.updateStats();
        
        // Clear the textarea
        textarea.value = '';
        
        // Show success feedback
        const statusEl = document.getElementById('auto-save-status');
        if (statusEl) {
            statusEl.textContent = 'Note saved successfully!';
            statusEl.style.color = '#28a745';
            setTimeout(() => {
                statusEl.textContent = 'Auto-save enabled';
                statusEl.style.color = '';
            }, 3000);
        }
        
        try {
            localStorage.removeItem('quick-capture-draft');
        } catch (error) {
            console.error('Error removing draft:', error);
        }
        
        console.log('Quick note saved:', note);
    }

    useTemplate(templateType) {
        const templates = {
            meeting: {
                title: 'Meeting Notes - ' + new Date().toLocaleDateString(),
                content: `Meeting: [Meeting Title]
Date: ${new Date().toLocaleDateString()}
Attendees: 
- 

Agenda:
1. 
2. 
3. 

Discussion:


Action Items:
- [ ] 
- [ ] 

Next Steps:
`,
                category: 'Meeting'
            },
            daily: {
                title: 'Daily Journal - ' + new Date().toLocaleDateString(),
                content: `Date: ${new Date().toLocaleDateString()}

Today's Goals:
- 
- 
- 

What I Accomplished:
- 
- 
- 

Challenges Faced:


Lessons Learned:


Tomorrow's Priorities:
- 
- 
- 

Gratitude:
- 
- 
- `,
                category: 'Personal'
            },
            project: {
                title: 'Project Plan - [Project Name]',
                content: `Project: [Project Name]
Start Date: ${new Date().toLocaleDateString()}

Objectives:
- 
- 
- 

Scope:


Deliverables:
1. 
2. 
3. 

Timeline:
- Week 1: 
- Week 2: 
- Week 3: 

Resources Needed:
- 
- 
- 

Risks & Mitigation:
- Risk: 
  Mitigation: 

Success Criteria:
- 
- 
- `,
                category: 'Project'
            },
            lecture: {
                title: 'Lecture Notes - [Subject]',
                content: `Subject: [Subject Name]
Date: ${new Date().toLocaleDateString()}
Instructor: 

Key Topics:
1. 
2. 
3. 

Main Concepts:


Important Points:
- 
- 
- 

Examples:


Questions:
- 
- 

Summary:


Follow-up Tasks:
- [ ] 
- [ ] `,
                category: 'School'
            }
        };

        const template = templates[templateType];
        if (template) {
            const titleInput = document.getElementById('note-title');
            const contentInput = document.getElementById('note-content');
            const categoryInput = document.getElementById('note-category');
            
            if (titleInput) titleInput.value = template.title;
            if (contentInput) contentInput.value = template.content;
            if (categoryInput) categoryInput.value = template.category;
            
            // Switch to making mode
            this.switchMode('making');
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('note-title');
        const contentInput = document.getElementById('note-content');
        const categoryInput = document.getElementById('note-category');
        const tagsInput = document.getElementById('note-tags');
        
        if (!titleInput || !contentInput || !categoryInput) {
            console.error('Required form elements not found');
            return;
        }
        
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const category = categoryInput.value;
        const tags = tagsInput?.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag) || [];

        if (title && content && category) {
            const note = {
                id: this.currentEditingId || Date.now(),
                title: title,
                content: content,
                category: category,
                tags: tags,
                created: this.currentEditingId ? 
                    this.notes.find(n => n.id === this.currentEditingId)?.created || new Date().toISOString() : 
                    new Date().toISOString(),
                modified: new Date().toISOString()
            };

            if (this.currentEditingId) {
                const index = this.notes.findIndex(n => n.id === this.currentEditingId);
                if (index !== -1) {
                    this.notes[index] = note;
                }
                this.currentEditingId = null;
            } else {
                this.notes.unshift(note);
            }

            this.saveNotes();
            this.renderNotes();
            this.updateStats();
            this.resetForm();
        }
    }

    editNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            this.currentEditingId = id;
            
            const titleInput = document.getElementById('note-title');
            const contentInput = document.getElementById('note-content');
            const categoryInput = document.getElementById('note-category');
            const tagsInput = document.getElementById('note-tags');
            const formTitle = document.getElementById('form-title');
            const submitBtn = document.getElementById('submit-btn');
            const cancelBtn = document.getElementById('cancel-edit');
            
            if (titleInput) titleInput.value = note.title;
            if (contentInput) contentInput.value = note.content;
            if (categoryInput) categoryInput.value = note.category;
            if (tagsInput) tagsInput.value = note.tags.join(', ');
            
            if (formTitle) formTitle.textContent = 'Edit Note';
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Note';
            if (cancelBtn) cancelBtn.style.display = 'flex';
            
            this.switchMode('making');
        }
    }

    deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(n => n.id !== id);
            this.saveNotes();
            this.renderNotes();
            this.updateStats();
        }
    }

    cancelEdit() {
        this.currentEditingId = null;
        this.resetForm();
    }

    resetForm() {
        const noteForm = document.getElementById('note-form');
        const formTitle = document.getElementById('form-title');
        const submitBtn = document.getElementById('submit-btn');
        const cancelBtn = document.getElementById('cancel-edit');
        
        if (noteForm) noteForm.reset();
        if (formTitle) formTitle.textContent = 'Create New Note';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Note';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    searchNotes(query) {
        const filtered = this.notes.filter(note => 
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderFilteredNotes(filtered);
    }

    filterByCategory(category) {
        const filtered = category ? 
            this.notes.filter(note => note.category === category) : 
            this.notes;
        this.renderFilteredNotes(filtered);
    }

    sortNotes(sortBy) {
        let sorted = [...this.notes];
        
        switch(sortBy) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.created) - new Date(a.created));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.created) - new Date(b.created));
                break;
            case 'title':
                sorted.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'category':
                sorted.sort((a, b) => a.category.localeCompare(b.category));
                break;
        }
        
        this.renderFilteredNotes(sorted);
    }

    setView(viewType) {
        const container = document.getElementById('notes-container');
        const gridBtn = document.getElementById('grid-view');
        const listBtn = document.getElementById('list-view');
        
        if (container && gridBtn && listBtn) {
            if (viewType === 'grid') {
                container.className = 'notes-container grid-view';
                gridBtn.classList.add('active');
                listBtn.classList.remove('active');
            } else {
                container.className = 'notes-container list-view';
                listBtn.classList.add('active');
                gridBtn.classList.remove('active');
            }
        }
    }

    renderNotes() {
        this.renderFilteredNotes(this.notes);
    }

    renderFilteredNotes(notes) {
        const container = document.getElementById('notes-container');
        const displayedCount = document.getElementById('displayed-count');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (displayedCount) {
            displayedCount.textContent = notes.length;
        }
        
        notes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            container.appendChild(noteElement);
        });
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-card';
        
        const safeTitle = this.escapeHtml(note.title);
        const safeContent = this.escapeHtml(note.content);
        const safeCategory = this.escapeHtml(note.category);
        
        noteDiv.innerHTML = `
            <div class="note-header">
                <h3 class="note-title">${safeTitle}</h3>
                <div class="note-actions">
                    <button class="action-btn edit-btn" data-id="${note.id}" title="Edit Note">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${note.id}" title="Delete Note">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="note-meta">
                <span class="note-category">${safeCategory}</span>
                <span class="note-date">${new Date(note.created).toLocaleDateString()}</span>
            </div>
            
            <div class="note-content">
                ${safeContent.length > 200 ? 
                    safeContent.substring(0, 200) + '...' : 
                    safeContent}
            </div>
            
            ${note.tags.length > 0 ? `
                <div class="note-tags">
                    ${note.tags.map(tag => `<span class="tag">#${this.escapeHtml(tag)}</span>`).join(' ')}
                </div>
            ` : ''}
        `;
        
        // Add click event to open view modal when clicking on the note card
        noteDiv.addEventListener('click', (e) => {
            // Don't open modal if clicking on action buttons
            if (!e.target.closest('.note-actions')) {
                this.openViewModal(note.id);
            }
        });

        // Add hover effect
        noteDiv.style.cursor = 'pointer';
        
        // Add event listeners for edit and delete buttons
        const editBtn = noteDiv.querySelector('.edit-btn');
        const deleteBtn = noteDiv.querySelector('.delete-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent modal from opening
                this.editNote(note.id);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent modal from opening
                this.deleteNote(note.id);
            });
        }
        
        return noteDiv;
    }

    updateStats() {
        const totalNotesEl = document.getElementById('total-notes');
        const totalCategoriesEl = document.getElementById('total-categories');
        const totalTagsEl = document.getElementById('total-tags');
        const notesTodayEl = document.getElementById('notes-today');
        
        if (totalNotesEl) totalNotesEl.textContent = this.notes.length;
        
        const categories = [...new Set(this.notes.map(note => note.category))];
        if (totalCategoriesEl) totalCategoriesEl.textContent = categories.length;
        
        const allTags = this.notes.flatMap(note => note.tags);
        const uniqueTags = [...new Set(allTags)];
        if (totalTagsEl) totalTagsEl.textContent = uniqueTags.length;
        
        const today = new Date().toDateString();
        const notesToday = this.notes.filter(note => 
            new Date(note.created).toDateString() === today
        ).length;
        if (notesTodayEl) notesTodayEl.textContent = notesToday;
    }

    saveNotes() {
        try {
            localStorage.setItem('notes', JSON.stringify(this.notes));
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Error saving notes. Your storage might be full.');
        }
    }

    exportNotes() {
        try {
            const dataStr = JSON.stringify(this.notes, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `notes-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting notes:', error);
            alert('Error exporting notes.');
        }
    }

    importNotes(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedNotes = JSON.parse(e.target.result);
                    if (Array.isArray(importedNotes)) {
                        // Validate imported notes structure
                        const validNotes = importedNotes.filter(note => 
                            note && typeof note === 'object' && 
                            note.title && note.content && note.category
                        );
                        
                        this.notes = [...this.notes, ...validNotes];
                        this.saveNotes();
                        this.renderNotes();
                        this.updateStats();
                        alert(`${validNotes.length} notes imported successfully!`);
                    } else {
                        alert('Invalid file format. Expected an array of notes.');
                    }
                } catch (error) {
                    console.error('Error importing notes:', error);
                    alert('Error reading file. Please ensure it\'s a valid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.noteTakingSystem = new NoteTakingSystem();
});

// Alternative initialization if DOM is already loaded
if (document.readyState !== 'loading') {
    window.noteTakingSystem = new NoteTakingSystem();
}
