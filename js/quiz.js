class Quiz {
    constructor() {
        this.questions = [];
        this.allChapters = [];
        this.selectedChapters = [];
        this.currentQuestion = null;
        this.selectedAnswer = null;
        this.isAnswered = false;
        this.isDropdownOpen = false;
        this.correctlyAnsweredQuestions = new Set(); // Множество для хранения правильно отвеченных вопросов
        
        this.init();
    }

    async init() {
        try {
            await this.loadQuestions();
            this.extractChapters();
            this.setupChapterSelector();
            this.showNextQuestion();
            this.setupEventListeners();
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError();
        }
    }

    async loadQuestions() {
        try {
            const response = await fetch('Test_OP.txt');
            if (!response.ok) {
                throw new Error('Не удалось загрузить файл с вопросами');
            }
            
            const text = await response.text();
            this.questions = this.parseQuestions(text);
            
            if (this.questions.length === 0) {
                throw new Error('Вопросы не найдены в файле');
            }
            
            console.log(`Загружено ${this.questions.length} вопросов`);
        } catch (error) {
            console.error('Ошибка загрузки вопросов:', error);
            throw error;
        }
    }

    parseQuestions(text) {
        const lines = text.split('\n').filter(line => line.trim() !== '' && line.trim() !== '---');
        const questions = [];
        let currentChapter = '';
        let currentQuestion = null;
        let options = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Пропускаем пустые строки и разделители
            if (line === '' || line === '---') {
                continue;
            }

            // Определяем главу (начинается с # и содержит номер)
            if (line.match(/^#\s*\d+\./)) {
                currentChapter = line.replace(/^#\s*/, '');
                continue;
            }

            // Определяем начало вопроса (начинается с числом и точкой)
            const questionMatch = line.match(/^\d+\.\s*(.+)$/);
            if (questionMatch) {
                // Если есть предыдущий вопрос, сохраняем его
                if (currentQuestion && options.length > 0) {
                    questions.push({
                        chapter: currentChapter,
                        question: currentQuestion,
                        options: [...options],
                        correctAnswer: this.findCorrectAnswer(options)
                    });
                }
                
                // Начинаем новый вопрос
                currentQuestion = questionMatch[1];
                options = [];
                continue;
            }

            // Определяем вариант ответа (с отступами)
            const optionMatch = line.match(/^\s*([АБВ])\.\s*(.+)$/);
            if (optionMatch && currentQuestion) {
                const letter = optionMatch[1];
                let text = optionMatch[2];
                const isCorrect = text.includes('✅');
                
                // Удаляем галочку из текста
                text = text.replace('✅', '').trim();
                
                options.push({
                    letter,
                    text,
                    isCorrect
                });
            }
        }

        // Добавляем последний вопрос
        if (currentQuestion && options.length > 0) {
            questions.push({
                chapter: currentChapter,
                question: currentQuestion,
                options: [...options],
                correctAnswer: this.findCorrectAnswer(options)
            });
        }

        return questions.filter(q => q.options.length >= 2);
    }

    findCorrectAnswer(options) {
        const correct = options.find(option => option.isCorrect);
        return correct ? correct.letter : null;
    }

    extractChapters() {
        const chapters = [...new Set(this.questions.map(q => q.chapter))];
        this.allChapters = chapters.sort();
        this.selectedChapters = [...this.allChapters]; // Изначально все главы выбраны
    }

    setupChapterSelector() {
        this.renderChapterDropdown();
        this.updateChapterButtonText();
    }

    renderChapterDropdown() {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = '';

        this.allChapters.forEach(chapter => {
            const item = document.createElement('div');
            item.className = 'chapter-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `chapter-${this.allChapters.indexOf(chapter)}`;
            checkbox.className = 'chapter-checkbox';
            checkbox.checked = this.selectedChapters.includes(chapter);
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.className = 'chapter-label';
            label.textContent = chapter;

            item.appendChild(checkbox);
            item.appendChild(label);

            // Добавляем обработчик клика на весь элемент
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                this.updateSelectedChapters();
            });

            chapterList.appendChild(item);
        });
    }

    updateSelectedChapters() {
        this.selectedChapters = [];
        const checkboxes = document.querySelectorAll('.chapter-checkbox');
        checkboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                this.selectedChapters.push(this.allChapters[index]);
            }
        });
    }

    updateChapterButtonText() {
        const chapterText = document.getElementById('chapter-text');
        
        if (this.selectedChapters.length === 0) {
            chapterText.textContent = 'Главы не выбраны';
        } else if (this.selectedChapters.length === this.allChapters.length) {
            chapterText.textContent = 'Все главы';
        } else if (this.selectedChapters.length === 1) {
            chapterText.textContent = this.selectedChapters[0];
        } else {
            chapterText.textContent = `Выбрано глав: ${this.selectedChapters.length}`;
        }
    }

    getFilteredQuestions() {
        if (this.selectedChapters.length === 0) {
            return [];
        }
        return this.questions.filter(q => this.selectedChapters.includes(q.chapter));
    }

    getQuestionId(question) {
        // Создаем уникальный ID на основе главы и текста вопроса
        return `${question.chapter}:${question.question}`;
    }

    getAvailableQuestions() {
        const filteredQuestions = this.getFilteredQuestions();
        
        // Фильтруем вопросы, исключая уже правильно отвеченные
        return filteredQuestions.filter(question => {
            const questionId = this.getQuestionId(question);
            return !this.correctlyAnsweredQuestions.has(questionId);
        });
    }

    getRandomQuestion() {
        const availableQuestions = this.getAvailableQuestions();
        if (availableQuestions.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        return availableQuestions[randomIndex];
    }

    showNextQuestion() {
        this.currentQuestion = this.getRandomQuestion();
        if (!this.currentQuestion) {
            if (this.selectedChapters.length === 0) {
                this.showFeedback(false, 'Выберите главы для изучения');
            } else {
                // Проверяем, есть ли вообще вопросы в выбранных главах
                const filteredQuestions = this.getFilteredQuestions();
                if (filteredQuestions.length === 0) {
                    this.showError();
                } else {
                    // Все вопросы из выбранных глав уже правильно отвечены
                    this.showCompletionMessage();
                }
            }
            return;
        }

        this.selectedAnswer = null;
        this.isAnswered = false;
        
        this.renderQuestion();
        this.hideLoading();
        this.clearFeedback();
    }

    renderQuestion() {
        // Отображаем вопрос
        const questionElement = document.getElementById('question');
        questionElement.textContent = this.currentQuestion.question;

        // Отображаем варианты ответов
        const optionsElement = document.getElementById('options');
        optionsElement.innerHTML = '';

        this.currentQuestion.options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            optionDiv.dataset.letter = option.letter;
            
            optionDiv.innerHTML = `
                <div class="option-letter">${option.letter}</div>
                <div class="option-text">${option.text}</div>
            `;

            optionDiv.addEventListener('click', () => {
                if (!this.isAnswered) {
                    this.selectOption(option.letter);
                }
            });

            optionsElement.appendChild(optionDiv);
        });

        // Сбрасываем кнопку
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Ответить';
        submitBtn.className = 'btn-primary';
        submitBtn.disabled = true;
    }

    selectOption(letter) {
        // Убираем выделение с предыдущих вариантов
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Выделяем выбранный вариант
        const selectedOption = document.querySelector(`[data-letter="${letter}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        this.selectedAnswer = letter;
        
        // Активируем кнопку
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = false;
    }

    setupEventListeners() {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.addEventListener('click', () => {
            if (!this.isAnswered && this.selectedAnswer) {
                this.checkAnswer();
            } else if (this.isAnswered) {
                this.showNextQuestion();
            }
        });

        // Обработчик для кнопки выбора главы
        const chapterBtn = document.getElementById('chapter-btn');
        chapterBtn.addEventListener('click', () => {
            this.toggleDropdown();
        });

        // Кнопка "Выбрать все"
        const selectAllBtn = document.getElementById('select-all-btn');
        selectAllBtn.addEventListener('click', () => {
            this.selectAllChapters();
        });

        // Кнопка "Снять все"
        const deselectAllBtn = document.getElementById('deselect-all-btn');
        deselectAllBtn.addEventListener('click', () => {
            this.deselectAllChapters();
        });

        // Кнопка "Применить"
        const applyBtn = document.getElementById('apply-filter-btn');
        applyBtn.addEventListener('click', () => {
            this.applyChapterFilter();
        });

        // Закрытие выпадающего списка при клике вне его
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('chapter-dropdown');
            const chapterBtn = document.getElementById('chapter-btn');
            
            if (!dropdown.contains(e.target) && !chapterBtn.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        const dropdown = document.getElementById('chapter-dropdown');
        const chapterBtn = document.getElementById('chapter-btn');
        
        this.isDropdownOpen = !this.isDropdownOpen;
        
        if (this.isDropdownOpen) {
            dropdown.style.display = 'block';
            chapterBtn.classList.add('active');
        } else {
            dropdown.style.display = 'none';
            chapterBtn.classList.remove('active');
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('chapter-dropdown');
        const chapterBtn = document.getElementById('chapter-btn');
        
        this.isDropdownOpen = false;
        dropdown.style.display = 'none';
        chapterBtn.classList.remove('active');
    }

    selectAllChapters() {
        const checkboxes = document.querySelectorAll('.chapter-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.updateSelectedChapters();
    }

    deselectAllChapters() {
        const checkboxes = document.querySelectorAll('.chapter-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.updateSelectedChapters();
    }

    applyChapterFilter() {
        this.updateSelectedChapters();
        this.updateChapterButtonText();
        this.closeDropdown();
        
        // Если нет выбранных глав, показываем ошибку
        if (this.selectedChapters.length === 0) {
            this.showFeedback(false, 'Выберите хотя бы одну главу для изучения');
            return;
        }
        
        // При смене фильтра сбрасываем правильно отвеченные вопросы
        // чтобы пользователь мог заново проходить вопросы из новых глав
        this.correctlyAnsweredQuestions.clear();
        
        // Показываем кнопку ответа, если она была скрыта
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.style.display = 'block';
        
        // Показываем новый вопрос из выбранных глав
        this.showNextQuestion();
    }

    checkAnswer() {
        if (!this.selectedAnswer || this.isAnswered) return;

        this.isAnswered = true;
        const isCorrect = this.selectedAnswer === this.currentQuestion.correctAnswer;
        
        // Если ответ правильный, добавляем вопрос в множество правильно отвеченных
        if (isCorrect) {
            const questionId = this.getQuestionId(this.currentQuestion);
            this.correctlyAnsweredQuestions.add(questionId);
        }
        
        this.showFeedback(isCorrect);
        this.updateButton();
    }

    showFeedback(isCorrect, customMessage = null) {
        const feedbackElement = document.getElementById('feedback');
        
        if (customMessage) {
            feedbackElement.textContent = customMessage;
            feedbackElement.className = 'feedback incorrect';
        } else {
            let message = isCorrect ? 'Верно!' : 'Неверно!';
            
            // Добавляем информацию о прогрессе для правильных ответов
            if (isCorrect) {
                const totalQuestions = this.getFilteredQuestions().length;
                const answeredQuestions = this.correctlyAnsweredQuestions.size;
                
                if (answeredQuestions < totalQuestions) {
                    message += ` (${answeredQuestions}/${totalQuestions})`;
                }
            }
            
            feedbackElement.textContent = message;
            feedbackElement.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        }
    }

    clearFeedback() {
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.textContent = '';
        feedbackElement.className = 'feedback';
    }

    updateButton() {
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Следующий вопрос';
        submitBtn.className = 'btn-secondary';
        submitBtn.disabled = false;
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz').style.display = 'block';
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('quiz').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }

    showCompletionMessage() {
        const totalQuestions = this.getFilteredQuestions().length;
        const answeredQuestions = this.correctlyAnsweredQuestions.size;
        
        let message;
        if (this.selectedChapters.length === this.allChapters.length) {
            message = `🎉 Поздравляем! Вы правильно ответили на все ${totalQuestions} вопросов из всех глав!`;
        } else {
            message = `🎉 Отлично! Вы правильно ответили на все ${totalQuestions} вопросов из выбранных глав!`;
        }
        
        message += '\n\n💡 Обновите страницу или выберите другие главы для продолжения изучения.';
        
        this.showFeedback(true, message);
        
        // Скрываем кнопку ответа
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.style.display = 'none';
    }
}

// Запускаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new Quiz();
});