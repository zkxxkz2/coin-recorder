// 金币记录器应用
class CoinTracker {
    constructor() {
        // 初始化认证管理器
        this.authManager = new UserAuthManager();
        this.githubStorage = this.authManager.githubStorage;

        // 初始化为空，登录后加载
        this.coinData = [];
        this.streakData = this.getDefaultStreakData();
        this.challengeData = this.getDefaultChallengeData();
        this.achievements = this.getDefaultAchievements();

        this.totalChart = null;
        this.dailyChart = null;
        this.currentTheme = this.loadTheme();

        // 检查登录状态
        if (this.authManager.isLoggedIn()) {
            this.loadUserData();
        }

        this.init();
    }

    // 初始化应用
    init() {
        // 先确保内容可见并可交互
        this.hideAllSkeletons();

        this.applyTheme(this.currentTheme);
        this.bindEvents();
        this.updateDisplay();
        this.renderHistory();
        this.updateAchievements();
        this.updateStreakDisplay();
        this.updateChallengeDisplay();
        this.initCharts();
        this.checkAchievements(); // 检查是否有新成就可以解锁
    }

    // 绑定事件监听器
    bindEvents() {
        // 表单提交
        const coinForm = document.getElementById('coinForm');
        coinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCoinRecord();
        });

        // 标签页切换
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // 导出数据
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            this.exportData();
        });

        // 清空记录
        const clearBtn = document.getElementById('clearBtn');
        clearBtn.addEventListener('click', () => {
            this.clearAllData();
        });

        // 重置缩放
        const resetZoomBtn = document.getElementById('resetZoomBtn');
        resetZoomBtn.addEventListener('click', () => {
            this.resetAllZooms();
        });

        // 主题切换
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // 补签按钮
        const makeupRecordBtn = document.getElementById('makeupRecordBtn');
        makeupRecordBtn.addEventListener('click', () => {
            this.makeupYesterdayRecord();
        });

        // 挑战设定按钮
        const setChallengeBtn = document.getElementById('setChallengeBtn');
        setChallengeBtn.addEventListener('click', () => {
            this.showChallengeModal();
        });

        // 批量录入按钮
        const batchInputBtn = document.getElementById('batchInputBtn');
        batchInputBtn.addEventListener('click', () => {
            this.showBatchInputModal();
        });

        // 批量录入模态框事件
        this.setupBatchInputModalEvents();
    }

    // 添加金币记录
    addCoinRecord() {
        const coinAmount = document.getElementById('coinAmount').value;
        const note = document.getElementById('note').value;

        if (!coinAmount || coinAmount < 0) {
            this.showMessage('请输入有效的金币数量', 'error');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const lastRecord = this.coinData.length > 0 ? this.coinData[this.coinData.length - 1] : null;

        // 检查是否已经是今天的数据
        if (lastRecord && lastRecord.date === today) {
            if (confirm('今天已经记录过金币，是否更新记录？')) {
                this.updateTodayRecord(parseInt(coinAmount), note);
            }
        } else {
            this.createNewRecord(parseInt(coinAmount), note, today);
        }

        this.updateDisplay();
        this.renderHistory();
        this.updateCharts();
        this.updateStreakDisplay();
        this.checkAchievements();
        this.showMessage('金币记录成功！', 'success');
    }

    // 创建新记录
    createNewRecord(coins, note, date) {
        // 如果是第一条记录，差值为0；否则计算与前一天的差值
        const previousCoins = this.coinData.length > 0 ? this.coinData[this.coinData.length - 1].coins : 0;
        const difference = this.coinData.length > 0 ? coins - previousCoins : 0;

        const record = {
            date,
            coins,
            difference,
            note: note || '',
            timestamp: Date.now()
        };

        this.coinData.push(record);

        // 更新连击数据
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
            // 今天的记录
            this.streakData.todayCompleted = true;
            if (this.streakData.lastRecordDate === this.getYesterdayDate()) {
                // 昨天也记录了，连击+1
                this.streakData.currentStreak += 1;
            } else {
                // 昨天没记录，重置连击
                this.streakData.currentStreak = 1;
            }
            this.streakData.lastRecordDate = today;

            // 更新最长连击
            if (this.streakData.currentStreak > this.streakData.longestStreak) {
                this.streakData.longestStreak = this.streakData.currentStreak;
            }
        }

        this.saveData();
        this.saveStreakData();
    }

    // 获取昨天的日期字符串
    getYesterdayDate() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    // 更新今天的记录
    updateTodayRecord(coins, note) {
        const lastRecord = this.coinData[this.coinData.length - 1];
        const today = new Date().toISOString().split('T')[0];

        // 如果是第一条记录，差值为0；否则计算与前一天的差值
        const previousCoins = this.coinData.length > 1 ? this.coinData[this.coinData.length - 2].coins : 0;
        lastRecord.coins = coins;
        lastRecord.difference = this.coinData.length > 1 ? coins - previousCoins : 0;
        lastRecord.note = note;
        lastRecord.timestamp = Date.now();

        // 更新连击数据（如果是今天的记录）
        if (lastRecord.date === today) {
            this.streakData.todayCompleted = true;
            if (this.streakData.lastRecordDate === this.getYesterdayDate()) {
                this.streakData.currentStreak += 1;
            } else {
                this.streakData.currentStreak = 1;
            }
            this.streakData.lastRecordDate = today;

            if (this.streakData.currentStreak > this.streakData.longestStreak) {
                this.streakData.longestStreak = this.streakData.currentStreak;
            }
        }

        this.saveData();
        this.saveStreakData();
    }

    // 更新显示
    updateDisplay() {
        if (this.coinData.length === 0) {
            this.showEmptyStats();
            return;
        }

        const lastRecord = this.coinData[this.coinData.length - 1];

        // 更新今日统计（带动画效果）
        this.animateNumber('todayCoins', lastRecord.coins);
        this.animateNumber('difference', lastRecord.difference);
        this.animateNumber('totalCoins', this.calculateTotal());
        this.animateNumber('recordDays', this.coinData.length);

        // 设置差值的颜色
        const differenceElement = document.getElementById('difference');
        differenceElement.className = 'stat-value';
        if (lastRecord.difference > 0) {
            differenceElement.classList.add('positive');
        } else if (lastRecord.difference < 0) {
            differenceElement.classList.add('negative');
        }
    }

    // 显示空状态统计
    showEmptyStats() {
        document.getElementById('todayCoins').textContent = '-';
        document.getElementById('difference').textContent = '-';
        document.getElementById('totalCoins').textContent = '0';
        document.getElementById('recordDays').textContent = '0';
    }

    // 渲染历史记录
    renderHistory() {
        const historyList = document.getElementById('historyList');

        if (this.coinData.length === 0) {
            historyList.innerHTML = '<div class="empty-state">暂无历史记录，快来记录第一笔金币吧！</div>';
            return;
        }

        historyList.innerHTML = this.coinData.map((record, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-content">
                    <div class="history-date">${this.formatDate(record.date)}</div>
                    <div class="history-coins">金币: ${record.coins}</div>
                    <div class="history-note">${record.note || '无备注'}</div>
                </div>
                <div class="history-actions">
                    <div class="history-difference ${record.difference > 0 ? 'positive' : record.difference < 0 ? 'negative' : 'neutral'}">
                        ${index === 0 ? '首次记录' : this.formatDifference(record.difference)}
                    </div>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="coinTracker.editRecord(${index})" title="编辑">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="delete-btn" onclick="coinTracker.deleteRecord(${index})" title="删除">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 初始化图表
    initCharts() {
        // 总金币趋势图
        this.initTotalChart();

        // 每日变化图
        this.initDailyChart();

        // 周统计图
        this.initWeeklyChart();

        // 月统计图
        this.initMonthlyChart();

        this.updateCharts();
    }

    initTotalChart() {
        const ctx = document.getElementById('totalChart').getContext('2d');
        this.totalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '总金币数',
                    data: [],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '金币总数趋势图'
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '总金币数'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initDailyChart() {
        const ctx = document.getElementById('dailyChart').getContext('2d');
        this.dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '每日变化',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '每日金币变化图'
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: '日期'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: '每日变化'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }


    initWeeklyChart() {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        this.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '周总金币',
                    data: [],
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '周统计图表'
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '月总金币',
                    data: [],
                    backgroundColor: '#9b59b6',
                    borderColor: '#8e44ad',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '月统计图表'
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }


    // 更新图表数据
    updateCharts() {
        if (this.coinData.length === 0) {
            this.clearAllCharts();
            return;
        }

        // 更新总金币趋势图
        this.updateTotalChart();

        // 更新每日变化图
        this.updateDailyChart();

        // 更新周统计图
        this.updateWeeklyChart();

        // 更新月统计图
        this.updateMonthlyChart();
    }

    clearAllCharts() {
        const charts = [
            this.totalChart, this.dailyChart,
            this.weeklyChart, this.monthlyChart
        ];

        charts.forEach(chart => {
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });
                chart.update();
            }
        });
    }

    updateTotalChart() {
        const labels = this.coinData.map(record => this.formatDate(record.date));
        const totalData = this.coinData.map(record => record.coins);

        this.totalChart.data.labels = labels;
        this.totalChart.data.datasets[0].data = totalData;
        this.totalChart.update();
    }

    updateDailyChart() {
        const dailyLabels = this.coinData.map(record => this.formatDate(record.date));
        const dailyData = this.coinData.map(record => record.difference);

        this.dailyChart.data.labels = dailyLabels;
        this.dailyChart.data.datasets[0].data = dailyData;
        this.dailyChart.update();
    }


    updateWeeklyChart() {
        const weeklyData = this.calculateWeeklyStats();
        const labels = weeklyData.map(week => `第${week.week}周`);

        this.weeklyChart.data.labels = labels;
        this.weeklyChart.data.datasets[0].data = weeklyData.map(week => week.total);
        this.weeklyChart.update();
    }

    updateMonthlyChart() {
        const monthlyData = this.calculateMonthlyStats();
        const labels = monthlyData.map(month => `${month.year}-${month.month.toString().padStart(2, '0')}`);

        this.monthlyChart.data.labels = labels;
        this.monthlyChart.data.datasets[0].data = monthlyData.map(month => month.total);
        this.monthlyChart.update();
    }


    // 计算周统计
    calculateWeeklyStats() {
        const weeks = {};
        this.coinData.forEach(record => {
            const date = new Date(record.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!weeks[weekKey]) {
                weeks[weekKey] = { total: 0, count: 0 };
            }
            weeks[weekKey].total += record.coins;
            weeks[weekKey].count++;
        });

        return Object.entries(weeks)
            .map(([weekStart, data], index) => ({
                week: index + 1,
                total: data.total
            }))
            .slice(-8); // 只显示最近8周
    }

    // 计算月统计
    calculateMonthlyStats() {
        const months = {};
        this.coinData.forEach(record => {
            const date = new Date(record.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            if (!months[monthKey]) {
                months[monthKey] = { total: 0, count: 0, year: date.getFullYear(), month: date.getMonth() + 1 };
            }
            months[monthKey].total += record.coins;
            months[monthKey].count++;
        });

        return Object.values(months)
            .map(month => ({
                ...month,
                total: month.total
            }))
            .slice(-6); // 只显示最近6个月
    }

    // 切换图表标签页
    switchTab(tabName) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const charts = document.querySelectorAll('.chart-container canvas');

        tabBtns.forEach(btn => btn.classList.remove('active'));
        charts.forEach(chart => chart.style.display = 'none');

        event.target.classList.add('active');

        document.getElementById(tabName).style.display = 'block';
    }

    // 导出数据
    exportData() {
        if (this.coinData.length === 0) {
            this.showMessage('暂无数据可导出', 'warning');
            return;
        }

        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `金币记录_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showMessage('数据导出成功！', 'success');
        }
    }

    // 生成CSV内容
    generateCSV() {
        const headers = ['日期', '金币数', '差值', '备注'];
        const rows = this.coinData.map(record => [
            record.date,
            record.coins,
            record.difference,
            record.note
        ]);

        const csvArray = [headers, ...rows];
        return csvArray.map(row =>
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    // 清空所有数据
    clearAllData() {
        if (confirm('确定要清空所有记录吗？此操作不可撤销！')) {
            this.coinData = [];
            this.saveData();
            this.updateDisplay();
            this.renderHistory();
            this.updateCharts();
            this.showMessage('所有数据已清空', 'info');
        }
    }

    // 工具方法
    calculateTotal() {
        return this.coinData.length > 0 ? this.coinData[this.coinData.length - 1].coins : 0;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatDifference(diff) {
        if (diff === 0) return '0';
        return diff > 0 ? `+${diff}` : diff.toString();
    }

    showMessage(message, type) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        // 添加样式
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '1000',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease'
        });

        // 根据类型设置背景色
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(messageEl);

        // 显示动画
        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            messageEl.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(messageEl);
            }, 300);
        }, 3000);
    }

    loadData() {
        try {
            const data = localStorage.getItem('coinTrackerData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('加载数据失败:', error);
            return [];
        }
    }

    saveData() {
        try {
            localStorage.setItem('coinTrackerData', JSON.stringify(this.coinData));
        } catch (error) {
            console.error('保存数据失败:', error);
            this.showMessage('数据保存失败', 'error');
        }
    }

    // 编辑记录
    editRecord(index) {
        const record = this.coinData[index];
        const newCoins = prompt('请输入新的金币数量：', record.coins);
        const newNote = prompt('请输入新的备注：', record.note || '');

        if (newCoins === null || newNote === null) return;

        const coins = parseInt(newCoins);
        if (isNaN(coins) || coins < 0) {
            this.showMessage('请输入有效的金币数量', 'error');
            return;
        }

        // 计算新的差值
        // 如果是第一条记录，差值为0；否则计算与前一天的差值
        const previousCoins = index > 0 ? this.coinData[index - 1].coins : 0;
        record.coins = coins;
        record.difference = index > 0 ? coins - previousCoins : 0;
        record.note = newNote.trim();
        record.timestamp = Date.now();

        // 更新后续记录的差值
        this.updateSubsequentDifferences(index);

        this.saveData();
        this.updateDisplay();
        this.renderHistory();
        this.updateCharts();
        this.showMessage('记录更新成功！', 'success');
    }

    // 删除记录
    deleteRecord(index) {
        if (!confirm('确定要删除这条记录吗？')) return;

        // 删除指定记录
        this.coinData.splice(index, 1);

        // 重新计算后续记录的差值
        if (index < this.coinData.length) {
            this.updateSubsequentDifferences(index - 1);
        }

        this.saveData();
        this.updateDisplay();
        this.renderHistory();
        this.updateCharts();
        this.showMessage('记录删除成功！', 'success');
    }

    // 更新后续记录的差值
    updateSubsequentDifferences(startIndex) {
        for (let i = startIndex; i < this.coinData.length; i++) {
            const current = this.coinData[i];
            const previous = i > 0 ? this.coinData[i - 1].coins : 0;
            current.difference = current.coins - previous;
        }
    }

    // 数字动画效果
    animateNumber(elementId, targetValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 使用缓动函数让动画更自然
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

            // 特殊处理差值显示
            if (elementId === 'difference') {
                element.textContent = this.formatDifference(currentValue);
            } else {
                element.textContent = currentValue;
            }

            // 添加更新动画类
            if (progress === 1) {
                element.classList.add('updated');
                setTimeout(() => {
                    element.classList.remove('updated');
                }, 600);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // 重置所有图表的缩放和平移
    resetAllZooms() {
        const charts = [
            this.totalChart, this.dailyChart,
            this.weeklyChart, this.monthlyChart
        ];

        charts.forEach(chart => {
            if (chart) {
                chart.resetZoom();
            }
        });

        this.showMessage('图表视图已重置', 'info');
    }

    // 主题相关方法
    loadTheme() {
        const savedTheme = localStorage.getItem('coinTrackerTheme');
        return savedTheme || 'light';
    }

    saveTheme(theme) {
        localStorage.setItem('coinTrackerTheme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.saveTheme(theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.showMessage(`已切换到${newTheme === 'light' ? '亮色' : '暗黑'}主题`, 'info');
    }

    // 骨架屏相关方法
    showAllSkeletons() {
        const skeletonIds = ['inputSkeleton', 'statsSkeleton', 'streakSkeleton', 'challengeSkeleton', 'achievementsSkeleton', 'chartSkeleton', 'historySkeleton'];
        skeletonIds.forEach(id => {
            const skeleton = document.getElementById(id);
            if (skeleton) {
                skeleton.style.display = 'block';
            }
        });

        // 隐藏内容区域
        const contentIds = ['inputContent', 'statsContent', 'streakContent', 'challengeContent', 'achievementsContent', 'chartContent', 'historyContent'];
        contentIds.forEach(id => {
            const content = document.getElementById(id);
            if (content) {
                content.classList.add('loading');
            }
        });
    }

    hideAllSkeletons() {
        const skeletonIds = ['inputSkeleton', 'statsSkeleton', 'streakSkeleton', 'challengeSkeleton', 'achievementsSkeleton', 'chartSkeleton', 'historySkeleton'];
        skeletonIds.forEach(id => {
            const skeleton = document.getElementById(id);
            if (skeleton) {
                skeleton.style.display = 'none';
            }
        });

        // 显示内容区域
        const contentIds = ['inputContent', 'statsContent', 'streakContent', 'challengeContent', 'achievementsContent', 'chartContent', 'historyContent'];
        contentIds.forEach(id => {
            const content = document.getElementById(id);
            if (content) {
                content.classList.remove('loading');
            }
        });
    }

    // 连击数据相关方法
    loadStreakData() {
        try {
            const streakData = localStorage.getItem('coinTrackerStreak');
            return streakData ? JSON.parse(streakData) : this.getDefaultStreakData();
        } catch (error) {
            console.error('加载连击数据失败:', error);
            return this.getDefaultStreakData();
        }
    }

    saveStreakData() {
        try {
            localStorage.setItem('coinTrackerStreak', JSON.stringify(this.streakData));
        } catch (error) {
            console.error('保存连击数据失败:', error);
        }
    }

    getDefaultStreakData() {
        return {
            currentStreak: 0,
            longestStreak: 0,
            lastRecordDate: null,
            todayCompleted: false
        };
    }

    updateStreakDisplay() {
        const today = new Date().toISOString().split('T')[0];

        // 检查是否是新的一天
        if (this.streakData.lastRecordDate !== today) {
            if (this.streakData.todayCompleted) {
                // 昨天完成了记录，今天重置连击
                this.streakData.currentStreak = 0;
                this.streakData.todayCompleted = false;
            }
        }

        // 更新显示
        document.getElementById('currentStreak').textContent = `${this.streakData.currentStreak}天`;
        document.getElementById('longestStreak').textContent = `${this.streakData.longestStreak}天`;
        document.getElementById('todayComplete').textContent = this.streakData.todayCompleted ? '已完成' : '未完成';

        // 设置今日完成状态的颜色
        const todayCompleteElement = document.getElementById('todayComplete');
        todayCompleteElement.className = 'streak-value';
        if (this.streakData.todayCompleted) {
            todayCompleteElement.classList.add('completed');
        }

        // 显示/隐藏补签按钮
        const makeupBtn = document.getElementById('makeupRecordBtn');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // 如果昨天没记录且今天还没记录，显示补签按钮
        if (!this.streakData.todayCompleted && this.coinData.length > 0) {
            const lastRecord = this.coinData[this.coinData.length - 1];
            if (lastRecord.date !== today && lastRecord.date !== yesterdayStr) {
                makeupBtn.style.display = 'block';
            } else {
                makeupBtn.style.display = 'none';
            }
        } else {
            makeupBtn.style.display = 'none';
        }

        this.saveStreakData();
    }

    makeupYesterdayRecord() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // 检查昨天是否已经有记录
        const hasYesterdayRecord = this.coinData.some(record => record.date === yesterdayStr);

        if (hasYesterdayRecord) {
            this.showMessage('昨天已经有记录了！', 'warning');
            return;
        }

        // 提示用户输入昨天的金币数量
        const coins = prompt('请输入昨天的金币数量：');
        if (coins === null) return;

        const coinAmount = parseInt(coins);
        if (isNaN(coinAmount) || coinAmount < 0) {
            this.showMessage('请输入有效的金币数量', 'error');
            return;
        }

        // 创建昨天的记录
        this.createNewRecord(coinAmount, '补签记录', yesterdayStr);

        // 更新连击数据
        this.streakData.currentStreak += 1;
        if (this.streakData.currentStreak > this.streakData.longestStreak) {
            this.streakData.longestStreak = this.streakData.currentStreak;
        }
        this.streakData.lastRecordDate = yesterdayStr;

        // 更新显示
        this.updateDisplay();
        this.renderHistory();
        this.updateCharts();
        this.updateStreakDisplay();
        this.checkAchievements();

        this.showMessage('补签成功！连击已恢复', 'success');
    }

    // 挑战数据相关方法
    loadChallengeData() {
        try {
            const challengeData = localStorage.getItem('coinTrackerChallenge');
            return challengeData ? JSON.parse(challengeData) : this.getDefaultChallengeData();
        } catch (error) {
            console.error('加载挑战数据失败:', error);
            return this.getDefaultChallengeData();
        }
    }

    saveChallengeData() {
        try {
            localStorage.setItem('coinTrackerChallenge', JSON.stringify(this.challengeData));
        } catch (error) {
            console.error('保存挑战数据失败:', error);
        }
    }

    getDefaultChallengeData() {
        return {
            target: 0,
            startDate: null,
            endDate: null,
            currentProgress: 0,
            completed: false,
            completedDate: null
        };
    }

    updateChallengeDisplay() {
        const challengeInfo = document.getElementById('currentChallengeInfo');
        const noChallengeInfo = document.getElementById('noChallengeInfo');

        if (this.challengeData.target > 0) {
            // 有挑战
            challengeInfo.style.display = 'block';
            noChallengeInfo.style.display = 'none';

            document.getElementById('challengeTarget').textContent = this.challengeData.target;
            document.getElementById('challengeProgress').textContent = this.challengeData.currentProgress;

            const percentage = Math.min((this.challengeData.currentProgress / this.challengeData.target) * 100, 100);
            document.getElementById('challengePercentage').textContent = `${Math.round(percentage)}%`;

            const progressFill = document.getElementById('challengeProgressFill');
            progressFill.style.width = `${percentage}%`;

            // 根据进度改变颜色
            if (percentage >= 100) {
                progressFill.style.background = 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)';
            } else if (percentage >= 75) {
                progressFill.style.background = 'linear-gradient(90deg, #f39c12 0%, #e67e22 100%)';
            } else {
                progressFill.style.background = 'linear-gradient(90deg, var(--accent-color) 0%, #27ae60 100%)';
            }
        } else {
            // 没有挑战
            challengeInfo.style.display = 'none';
            noChallengeInfo.style.display = 'block';
        }

        this.saveChallengeData();
    }

    showChallengeModal() {
        const modal = document.createElement('div');
        modal.className = 'challenge-modal';
        modal.innerHTML = `
            <div class="challenge-modal-backdrop">
                <div class="challenge-modal-content">
                    <button class="challenge-modal-close">&times;</button>
                    <div class="challenge-modal-icon">🎯</div>
                    <div class="challenge-modal-title">设定攒钱挑战</div>
                    <div class="challenge-modal-form">
                        <div class="challenge-form-group">
                            <label for="challengeTargetInput">目标金币数量：</label>
                            <input type="number" id="challengeTargetInput" min="100" step="100" placeholder="例如：1000" value="${this.challengeData.target || ''}">
                        </div>
                        <div class="challenge-form-actions">
                            <button id="cancelChallengeBtn" class="challenge-cancel-btn">取消</button>
                            <button id="confirmChallengeBtn" class="challenge-confirm-btn">确定</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加事件监听器
        const closeBtn = modal.querySelector('.challenge-modal-close');
        const cancelBtn = modal.querySelector('#cancelChallengeBtn');
        const confirmBtn = modal.querySelector('#confirmChallengeBtn');
        const backdrop = modal.querySelector('.challenge-modal-backdrop');

        closeBtn.onclick = () => this.closeChallengeModal();
        cancelBtn.onclick = () => this.closeChallengeModal();
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                this.closeChallengeModal();
            }
        };

        confirmBtn.onclick = () => {
            const targetInput = document.getElementById('challengeTargetInput');
            const target = parseInt(targetInput.value);

            if (isNaN(target) || target < 100) {
                this.showMessage('请输入有效目标金币数量（至少100）', 'error');
                return;
            }

            this.setChallenge(target);
            this.closeChallengeModal();
        };

        // 触发动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    setChallenge(target) {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1); // 默认1个月挑战

        this.challengeData = {
            target: target,
            startDate: today.toISOString(),
            endDate: endDate.toISOString(),
            currentProgress: this.calculateTotal(),
            completed: false,
            completedDate: null
        };

        this.updateChallengeDisplay();
        this.showMessage(`🎯 挑战设定成功！目标：${target}金币`, 'success');
    }

    closeChallengeModal() {
        const modal = document.querySelector('.challenge-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    // 设置批量录入模态框事件
    setupBatchInputModalEvents() {
        // 预览按钮事件
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const coinsInput = document.getElementById('batchCoins');

        if (startDateInput && endDateInput && coinsInput) {
            const previewBtn = document.createElement('button');
            previewBtn.id = 'previewBatchBtn';
            previewBtn.className = 'batch-preview-btn';
            previewBtn.textContent = '预览数据';
            previewBtn.style.cssText = `
                background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                font-family: 'Inter', sans-serif;
                font-weight: 500;
                margin-top: 10px;
                transition: all 0.3s ease;
            `;

            // 插入到备注输入框后面
            const noteInput = document.getElementById('batchNote');
            noteInput.parentNode.insertBefore(previewBtn, noteInput.nextSibling);

            previewBtn.addEventListener('click', () => {
                this.previewBatchData();
            });

            // 添加输入变化监听
            [startDateInput, endDateInput, coinsInput].forEach(input => {
                input.addEventListener('input', () => {
                    const previewSection = document.getElementById('batchPreview');
                    if (previewSection) {
                        previewSection.style.display = 'none';
                    }
                });
            });
        }

        // 确认和取消按钮事件
        const cancelBtn = document.getElementById('cancelBatchBtn');
        const confirmBtn = document.getElementById('confirmBatchBtn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeBatchInputModal();
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.executeBatchInput();
            });
        }
    }

    // 批量录入相关方法
    showBatchInputModal() {
        const modal = document.getElementById('batchInputModal');
        if (modal) {
            // 设置默认日期
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            document.getElementById('startDate').value = yesterday.toISOString().split('T')[0];
            document.getElementById('endDate').value = today.toISOString().split('T')[0];

            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    closeBatchInputModal() {
        const modal = document.getElementById('batchInputModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    previewBatchData() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const coins = document.getElementById('batchCoins').value;
        const note = document.getElementById('batchNote').value;

        if (!startDate || !endDate || !coins) return;

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            this.showMessage('开始日期不能晚于结束日期', 'error');
            return;
        }

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const previewList = document.getElementById('batchPreviewList');
        const previewSection = document.getElementById('batchPreview');

        previewList.innerHTML = '';

        for (let i = 0; i < days; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];

            // 检查是否已有记录
            const existingRecord = this.coinData.find(record => record.date === dateStr);
            const status = existingRecord ? '⚠️ 已有记录' : '✅ 新记录';

            const item = document.createElement('div');
            item.className = 'batch-preview-item';
            item.textContent = `${dateStr}: ${coins}金币 ${note ? `(${note})` : ''} - ${status}`;
            previewList.appendChild(item);
        }

        previewSection.style.display = 'block';
    }

    executeBatchInput() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const coins = document.getElementById('batchCoins').value;
        const note = document.getElementById('batchNote').value;

        if (!startDate || !endDate || !coins) {
            this.showMessage('请填写完整信息', 'error');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            this.showMessage('开始日期不能晚于结束日期', 'error');
            return;
        }

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < days; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];

            // 检查是否已有记录
            const existingRecord = this.coinData.find(record => record.date === dateStr);
            if (existingRecord) {
                skipCount++;
                continue;
            }

            // 创建新记录
            this.createNewRecord(parseInt(coins), note, dateStr);
            successCount++;
        }

        this.closeBatchInputModal();

        if (successCount > 0) {
            this.updateDisplay();
            this.renderHistory();
            this.updateCharts();
            this.updateStreakDisplay();
            this.updateChallengeDisplay();
            this.checkAchievements();
        }

        this.showMessage(`批量录入完成！新增${successCount}条记录${skipCount > 0 ? `，跳过${skipCount}条已有记录` : ''}`, 'success');
    }

    // 成就系统方法
    loadAchievements() {
        try {
            const achievements = localStorage.getItem('coinTrackerAchievements');
            return achievements ? JSON.parse(achievements) : this.getDefaultAchievements();
        } catch (error) {
            console.error('加载成就数据失败:', error);
            return this.getDefaultAchievements();
        }
    }

    saveAchievements() {
        try {
            localStorage.setItem('coinTrackerAchievements', JSON.stringify(this.achievements));
        } catch (error) {
            console.error('保存成就数据失败:', error);
        }
    }

    getDefaultAchievements() {
        return {
            first_record: { unlocked: false, unlockedDate: null },
            week_streak: { unlocked: false, unlockedDate: null },
            month_streak: { unlocked: false, unlockedDate: null },
            hundred_days: { unlocked: false, unlockedDate: null },
            thousand_coins: { unlocked: false, unlockedDate: null },
            ten_thousand: { unlocked: false, unlockedDate: null },
            twenty_thousand: { unlocked: false, unlockedDate: null },
            thirty_thousand: { unlocked: false, unlockedDate: null },
            forty_thousand: { unlocked: false, unlockedDate: null },
            fifty_thousand: { unlocked: false, unlockedDate: null }
        };
    }

    checkAchievements() {
        const newUnlocked = [];
        const totalCoins = this.calculateTotal();
        const recordDays = this.coinData.length;
        const currentStreak = this.calculateCurrentStreak();

        // 检查首次记录成就
        if (recordDays >= 1 && !this.achievements.first_record.unlocked) {
            this.unlockAchievement('first_record');
            newUnlocked.push('first_record');
        }

        // 检查连续记录成就
        if (currentStreak >= 7 && !this.achievements.week_streak.unlocked) {
            this.unlockAchievement('week_streak');
            newUnlocked.push('week_streak');
        }

        if (currentStreak >= 30 && !this.achievements.month_streak.unlocked) {
            this.unlockAchievement('month_streak');
            newUnlocked.push('month_streak');
        }

        if (currentStreak >= 100 && !this.achievements.hundred_days.unlocked) {
            this.unlockAchievement('hundred_days');
            newUnlocked.push('hundred_days');
        }

        // 检查金币成就
        if (totalCoins >= 1000 && !this.achievements.thousand_coins.unlocked) {
            this.unlockAchievement('thousand_coins');
            newUnlocked.push('thousand_coins');
        }

        if (totalCoins >= 10000 && !this.achievements.ten_thousand.unlocked) {
            this.unlockAchievement('ten_thousand');
            newUnlocked.push('ten_thousand');
        }

        if (totalCoins >= 20000 && !this.achievements.twenty_thousand.unlocked) {
            this.unlockAchievement('twenty_thousand');
            newUnlocked.push('twenty_thousand');
        }

        if (totalCoins >= 30000 && !this.achievements.thirty_thousand.unlocked) {
            this.unlockAchievement('thirty_thousand');
            newUnlocked.push('thirty_thousand');
        }

        if (totalCoins >= 40000 && !this.achievements.forty_thousand.unlocked) {
            this.unlockAchievement('forty_thousand');
            newUnlocked.push('forty_thousand');
        }

        if (totalCoins >= 50000 && !this.achievements.fifty_thousand.unlocked) {
            this.unlockAchievement('fifty_thousand');
            newUnlocked.push('fifty_thousand');
        }

        // 显示成就解锁提示
        if (newUnlocked.length > 0) {
            setTimeout(() => {
                newUnlocked.forEach(achievementId => {
                    this.showAchievementUnlock(achievementId);
                });
            }, 500);
        }
    }

    calculateCurrentStreak() {
        if (this.coinData.length === 0) return 0;

        let streak = 1;
        const today = new Date().toISOString().split('T')[0];

        for (let i = this.coinData.length - 1; i > 0; i--) {
            const currentDate = new Date(this.coinData[i].date);
            const prevDate = new Date(this.coinData[i - 1].date);
            const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    unlockAchievement(achievementId) {
        this.achievements[achievementId] = {
            unlocked: true,
            unlockedDate: new Date().toISOString()
        };
        this.saveAchievements();
    }

    showAchievementUnlock(achievementId) {
        const achievementNames = {
            first_record: '首次记录',
            week_streak: '坚持7天',
            month_streak: '坚持30天',
            hundred_days: '百日坚持',
            thousand_coins: '千金富翁',
            ten_thousand: '万元户',
            twenty_thousand: '两万富翁',
            thirty_thousand: '三万富翁',
            forty_thousand: '四万富翁',
            fifty_thousand: '五万富翁'
        };

        // 创建成就解锁动画元素
        this.createAchievementUnlockAnimation(achievementNames[achievementId]);

        // 显示提示消息
        setTimeout(() => {
            this.showMessage(`🎉 成就解锁：${achievementNames[achievementId]}！`, 'success');
        }, 500);
    }

    createAchievementUnlockAnimation(achievementName) {
        const animationContainer = document.createElement('div');
        animationContainer.className = 'achievement-animation';
        animationContainer.innerHTML = `
            <div class="achievement-popup">
                <div class="achievement-icon-large">🏆</div>
                <div class="achievement-text">
                    <div class="achievement-title">成就解锁！</div>
                    <div class="achievement-name">${achievementName}</div>
                </div>
                <div class="achievement-particles">
                    <span class="particle">✨</span>
                    <span class="particle">🎉</span>
                    <span class="particle">⭐</span>
                    <span class="particle">💫</span>
                </div>
            </div>
        `;

        document.body.appendChild(animationContainer);

        // 触发动画
        setTimeout(() => {
            animationContainer.classList.add('show');
        }, 100);

        // 移除动画元素
        setTimeout(() => {
            animationContainer.classList.add('hide');
            setTimeout(() => {
                if (animationContainer.parentNode) {
                    animationContainer.parentNode.removeChild(animationContainer);
                }
            }, 500);
        }, 3000);
    }

    updateAchievements() {
        Object.keys(this.achievements).forEach(achievementId => {
            const statusElement = document.getElementById(`${achievementId}_status`);
            const achievementElement = document.querySelector(`[data-achievement="${achievementId}"]`);

            if (statusElement && achievementElement) {
                if (this.achievements[achievementId].unlocked) {
                    statusElement.textContent = '🏆';
                    statusElement.classList.add('unlocked');
                    achievementElement.classList.add('unlocked');

                    // 添加点击事件查看获取时间
                    achievementElement.style.cursor = 'pointer';
                    achievementElement.title = `点击查看获取时间`;
                    achievementElement.onclick = () => this.showAchievementDetails(achievementId);
                } else {
                    statusElement.textContent = '🔒';
                    achievementElement.classList.remove('unlocked');
                    achievementElement.style.cursor = 'default';
                    achievementElement.onclick = null;
                }
            }
        });
    }

    // 显示成就详情弹窗
    showAchievementDetails(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || !achievement.unlocked) return;

        const achievementNames = {
            first_record: '首次记录',
            week_streak: '坚持7天',
            month_streak: '坚持30天',
            hundred_days: '百日坚持',
            thousand_coins: '千金富翁',
            ten_thousand: '万元户',
            twenty_thousand: '两万富翁',
            thirty_thousand: '三万富翁',
            forty_thousand: '四万富翁',
            fifty_thousand: '五万富翁'
        };

        const unlockDate = new Date(achievement.unlockedDate);
        const formattedDate = unlockDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        this.createAchievementModal(achievementNames[achievementId], formattedDate);
    }

    // 创建成就详情弹窗
    createAchievementModal(achievementName, unlockDate) {
        // 如果弹窗已存在，先移除
        const existingModal = document.querySelector('.achievement-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'achievement-modal';
        modal.innerHTML = `
            <div class="achievement-modal-backdrop">
                <div class="achievement-modal-content">
                    <button class="achievement-modal-close">&times;</button>
                    <div class="achievement-modal-icon">🏆</div>
                    <div class="achievement-modal-title">成就详情</div>
                    <div class="achievement-modal-name">${achievementName}</div>
                    <div class="achievement-modal-date">📅 获取时间：${unlockDate}</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加事件监听器
        const closeBtn = modal.querySelector('.achievement-modal-close');
        const backdrop = modal.querySelector('.achievement-modal-backdrop');

        closeBtn.onclick = () => this.closeAchievementModal();
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                this.closeAchievementModal();
            }
        };

        // 触发动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    // 关闭成就弹窗
    closeAchievementModal() {
        const modal = document.querySelector('.achievement-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
}

// GitHub API客户端类 - 安全的跨设备登录系统
class GitHubStorage {
    constructor() {
        this.baseURL = 'https://api.github.com';

        // 从多种来源加载GitHub凭据
        this.loadGitHubCredentials();
    }

    // 加载GitHub凭据（支持多种来源）
    loadGitHubCredentials() {
        // 来源1: 本地配置文件（优先级最高，不会被推送到Git）
        if (typeof window.GITHUB_CONFIG_LOCAL !== 'undefined') {
            this.token = window.GITHUB_CONFIG_LOCAL.GITHUB_TOKEN;
            this.repoOwner = window.GITHUB_CONFIG_LOCAL.GITHUB_USERNAME;
            this.repoName = window.GITHUB_CONFIG_LOCAL.REPO_NAME;
        }
        // 来源2: 公开配置文件（会被推送到Git，无敏感信息）
        else if (typeof window.GITHUB_CONFIG !== 'undefined') {
            this.token = window.GITHUB_CONFIG.GITHUB_TOKEN;
            this.repoOwner = window.GITHUB_CONFIG.GITHUB_USERNAME;
            this.repoName = window.GITHUB_CONFIG.REPO_NAME;
        }

        // 来源3: 环境变量（适用于服务器环境）
        if (!this.token && typeof process !== 'undefined' && process.env) {
            this.token = process.env.GITHUB_TOKEN;
        }

        // 来源4: URL参数（适用于测试环境）
        if (!this.token) {
            const urlParams = new URLSearchParams(window.location.search);
            this.token = urlParams.get('github_token');
        }

        // 来源5: 本地存储（适用于开发环境）
        if (!this.token) {
            try {
                const storedToken = localStorage.getItem('github_token');
                if (storedToken && storedToken !== 'null' && storedToken !== 'undefined') {
                    this.token = storedToken;
                }
            } catch (e) {
                // localStorage不可用，忽略
            }
        }

        // 设置默认值
        if (!this.repoOwner) this.repoOwner = 'zkxxkz2';
        if (!this.repoName) this.repoName = 'coin-recorder-data';

        // 令牌状态检查
        if (!this.token) {
            console.warn('GitHub令牌未配置，某些功能将被禁用。请在github-config.local.js中配置令牌或通过其他方式提供。');
        }

        this.dataFilePath = 'users_data.json'; // 统一数据文件路径
    }

    // 设置GitHub访问令牌
    setToken(token) {
        this.token = token;
        if (token) {
            try {
                localStorage.setItem('github_token', token);
            } catch (e) {
                console.warn('无法保存令牌到本地存储');
            }
        }
    }

    // 获取请求头
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }
        return headers;
    }

    // 从GitHub读取用户数据
    async loadUsersData() {
        try {
            const response = await fetch(
                `${this.baseURL}/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataFilePath}`,
                {
                    method: 'GET',
                    headers: this.getHeaders()
                }
            );

            if (response.ok) {
                const data = await response.json();
                // GitHub返回base64编码的内容，需要解码
                const decodedContent = atob(data.content);
                return JSON.parse(decodedContent);
            } else if (response.status === 404) {
                // 文件不存在，返回空对象
                return {};
            } else {
                throw new Error(`GitHub API错误: ${response.status}`);
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
            // 离线时返回空对象，使用本地存储
            return this.loadLocalFallback();
        }
    }

    // 保存用户数据到GitHub
    async saveUsersData(usersData) {
        try {
            // 先获取现有文件的SHA（用于更新）
            let sha = null;
            try {
                const existingResponse = await fetch(
                    `${this.baseURL}/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataFilePath}`,
                    { headers: this.getHeaders() }
                );
                if (existingResponse.ok) {
                    const existingData = await existingResponse.json();
                    sha = existingData.sha;
                }
            } catch (e) {
                // 文件不存在，这是正常的
            }

            // 准备提交数据
            const contentBase64 = btoa(JSON.stringify(usersData, null, 2));
            const commitData = {
                message: `更新用户数据 - ${new Date().toISOString()}`,
                content: contentBase64,
                branch: 'main'
            };

            if (sha) {
                commitData.sha = sha;
            }

            const response = await fetch(
                `${this.baseURL}/repos/${this.repoOwner}/${this.repoName}/contents/${this.dataFilePath}`,
                {
                    method: 'PUT',
                    headers: this.getHeaders(),
                    body: JSON.stringify(commitData)
                }
            );

            if (response.ok) {
                console.log('用户数据已保存到GitHub');
                return true;
            } else {
                throw new Error(`保存失败: ${response.status}`);
            }
        } catch (error) {
            console.error('保存用户数据失败:', error);
            // 保存失败时，使用本地存储作为fallback
            this.saveLocalFallback(usersData);
            return false;
        }
    }

    // 本地备用存储（网络错误时使用）
    loadLocalFallback() {
        try {
            const localData = localStorage.getItem('coinTrackerUsersData');
            return localData ? JSON.parse(localData) : {};
        } catch (error) {
            console.error('本地备用存储读取失败:', error);
            return {};
        }
    }

    // 保存到本地备用存储
    saveLocalFallback(usersData) {
        try {
            localStorage.setItem('coinTrackerUsersData', JSON.stringify(usersData));
            console.log('数据已保存到本地备用存储');
        } catch (error) {
            console.error('本地备用存储写入失败:', error);
        }
    }

    // 获取特定用户数据
    getUserData(usersData, username) {
        return usersData[username] || null;
    }

    // 保存特定用户数据
    async saveUserData(username, userData) {
        const usersData = await this.loadUsersData();
        usersData[username] = {
            ...userData,
            lastModified: new Date().toISOString()
        };
        return await this.saveUsersData(usersData);
    }

    // 检查用户是否存在
    async userExists(username) {
        const usersData = await this.loadUsersData();
        return usersData.hasOwnProperty(username);
    }
}

// 用户认证管理器 - 使用GitHub中心化存储
class UserAuthManager {
    constructor() {
        this.githubStorage = new GitHubStorage();
        this.currentUser = null;
        this.sessionToken = null;
        this.syncStatus = 'idle'; // idle, syncing, success, error
        this.lastSyncTime = null;
        this.offlineQueue = [];
        this.loadSession();
        this.setupNetworkDetection();
    }

    // 生成简单的密码哈希（用于演示，生产环境应使用更安全的哈希）
    hashPassword(password) {
        // 使用简单的base64编码作为哈希示例
        return btoa(password).slice(0, 16);
    }

    // 验证密码
    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    // 用户注册
    async register(username, password) {
        try {
            // 检查用户名是否已存在
            const exists = await this.githubStorage.userExists(username);
            if (exists) {
                throw new Error('用户名已存在');
            }

            // 创建新用户数据结构
            const newUser = {
                username: username,
                passwordHash: this.hashPassword(password),
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                coinData: [],
                streakData: {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastRecordDate: null,
                    todayCompleted: false
                },
                challengeData: {
                    target: 0,
                    startDate: null,
                    endDate: null,
                    currentProgress: 0,
                    completed: false,
                    completedDate: null
                },
                achievements: {
                    first_record: { unlocked: false, unlockedDate: null },
                    week_streak: { unlocked: false, unlockedDate: null },
                    month_streak: { unlocked: false, unlockedDate: null },
                    hundred_days: { unlocked: false, unlockedDate: null },
                    thousand_coins: { unlocked: false, unlockedDate: null },
                    ten_thousand: { unlocked: false, unlockedDate: null },
                    twenty_thousand: { unlocked: false, unlockedDate: null },
                    thirty_thousand: { unlocked: false, unlockedDate: null },
                    forty_thousand: { unlocked: false, unlockedDate: null },
                    fifty_thousand: { unlocked: false, unlockedDate: null }
                }
            };

            // 保存用户数据到GitHub
            const success = await this.githubStorage.saveUserData(username, newUser);
            if (success) {
                // 注册成功，自动登录
                await this.login(username, password);
                return { success: true, message: '注册成功！' };
            } else {
                throw new Error('注册失败，请稍后重试');
            }
        } catch (error) {
            console.error('注册失败:', error);
            return { success: false, message: error.message };
        }
    }

    // 用户登录
    async login(username, password) {
        try {
            // 从GitHub加载用户数据
            const usersData = await this.githubStorage.loadUsersData();
            const userData = usersData[username];

            if (!userData) {
                throw new Error('用户名不存在');
            }

            // 验证密码
            if (!this.verifyPassword(password, userData.passwordHash)) {
                throw new Error('密码错误');
            }

            // 更新最后登录时间
            userData.lastLoginAt = new Date().toISOString();

            // 保存更新后的用户数据
            await this.githubStorage.saveUserData(username, userData);

            // 设置当前用户会话
            this.currentUser = {
                username: username,
                data: userData
            };

            // 生成会话令牌
            this.sessionToken = Date.now().toString();

            // 保存会话到本地存储
            this.saveSession();

            console.log('登录成功:', username);
            return { success: true, message: '登录成功！' };

        } catch (error) {
            console.error('登录失败:', error);
            return { success: false, message: error.message };
        }
    }

    // 用户登出
    logout() {
        this.currentUser = null;
        this.sessionToken = null;
        localStorage.removeItem('coinTrackerSession');
        console.log('用户已登出');
    }

    // 检查是否已登录
    isLoggedIn() {
        return this.currentUser !== null && this.sessionToken !== null;
    }

    // 获取当前用户名
    getCurrentUsername() {
        return this.currentUser ? this.currentUser.username : null;
    }

    // 获取当前用户数据
    getCurrentUserData() {
        return this.currentUser ? this.currentUser.data : null;
    }

    // 保存会话到本地存储
    saveSession() {
        if (this.currentUser && this.sessionToken) {
            const sessionData = {
                username: this.currentUser.username,
                token: this.sessionToken,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('coinTrackerSession', JSON.stringify(sessionData));
        }
    }

    // 从本地存储加载会话
    loadSession() {
        try {
            const sessionData = localStorage.getItem('coinTrackerSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                // 验证会话是否过期（24小时）
                const loginTime = new Date(session.loginTime);
                const now = new Date();
                const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    this.sessionToken = session.token;
                } else {
                    localStorage.removeItem('coinTrackerSession');
                }
            }
        } catch (error) {
            console.error('加载会话失败:', error);
            localStorage.removeItem('coinTrackerSession');
        }
    }

    // 设置网络状态检测
    setupNetworkDetection() {
        window.addEventListener('online', () => {
            console.log('网络连接已恢复');
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            console.log('网络连接已断开');
            this.syncStatus = 'offline';
            this.updateSyncStatus();
        });
    }

    // 处理离线队列
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0 || !navigator.onLine) return;

        this.syncStatus = 'syncing';
        this.updateSyncStatus();

        for (const operation of this.offlineQueue) {
            try {
                await this.executeSyncOperation(operation);
            } catch (error) {
                console.error('离线队列处理失败:', error);
            }
        }

        this.offlineQueue = [];
        this.syncStatus = 'success';
        this.lastSyncTime = new Date();
        this.updateSyncStatus();
    }

    // 执行同步操作
    async executeSyncOperation(operation) {
        switch (operation.type) {
            case 'saveUserData':
                await this.githubStorage.saveUserData(operation.username, operation.data);
                break;
        }
    }

    // 获取同步状态
    getSyncStatus() {
        return {
            status: this.syncStatus,
            lastSync: this.lastSyncTime,
            queueLength: this.offlineQueue.length,
            isOnline: navigator.onLine
        };
    }

    // 更新同步状态显示
    updateSyncStatus() {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            const status = this.getSyncStatus();
            let statusText = '';
            let statusClass = '';

            switch (status.status) {
                case 'idle':
                    statusText = '已同步';
                    statusClass = 'status-idle';
                    break;
                case 'syncing':
                    statusText = '同步中...';
                    statusClass = 'status-syncing';
                    break;
                case 'success':
                    statusText = `最后同步: ${this.formatTime(status.lastSync)}`;
                    statusClass = 'status-success';
                    break;
                case 'error':
                    statusText = '同步失败';
                    statusClass = 'status-error';
                    break;
                case 'offline':
                    statusText = '离线模式';
                    statusClass = 'status-offline';
                    break;
            }

            statusElement.textContent = statusText;
            statusElement.className = `sync-status ${statusClass}`;
        }
    }

    // 格式化时间显示
    formatTime(date) {
        if (!date) return '从未';
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
        return new Date(date).toLocaleDateString('zh-CN');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.coinTracker = new CoinTracker();
});
