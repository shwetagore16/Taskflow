// Advanced TaskFlow Application - Enhanced Version
class TodoApp {
    constructor() {
        // Core data
        this.tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
        this.settings = JSON.parse(localStorage.getItem('todoSettings')) || {
            theme: 'light',
            autoSave: true,
            notifications: true,
            soundEffects: false,
            viewMode: 'list'
        };
        
        // State management
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentSort = 'newest';
        this.searchQuery = '';
        this.isLoading = false;
        this.undoStack = [];
        this.redoStack = [];
        
        // Performance optimization
        this.debounceTimer = null;
        this.animationQueue = [];
        
        // Initialize app
        this.initializeElements();
        this.attachEventListeners();
        this.loadTheme();
        this.setupKeyboardShortcuts();
        this.initializeAnimations();
        this.renderTasks();
        this.updateStats();
        this.startPeriodicSave();
        
        // Show welcome message for first-time users
        if (this.tasks.length === 0 && !localStorage.getItem('hasVisited')) {
            this.showWelcomeMessage();
            localStorage.setItem('hasVisited', 'true');
        }
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            taskInput: document.getElementById('task-input'),
            dueDateInput: document.getElementById('due-date'),
            categorySelect: document.getElementById('category-select'),
            addTaskBtn: document.getElementById('add-task-btn'),
            searchInput: document.getElementById('search-input'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            categoryBtns: document.querySelectorAll('.category-btn'),
            sortSelect: document.getElementById('sort-select'),
            tasksContainer: document.getElementById('tasks-container'),
            emptyState: document.getElementById('empty-state'),
            totalTasks: document.getElementById('total-tasks'),
            completedTasks: document.getElementById('completed-tasks'),
            pendingTasks: document.getElementById('pending-tasks'),
            clearCompletedBtn: document.getElementById('clear-completed-btn'),
            clearAllBtn: document.getElementById('clear-all-btn'),
            themeSwitch: document.getElementById('theme-switch'),
            confirmationModal: document.getElementById('confirmation-modal'),
            modalMessage: document.getElementById('modal-message'),
            modalCancel: document.getElementById('modal-cancel'),
            modalConfirm: document.getElementById('modal-confirm'),
            progressCircle: document.getElementById('progress-circle'),
            viewBtns: document.querySelectorAll('.view-btn')
        };
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Add task
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (document.activeElement === this.elements.taskInput) {
                    this.addTask();
                } else {
                    this.elements.taskInput.focus();
                }
            }
            
            // Ctrl/Cmd + F: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.elements.searchInput.focus();
            }
            
            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl/Cmd + Shift + Z: Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redo();
            }
            
            // Ctrl/Cmd + D: Toggle theme
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // Escape: Clear search or close modals
            if (e.key === 'Escape') {
                if (this.elements.confirmationModal.classList.contains('show')) {
                    this.hideConfirmation();
                } else if (this.elements.searchInput.value) {
                    this.elements.searchInput.value = '';
                    this.searchQuery = '';
                    this.renderTasks();
                }
            }
        });
    }

    // Initialize animations and effects
    initializeAnimations() {
        // Add entrance animations to existing elements
        const animatedElements = document.querySelectorAll('.header, .input-card, .controls-card, .stats-container');
        animatedElements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Setup intersection observer for scroll animations
        this.setupScrollAnimations();
    }

    // Setup scroll animations
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        // Observe task items as they're added
        this.taskObserver = observer;
    }

    // Start periodic auto-save
    startPeriodicSave() {
        if (this.settings.autoSave) {
            setInterval(() => {
                this.saveTasks();
                this.saveSettings();
            }, 30000); // Save every 30 seconds
        }
    }

    // Show welcome message for new users
    showWelcomeMessage() {
        const welcomeHtml = `
            <div class="welcome-overlay">
                <div class="welcome-content">
                    <div class="welcome-icon">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h2>Welcome to TaskFlow!</h2>
                    <p>Your beautiful task management companion</p>
                    <div class="welcome-features">
                        <div class="feature">
                            <i class="fas fa-plus"></i>
                            <span>Add tasks with categories and due dates</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-search"></i>
                            <span>Search and filter your tasks</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-moon"></i>
                            <span>Switch between light and dark themes</span>
                        </div>
                    </div>
                    <button class="welcome-btn" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-arrow-right"></i>
                        Get Started
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', welcomeHtml);
        
        // Add welcome styles
        const welcomeStyles = `
            <style>
                .welcome-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.5s ease;
                }
                
                .welcome-content {
                    background: var(--glass-bg);
                    backdrop-filter: var(--backdrop-blur);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-2xl);
                    padding: var(--space-12);
                    text-align: center;
                    max-width: 500px;
                    margin: var(--space-6);
                    animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .welcome-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--primary-gradient);
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto var(--space-6);
                    font-size: var(--font-size-3xl);
                    color: white;
                }
                
                .welcome-content h2 {
                    font-size: var(--font-size-3xl);
                    font-weight: 800;
                    margin-bottom: var(--space-3);
                    background: var(--primary-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .welcome-content p {
                    color: var(--text-secondary);
                    font-size: var(--font-size-lg);
                    margin-bottom: var(--space-8);
                }
                
                .welcome-features {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                    margin-bottom: var(--space-8);
                }
                
                .feature {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                    text-align: left;
                }
                
                .feature i {
                    width: 40px;
                    height: 40px;
                    background: var(--primary-color);
                    color: white;
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .welcome-btn {
                    padding: var(--space-4) var(--space-8);
                    background: var(--primary-gradient);
                    color: white;
                    border: none;
                    border-radius: var(--radius-lg);
                    font-size: var(--font-size-lg);
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-3);
                    transition: all var(--transition);
                }
                
                .welcome-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-xl);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', welcomeStyles);
    }

    // Attach event listeners
    attachEventListeners() {
        // Add task
        this.elements.addTaskBtn.addEventListener('click', () => this.addTask());
        this.elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Search functionality with debouncing
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderTasks();
            }, 300);
        });

        // View toggle functionality
        this.elements.viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveButton(this.elements.viewBtns, btn);
                this.settings.viewMode = btn.dataset.view;
                this.saveSettings();
                this.renderTasks();
            });
        });

        // Filter buttons
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveButton(this.elements.filterBtns, btn);
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });

        // Category filter buttons
        this.elements.categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveButton(this.elements.categoryBtns, btn);
                this.currentCategory = btn.dataset.category;
                this.renderTasks();
            });
        });

        // Sort functionality
        this.elements.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderTasks();
        });

        // Clear buttons
        this.elements.clearCompletedBtn.addEventListener('click', () => {
            this.showConfirmation('Are you sure you want to clear all completed tasks?', () => {
                this.clearCompletedTasks();
            });
        });

        this.elements.clearAllBtn.addEventListener('click', () => {
            this.showConfirmation('Are you sure you want to clear all tasks? This action cannot be undone.', () => {
                this.clearAllTasks();
            });
        });

        // Theme toggle
        this.elements.themeSwitch.addEventListener('change', () => {
            this.toggleTheme();
        });

        // Modal events
        this.elements.modalCancel.addEventListener('click', () => {
            this.hideConfirmation();
        });

        // Click outside modal to close
        this.elements.confirmationModal.addEventListener('click', (e) => {
            if (e.target === this.elements.confirmationModal) {
                this.hideConfirmation();
            }
        });
    }

    // Set active button
    setActiveButton(buttons, activeBtn) {
        buttons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    // Save state for undo functionality
    saveState(action, data) {
        this.undoStack.push({
            action,
            data: JSON.parse(JSON.stringify(data)),
            timestamp: Date.now()
        });
        
        // Limit undo stack size
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }

    // Undo last action
    undo() {
        if (this.undoStack.length === 0) {
            this.showNotification('Nothing to undo', 'info');
            return;
        }
        
        const lastAction = this.undoStack.pop();
        this.redoStack.push({
            action: 'restore',
            data: JSON.parse(JSON.stringify(this.tasks)),
            timestamp: Date.now()
        });
        
        this.tasks = lastAction.data;
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        
        this.showNotification(`Undid ${lastAction.action}`, 'success');
    }

    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) {
            this.showNotification('Nothing to redo', 'info');
            return;
        }
        
        const lastRedo = this.redoStack.pop();
        this.undoStack.push({
            action: 'undo',
            data: JSON.parse(JSON.stringify(this.tasks)),
            timestamp: Date.now()
        });
        
        this.tasks = lastRedo.data;
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        
        this.showNotification('Redid action', 'success');
    }

    // Add new task with enhanced features
    addTask() {
        const taskText = this.elements.taskInput.value.trim();
        const dueDate = this.elements.dueDateInput.value;
        const category = this.elements.categorySelect.value;

        if (!taskText) {
            this.showNotification('Please enter a task!', 'error');
            this.elements.taskInput.focus();
            this.elements.taskInput.classList.add('shake');
            setTimeout(() => this.elements.taskInput.classList.remove('shake'), 500);
            return;
        }

        // Save state for undo
        this.saveState('add task', this.tasks);

        const newTask = {
            id: Date.now().toString(),
            text: taskText,
            completed: false,
            category: category,
            dueDate: dueDate,
            createdAt: new Date().toISOString(),
            completedAt: null,
            priority: this.calculatePriority(dueDate, category)
        };

        this.tasks.unshift(newTask);
        this.saveTasks();
        this.renderTasksWithAnimation();
        this.updateStats();
        
        // Clear inputs with animation
        this.clearInputsWithAnimation();

        this.showNotification('Task added successfully!', 'success');
        
        // Add confetti effect for first task
        if (this.tasks.length === 1) {
            this.showConfetti();
        }
    }

    // Calculate task priority based on due date and category
    calculatePriority(dueDate, category) {
        let priority = 1;
        
        if (category === 'Urgent') priority += 3;
        else if (category === 'Work') priority += 2;
        
        if (dueDate) {
            const today = new Date();
            const due = new Date(dueDate);
            const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) priority += 4; // Overdue
            else if (diffDays <= 1) priority += 3; // Due today/tomorrow
            else if (diffDays <= 3) priority += 2; // Due soon
        }
        
        return Math.min(priority, 5);
    }

    // Clear inputs with smooth animation
    clearInputsWithAnimation() {
        const inputs = [this.elements.taskInput, this.elements.dueDateInput];
        
        inputs.forEach((input, index) => {
            setTimeout(() => {
                input.style.transform = 'scale(0.95)';
                input.style.opacity = '0.5';
                
                setTimeout(() => {
                    input.value = '';
                    input.style.transform = 'scale(1)';
                    input.style.opacity = '1';
                }, 150);
            }, index * 50);
        });
        
        this.elements.categorySelect.value = 'Personal';
    }

    // Show confetti effect
    showConfetti() {
        const confettiCount = 50;
        const colors = ['#667eea', '#764ba2', '#f093fb', '#10b981', '#f59e0b'];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}vw;
                top: -10px;
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }
        
        // Add confetti animation styles
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-10px) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Enhanced task rendering with animations
    renderTasksWithAnimation() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.elements.tasksContainer.style.display = 'flex';
        this.elements.emptyState.style.display = 'none';
        
        // Clear existing tasks with fade out animation
        const existingTasks = this.elements.tasksContainer.querySelectorAll('.task-item');
        existingTasks.forEach((task, index) => {
            setTimeout(() => {
                task.style.opacity = '0';
                task.style.transform = 'translateX(-20px)';
            }, index * 50);
        });
        
        // Wait for fade out, then render new tasks
        setTimeout(() => {
            this.elements.tasksContainer.innerHTML = '';
            
            filteredTasks.forEach((task, index) => {
                const taskElement = this.createTaskElement(task);
                taskElement.style.opacity = '0';
                taskElement.style.transform = 'translateY(20px)';
                
                this.elements.tasksContainer.appendChild(taskElement);
                
                // Observe for scroll animations
                if (this.taskObserver) {
                    this.taskObserver.observe(taskElement);
                }
                
                // Animate in
                setTimeout(() => {
                    taskElement.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    taskElement.style.opacity = '1';
                    taskElement.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, existingTasks.length * 50 + 200);
    }

    // Create task element with enhanced features
    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskElement.dataset.taskId = task.id;
        taskElement.innerHTML = this.createTaskHTML(task);
        
        // Add priority indicator
        if (task.priority >= 4) {
            taskElement.classList.add('high-priority');
        } else if (task.priority >= 3) {
            taskElement.classList.add('medium-priority');
        }
        
        return taskElement;
    }

    // Toggle task completion with enhanced feedback
    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            // Save state for undo
            this.saveState('toggle task', this.tasks);
            
            const wasCompleted = task.completed;
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            
            // Add completion animation
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                if (task.completed) {
                    taskElement.classList.add('completing');
                    this.showTaskCompletionEffect(taskElement);
                    this.showNotification('Task completed! 🎉', 'success');
                } else {
                    taskElement.classList.remove('completing');
                    this.showNotification('Task reopened', 'info');
                }
            }
            
            this.saveTasks();
            this.updateStatsWithAnimation();
            
            // Re-render after animation
            setTimeout(() => {
                this.renderTasks();
            }, 600);
        }
    }

    // Show task completion effect
    showTaskCompletionEffect(taskElement) {
        const rect = taskElement.getBoundingClientRect();
        const particles = 12;
        
        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: #10b981;
                border-radius: 50%;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top + rect.height / 2}px;
                pointer-events: none;
                z-index: 1000;
                animation: particle-burst 0.8s ease-out forwards;
            `;
            
            const angle = (i / particles) * Math.PI * 2;
            const velocity = 50 + Math.random() * 30;
            
            particle.style.setProperty('--dx', Math.cos(angle) * velocity + 'px');
            particle.style.setProperty('--dy', Math.sin(angle) * velocity + 'px');
            
            document.body.appendChild(particle);
            
            setTimeout(() => particle.remove(), 800);
        }
        
        // Add particle burst animation if not exists
        if (!document.getElementById('particle-burst-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-burst-styles';
            style.textContent = `
                @keyframes particle-burst {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(var(--dx), var(--dy)) scale(0);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Edit task
    editTask(taskId, newText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && newText.trim()) {
            // Save state for undo
            this.saveState('edit task', this.tasks);
            
            task.text = newText.trim();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task updated successfully!', 'success');
        }
    }

    // Delete task
    deleteTask(taskId) {
        this.showConfirmation('Are you sure you want to delete this task?', () => {
            // Save state for undo
            this.saveState('delete task', this.tasks);
            
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task deleted successfully!', 'success');
        });
    }

    // Clear completed tasks
    clearCompletedTasks() {
        // Save state for undo
        this.saveState('clear completed tasks', this.tasks);
        
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.showNotification('Completed tasks cleared!', 'success');
    }

    // Clear all tasks
    clearAllTasks() {
        // Save state for undo
        this.saveState('clear all tasks', this.tasks);
        
        this.tasks = [];
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.showNotification('All tasks cleared!', 'success');
    }

    // Filter and sort tasks
    getFilteredTasks() {
        let filteredTasks = [...this.tasks];

        // Apply search filter
        if (this.searchQuery) {
            filteredTasks = filteredTasks.filter(task =>
                task.text.toLowerCase().includes(this.searchQuery) ||
                task.category.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply status filter
        if (this.currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (this.currentFilter === 'pending') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        }

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.category === this.currentCategory);
        }

        // Apply sorting
        filteredTasks.sort((a, b) => {
            switch (this.currentSort) {
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'due-date':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'alphabetical':
                    return a.text.localeCompare(b.text);
                case 'newest':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        return filteredTasks;
    }

    // Render tasks
    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            this.elements.tasksContainer.style.display = 'none';
            this.elements.emptyState.style.display = 'block';
            
            if (this.searchQuery) {
                this.elements.emptyState.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>No tasks found</h3>
                    <p>Try adjusting your search or filters</p>
                `;
            } else if (this.tasks.length === 0) {
                this.elements.emptyState.innerHTML = `
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks yet!</h3>
                    <p>Add your first task to get started</p>
                `;
            } else {
                this.elements.emptyState.innerHTML = `
                    <i class="fas fa-filter"></i>
                    <h3>No tasks match your filters</h3>
                    <p>Try changing your filter settings</p>
                `;
            }
        } else {
            this.elements.tasksContainer.style.display = 'flex';
            this.elements.emptyState.style.display = 'none';
            
            this.elements.tasksContainer.innerHTML = filteredTasks.map(task => 
                this.createTaskHTML(task)
            ).join('');

            // Attach task-specific event listeners
            this.attachTaskEventListeners();
        }
    }

    // Create task HTML
    createTaskHTML(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let dueDateClass = '';
        let dueDateText = '';
        
        if (dueDate) {
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                dueDateClass = 'overdue';
                dueDateText = `Overdue (${Math.abs(diffDays)} days)`;
            } else if (diffDays === 0) {
                dueDateClass = 'due-soon';
                dueDateText = 'Due today';
            } else if (diffDays === 1) {
                dueDateClass = 'due-soon';
                dueDateText = 'Due tomorrow';
            } else {
                dueDateText = `Due in ${diffDays} days`;
            }
        }

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="app.toggleTask('${task.id}')">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-content">
                    <div class="task-text" ondblclick="app.makeEditable(this, '${task.id}')">${task.text}</div>
                    <div class="task-meta">
                        <span class="task-category ${task.category}">${task.category}</span>
                        ${task.dueDate ? `
                            <span class="task-due-date ${dueDateClass}">
                                <i class="fas fa-calendar-alt"></i>
                                ${dueDateText}
                            </span>
                        ` : ''}
                        <span class="task-created">
                            <i class="fas fa-clock"></i>
                            ${this.formatDate(task.createdAt)}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn edit-btn" onclick="app.makeEditable(document.querySelector('[data-task-id=&quot;${task.id}&quot;] .task-text'), '${task.id}')" title="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn delete-btn" onclick="app.deleteTask('${task.id}')" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Attach task-specific event listeners
    attachTaskEventListeners() {
        // This method is called after rendering tasks to attach any additional listeners if needed
    }

    // Make task text editable
    makeEditable(element, taskId) {
        const currentText = element.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'task-text editing';
        input.maxLength = 100;

        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== currentText) {
                this.editTask(taskId, newText);
            } else {
                element.textContent = currentText;
            }
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                element.textContent = currentText;
            }
        });

        element.replaceWith(input);
        input.focus();
        input.select();
    }

    // Enhanced statistics update with animations
    updateStatsWithAnimation() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        // Animate number changes
        this.animateNumber(this.elements.totalTasks, parseInt(this.elements.totalTasks.textContent) || 0, total);
        this.animateNumber(this.elements.completedTasks, parseInt(this.elements.completedTasks.textContent) || 0, completed);
        this.animateNumber(this.elements.pendingTasks, parseInt(this.elements.pendingTasks.textContent) || 0, pending);
        
        // Update progress circle
        this.updateProgressCircle(total > 0 ? (completed / total) * 100 : 0);
        
        // Update stat card colors based on progress
        this.updateStatCardStyles(completed, pending, total);
    }

    // Update statistics (fallback method)
    updateStats() {
        this.updateStatsWithAnimation();
    }

    // Animate number changes
    animateNumber(element, from, to) {
        const duration = 800;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + (to - from) * easeOut);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Update progress circle
    updateProgressCircle(percentage) {
        if (this.elements.progressCircle) {
            const circumference = 2 * Math.PI * 16; // radius = 16
            const offset = circumference - (percentage / 100) * circumference;
            
            this.elements.progressCircle.style.strokeDashoffset = offset;
            
            // Change color based on progress
            if (percentage >= 80) {
                this.elements.progressCircle.style.stroke = 'var(--success-color)';
            } else if (percentage >= 50) {
                this.elements.progressCircle.style.stroke = 'var(--warning-color)';
            } else {
                this.elements.progressCircle.style.stroke = 'var(--info-color)';
            }
        }
    }

    // Update stat card styles based on progress
    updateStatCardStyles(completed, pending, total) {
        const completedCard = document.querySelector('.completed-card');
        const pendingCard = document.querySelector('.pending-card');
        
        if (completedCard && pendingCard) {
            // Add pulse animation for milestones
            if (completed > 0 && completed % 5 === 0) {
                completedCard.classList.add('milestone-pulse');
                setTimeout(() => completedCard.classList.remove('milestone-pulse'), 1000);
            }
            
            // Change pending card style based on urgency
            const urgentTasks = this.tasks.filter(task => 
                !task.completed && 
                task.dueDate && 
                new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
            ).length;
            
            if (urgentTasks > 0) {
                pendingCard.classList.add('urgent-tasks');
            } else {
                pendingCard.classList.remove('urgent-tasks');
            }
        }
    }

    // Enhanced empty state handling
    showEmptyState() {
        this.elements.tasksContainer.style.display = 'none';
        this.elements.emptyState.style.display = 'block';
        
        // Update empty state based on current filters
        let emptyMessage = {
            icon: 'fas fa-clipboard-list',
            title: 'Ready to be productive?',
            subtitle: 'Create your first task and start organizing your workflow',
            showButton: true
        };
        
        if (this.searchQuery) {
            emptyMessage = {
                icon: 'fas fa-search',
                title: 'No tasks found',
                subtitle: `No tasks match "${this.searchQuery}". Try adjusting your search.`,
                showButton: false
            };
        } else if (this.currentFilter === 'completed') {
            emptyMessage = {
                icon: 'fas fa-check-circle',
                title: 'No completed tasks yet',
                subtitle: 'Complete some tasks to see them here!',
                showButton: false
            };
        } else if (this.currentFilter === 'pending') {
            emptyMessage = {
                icon: 'fas fa-clock',
                title: 'All caught up!',
                subtitle: 'You have no pending tasks. Great job!',
                showButton: true
            };
        } else if (this.currentCategory !== 'all') {
            emptyMessage = {
                icon: 'fas fa-tag',
                title: `No ${this.currentCategory.toLowerCase()} tasks`,
                subtitle: `Create a task in the ${this.currentCategory} category to see it here.`,
                showButton: false
            };
        }
        
        this.updateEmptyState(emptyMessage);
    }

    // Update empty state content
    updateEmptyState(message) {
        const emptyIcon = this.elements.emptyState.querySelector('.empty-icon i');
        const emptyTitle = this.elements.emptyState.querySelector('h3');
        const emptySubtitle = this.elements.emptyState.querySelector('p');
        const emptyButton = this.elements.emptyState.querySelector('.empty-cta');
        
        if (emptyIcon) emptyIcon.className = message.icon;
        if (emptyTitle) emptyTitle.textContent = message.title;
        if (emptySubtitle) emptySubtitle.textContent = message.subtitle;
        if (emptyButton) emptyButton.style.display = message.showButton ? 'inline-flex' : 'none';
    }

    // Save settings
    saveSettings() {
        localStorage.setItem('todoSettings', JSON.stringify(this.settings));
    }

    // Save tasks to localStorage with error handling
    saveTasks() {
        try {
            localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
            console.log('Tasks saved successfully:', this.tasks.length, 'tasks');
        } catch (error) {
            console.error('Error saving tasks:', error);
            this.showNotification('Error saving tasks!', 'error');
        }
    }

    // Theme management
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('todoTheme', isDark ? 'dark' : 'light');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('todoTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            this.elements.themeSwitch.checked = true;
        }
    }

    // Confirmation modal
    showConfirmation(message, onConfirm) {
        this.elements.modalMessage.textContent = message;
        this.elements.confirmationModal.classList.add('show');
        
        // Remove any existing event listeners
        const newConfirmBtn = this.elements.modalConfirm.cloneNode(true);
        this.elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirm);
        this.elements.modalConfirm = newConfirmBtn;
        
        this.elements.modalConfirm.addEventListener('click', () => {
            onConfirm();
            this.hideConfirmation();
        });
    }

    hideConfirmation() {
        this.elements.confirmationModal.classList.remove('show');
    }

    // Notification system
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-hover);
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Export tasks as readable text file
    exportTasks() {
        if (this.tasks.length === 0) {
            this.showNotification('No tasks to export!', 'info');
            return;
        }

        const currentDate = new Date().toLocaleDateString();
        let textContent = `TaskFlow - My Tasks\n`;
        textContent += `Exported on: ${currentDate}\n`;
        textContent += `Total Tasks: ${this.tasks.length}\n`;
        textContent += `Completed: ${this.tasks.filter(t => t.completed).length}\n`;
        textContent += `Pending: ${this.tasks.filter(t => !t.completed).length}\n`;
        textContent += `\n${'='.repeat(50)}\n\n`;

        // Group tasks by category
        const categories = [...new Set(this.tasks.map(t => t.category))];
        
        categories.forEach(category => {
            const categoryTasks = this.tasks.filter(t => t.category === category);
            if (categoryTasks.length > 0) {
                textContent += `📁 ${category.toUpperCase()} (${categoryTasks.length} tasks)\n`;
                textContent += `${'-'.repeat(30)}\n`;
                
                categoryTasks.forEach((task, index) => {
                    const status = task.completed ? '✅' : '⏳';
                    const dueDate = task.dueDate ? ` | Due: ${new Date(task.dueDate).toLocaleDateString()}` : '';
                    const completedDate = task.completed && task.completedAt ? ` | Completed: ${new Date(task.completedAt).toLocaleDateString()}` : '';
                    
                    textContent += `${index + 1}. ${status} ${task.text}${dueDate}${completedDate}\n`;
                });
                textContent += `\n`;
            }
        });

        // Add summary statistics
        textContent += `\n${'='.repeat(50)}\n`;
        textContent += `SUMMARY STATISTICS\n`;
        textContent += `${'='.repeat(50)}\n`;
        
        const completedTasks = this.tasks.filter(t => t.completed);
        const pendingTasks = this.tasks.filter(t => !t.completed);
        const overdueTasks = this.tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
        
        textContent += `📊 Total Tasks: ${this.tasks.length}\n`;
        textContent += `✅ Completed Tasks: ${completedTasks.length}\n`;
        textContent += `⏳ Pending Tasks: ${pendingTasks.length}\n`;
        textContent += `⚠️ Overdue Tasks: ${overdueTasks.length}\n`;
        
        if (this.tasks.length > 0) {
            const completionRate = Math.round((completedTasks.length / this.tasks.length) * 100);
            textContent += `📈 Completion Rate: ${completionRate}%\n`;
        }
        
        textContent += `\n--- Generated by TaskFlow ---`;

        // Create and download the text file
        const dataBlob = new Blob([textContent], {type: 'text/plain'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `TaskFlow-Tasks-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Tasks exported as text file!', 'success');
    }

    // Import tasks (bonus feature)
    importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                if (Array.isArray(importedTasks)) {
                    this.tasks = [...this.tasks, ...importedTasks];
                    this.saveTasks();
                    this.renderTasks();
                    this.updateStats();
                    this.showNotification('Tasks imported successfully!', 'success');
                } else {
                    this.showNotification('Invalid file format!', 'error');
                }
            } catch (error) {
                this.showNotification('Error importing tasks!', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Add notification animation styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(notificationStyles);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add task quickly
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === document.getElementById('task-input')) {
            window.app.addTask();
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('confirmation-modal');
        if (modal.classList.contains('show')) {
            window.app.hideConfirmation();
        }
    }
});

// Service Worker for offline functionality (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker if you want offline functionality
        // navigator.serviceWorker.register('/sw.js');
    });
}
