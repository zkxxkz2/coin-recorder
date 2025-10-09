// 金币记录器应用
class CoinTracker {
    constructor() {
        this.coinData = this.loadData();
        this.totalChart = null;
        this.dailyChart = null;
        this.currentTheme = this.loadTheme();
        this.achievements = this.loadAchievements();
        this.streakData = this.loadStreakData();
        this.challengeData = this.loadChallengeData();
        this.init();
    }

    // 获取北京时间日期字符串（YYYY-MM-DD格式）
    getBeijingDate() {
        // 使用Intl API获取准确的北京时间（推荐方法）
        const now = new Date();
        try {
            // 方法1：使用Intl.DateTimeFormat（最准确）
            const beijingDate = new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(now).replace(/\//g, '-');

            return beijingDate;
        } catch (error) {
            // 备用方法：手动计算（如果Intl不可用）
            console.warn('Intl API不可用，使用备用方法:', error);
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const beijingTime = new Date(utc + (8 * 60 * 60 * 1000));
            return beijingTime.toISOString().split('T')[0];
        }
    }

    // 获取昨天的北京时间日期字符串
    getBeijingYesterdayDate() {
        try {
            // 方法1：使用Intl API计算昨天的北京时间
            const now = new Date();
            const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 减去一天

            const yesterdayBeijingDate = new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(yesterday).replace(/\//g, '-');

            return yesterdayBeijingDate;
        } catch (error) {
            // 备用方法：手动计算昨天的北京时间
            console.warn('计算昨天日期时Intl API不可用，使用备用方法:', error);
            const today = this.getBeijingDate();
            const date = new Date(today + 'T00:00:00+08:00');
            date.setDate(date.getDate() - 1);
            return date.toISOString().split('T')[0];
        }
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

        // 挑战刷新按钮
        const refreshChallengeBtn = document.getElementById('refreshChallengeBtn');
        refreshChallengeBtn.addEventListener('click', () => {
            this.refreshChallengeDisplay();
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

        const today = this.getBeijingDate();
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
        this.updateChallengeDisplay();
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

        // 更新连击数据 - 修复：每天有记录就更新连击
        this.updateStreakForDate(date);

        this.saveData();
        this.saveStreakData();

        // 更新挑战显示
        this.updateChallengeDisplay();
    }

    // 获取昨天的日期字符串（北京时间）
    getYesterdayDate() {
        return this.getBeijingYesterdayDate();
    }

    // 更新指定日期的连击数据
    updateStreakForDate(date) {
        const today = this.getBeijingDate();

        // 如果是今天的记录
        if (date === today) {
            this.streakData.todayCompleted = true;
        }

        // 计算连击逻辑
        if (this.streakData.lastRecordDate === null) {
            // 第一次记录
            this.streakData.currentStreak = 1;
        } else {
            // 检查是否是连续的一天
            const lastRecordDate = new Date(this.streakData.lastRecordDate + 'T00:00:00+08:00');
            const currentRecordDate = new Date(date + 'T00:00:00+08:00');
            const dayDiff = Math.floor((currentRecordDate - lastRecordDate) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                // 连续的一天，连击+1
                this.streakData.currentStreak += 1;
            } else if (dayDiff > 1) {
                // 不连续，重置连击
                this.streakData.currentStreak = 1;
            }
            // dayDiff === 0 表示同一天，不改变连击
        }

        this.streakData.lastRecordDate = date;

        // 更新最长连击
        if (this.streakData.currentStreak > this.streakData.longestStreak) {
            this.streakData.longestStreak = this.streakData.currentStreak;
        }
    }

    // 更新今天的记录
    updateTodayRecord(coins, note) {
        const lastRecord = this.coinData[this.coinData.length - 1];
        const today = this.getBeijingDate();

        // 如果是第一条记录，差值为0；否则计算与前一天的差值
        const previousCoins = this.coinData.length > 1 ? this.coinData[this.coinData.length - 2].coins : 0;
        lastRecord.coins = coins;
        lastRecord.difference = this.coinData.length > 1 ? coins - previousCoins : 0;
        lastRecord.note = note;
        lastRecord.timestamp = Date.now();

        // 更新连击数据（如果是今天的记录）
        if (lastRecord.date === today) {
            this.updateStreakForDate(today);
        }

        this.saveData();
        this.saveStreakData();

        // 更新挑战显示
        this.updateChallengeDisplay();
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
            // 使用Intl API确保周起始日期是北京时间
            let weekKey;
            try {
                weekKey = new Intl.DateTimeFormat('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(weekStart).replace(/\//g, '-');
            } catch (error) {
                // 备用方法
                const beijingWeekStart = new Date(weekStart.getTime() + (8 * 60 * 60 * 1000));
                weekKey = beijingWeekStart.toISOString().split('T')[0];
            }

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
            // 确保正确处理时区，北京时间日期字符串 + 北京时区标识
            const date = new Date(record.date + 'T00:00:00+08:00');
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
            link.setAttribute('download', `金币记录_${this.getBeijingDate()}.csv`);
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
        this.updateChallengeDisplay();
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
        this.updateChallengeDisplay();
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
        const today = this.getBeijingDate();

        // 检查是否跨天
        if (this.streakData.lastRecordDate !== null && this.streakData.lastRecordDate !== today) {
            const yesterdayStr = this.getBeijingYesterdayDate();

            // 检查昨天是否有记录
            const hasYesterdayRecord = this.coinData.some(record => record.date === yesterdayStr);

            if (!hasYesterdayRecord) {
                // 昨天没记录，说明连击中断，重置连击为0
                this.streakData.currentStreak = 0;
            }
            // 如果昨天有记录，连击保持不变，等今天记录时再更新

            // 重置今天的完成状态，为新的一天做准备
            this.streakData.todayCompleted = false;
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
        const yesterdayStr = this.getBeijingYesterdayDate();

        // 如果昨天没记录且今天还没记录且有历史记录，显示补签按钮
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
        const yesterdayStr = this.getBeijingYesterdayDate();

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
        this.updateChallengeDisplay();
        this.checkAchievements();

        this.showMessage('补签成功！连击已恢复', 'success');
    }

    // 挑战数据相关方法
    loadChallengeData() {
        try {
            const challengeData = localStorage.getItem('coinTrackerChallenge');
            if (challengeData) {
                const parsed = JSON.parse(challengeData);
                // 如果是单个对象，转换为数组格式
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    // 如果是旧的单个挑战格式，转换为数组
                    if (parsed.target > 0) {
                        return [{
                            id: 'legacy_' + Date.now(),
                            target: parsed.target,
                            startDate: parsed.startDate,
                            endDate: parsed.endDate,
                            currentProgress: parsed.currentProgress,
                            completed: parsed.completed,
                            completedDate: parsed.completedDate,
                            createdAt: parsed.startDate || new Date().toISOString()
                        }];
                    }
                }
                return parsed || [];
            }
            return this.getDefaultChallengeData();
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
        return []; // 改为数组，存储多个挑战
    }

    // 创建新挑战
    createChallenge(target, endDate = null) {
        const today = new Date();
        const challenge = {
            id: Date.now().toString(), // 唯一ID
            target: target,
            startDate: today.toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : null,
            currentProgress: this.calculateTotal(),
            completed: false,
            completedDate: null,
            createdAt: today.toISOString()
        };

        this.challengeData.push(challenge);
        return challenge.id;
    }

    // 删除挑战
    deleteChallenge(challengeId) {
        const index = this.challengeData.findIndex(c => c.id === challengeId);
        if (index !== -1) {
            this.challengeData.splice(index, 1);
            return true;
        }
        return false;
    }

    // 获取挑战
    getChallenge(challengeId) {
        return this.challengeData.find(c => c.id === challengeId);
    }

    // 获取所有活跃挑战（未完成或最近完成）
    getActiveChallenges() {
        return this.challengeData.filter(challenge => {
            // 如果挑战有截止日期且已过期但未完成，则视为非活跃
            if (challenge.endDate && !challenge.completed) {
                const endDate = new Date(challenge.endDate);
                return endDate >= new Date(); // 只返回未过期或已完成的挑战
            }
            return true; // 无截止日期的挑战始终活跃
        });
    }

    updateChallengeDisplay() {
        const challengeContainer = document.querySelector('.challenge-container');
        const activeChallenges = this.getActiveChallenges();

        if (activeChallenges.length > 0) {
            // 有挑战 - 显示所有挑战
            this.renderMultipleChallenges(activeChallenges);
        } else {
            // 没有挑战 - 显示空状态
            this.renderNoChallenge();
        }

        this.saveChallengeData();
    }

    // 渲染单个挑战卡片
    renderChallengeCard(challenge) {
        const percentage = Math.min((challenge.currentProgress / challenge.target) * 100, 100);
        const isCompleted = percentage >= 100;
        const isExpired = challenge.endDate && new Date(challenge.endDate) < new Date() && !isCompleted;

        return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''} ${isExpired ? 'expired' : ''}" data-challenge-id="${challenge.id}">
                <div class="challenge-card-header">
                    <h4 class="challenge-card-title">
                        🎯 目标 ${challenge.target} 金币
                        ${isCompleted ? ' ✅' : ''}
                        ${isExpired ? ' ⏰' : ''}
                    </h4>
                    <div class="challenge-card-actions">
                        <button class="challenge-btn small refresh-btn challenge-refresh-btn" data-challenge-id="${challenge.id}" title="刷新进度">🔄</button>
                        <button class="challenge-btn small delete-btn challenge-delete-btn" data-challenge-id="${challenge.id}" title="删除挑战">🗑️</button>
                    </div>
                </div>
                <div class="challenge-card-content">
                    <div class="challenge-card-progress">
                        <div class="challenge-card-detail">
                            <span class="challenge-card-label">当前进度：</span>
                            <span class="challenge-card-value">${challenge.currentProgress} / ${challenge.target}</span>
                        </div>
                        <div class="challenge-card-detail">
                            <span class="challenge-card-label">完成百分比：</span>
                            <span class="challenge-card-value">${percentage.toFixed(1)}%</span>
                        </div>
                        ${challenge.endDate ? `
                            <div class="challenge-card-detail">
                                <span class="challenge-card-label">截止日期：</span>
                                <span class="challenge-card-value">${new Date(challenge.endDate).toLocaleDateString('zh-CN')}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="challenge-card-progress-bar">
                        <div class="challenge-card-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染多个挑战
    renderMultipleChallenges(challenges) {
        const container = document.querySelector('.challenge-container');
        container.innerHTML = `
            <div class="challenge-header">
                <h3>我的挑战</h3>
                <div class="challenge-controls">
                    <button id="refreshAllChallengesBtn" class="challenge-btn refresh-btn" title="刷新所有挑战进度">🔄 刷新全部</button>
                    <button id="addChallengeBtn" class="challenge-btn">➕ 新建挑战</button>
                </div>
            </div>
            <div class="challenges-grid" id="challengesGrid">
                ${challenges.map(challenge => this.renderChallengeCard(challenge)).join('')}
            </div>
        `;

        // 绑定事件
        document.getElementById('addChallengeBtn').addEventListener('click', () => {
            this.showChallengeModal();
        });

        document.getElementById('refreshAllChallengesBtn').addEventListener('click', () => {
            this.refreshAllChallengeProgress();
        });

        // 绑定挑战卡片的事件处理器
        challenges.forEach(challenge => {
            const refreshBtn = container.querySelector(`.challenge-refresh-btn[data-challenge-id="${challenge.id}"]`);
            const deleteBtn = container.querySelector(`.challenge-delete-btn[data-challenge-id="${challenge.id}"]`);

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.refreshChallengeProgress(challenge.id);
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm('确定要删除这个挑战吗？')) {
                        this.deleteChallenge(challenge.id);
                        this.updateChallengeDisplay();
                        this.showMessage('挑战已删除！', 'success');
                    }
                });
            }
        });
    }

    // 渲染无挑战状态
    renderNoChallenge() {
        const container = document.querySelector('.challenge-container');
        container.innerHTML = `
            <div class="no-challenge-state">
                <div class="no-challenge-icon">🎯</div>
                <h3>还没有设定挑战</h3>
                <p>快来设定一个攒钱目标吧！</p>
                <button id="setChallengeBtn" class="challenge-btn primary">设定挑战</button>
            </div>
        `;

        // 绑定事件
        document.getElementById('setChallengeBtn').addEventListener('click', () => {
            this.showChallengeModal();
        });
    }

    // 刷新单个挑战进度
    refreshChallengeProgress(challengeId) {
        const challenge = this.getChallenge(challengeId);
        if (challenge) {
            challenge.currentProgress = this.calculateTotal();
            this.checkChallengeCompletion(challenge);
            this.updateChallengeDisplay();
            this.showMessage('挑战进度已刷新！', 'success');
        }
    }

    // 刷新所有挑战进度
    refreshAllChallengeProgress() {
        this.challengeData.forEach(challenge => {
            challenge.currentProgress = this.calculateTotal();
            this.checkChallengeCompletion(challenge);
        });
        this.updateChallengeDisplay();
        this.showMessage('所有挑战进度已刷新！', 'success');
    }

    // 检查挑战完成状态
    checkChallengeCompletion(challenge) {
        if (!challenge.completed && challenge.currentProgress >= challenge.target) {
            challenge.completed = true;
            challenge.completedDate = new Date().toISOString();
        }
    }

    showChallengeModal(challengeId = null) {
        const isEditing = challengeId !== null;
        const challenge = isEditing ? this.getChallenge(challengeId) : null;

        const modal = document.createElement('div');
        modal.className = 'challenge-modal';

        // 构建HTML内容
        let modalHTML = `
            <div class="challenge-modal-backdrop">
                <div class="challenge-modal-content">
                    <button class="challenge-modal-close">&times;</button>
                    <div class="challenge-modal-icon">🎯</div>
                    <div class="challenge-modal-title">${isEditing ? '编辑挑战' : '设定新挑战'}</div>
                    <div class="challenge-modal-form">
                        <div class="challenge-form-group">
                            <label for="challengeTargetInput">目标金币数量：</label>
                            <input type="number" id="challengeTargetInput" min="100" step="100" placeholder="例如：1000" value="${challenge ? challenge.target : ''}">
                        </div>
                        <div class="challenge-form-group">
                            <label for="challengeEndDateInput">截止日期（可选）：</label>
                            <input type="date" id="challengeEndDateInput" value="${challenge && challenge.endDate ? new Date(challenge.endDate).toISOString().split('T')[0] : ''}">
                        </div>
        `;

        if (isEditing) {
            modalHTML += `
                        <div class="challenge-form-group">
                            <label>挑战进度：</label>
                            <div class="challenge-progress-preview">
                                <span>${challenge.currentProgress} / ${challenge.target}</span>
                                <span>(${(challenge.currentProgress / challenge.target * 100).toFixed(1)}%)</span>
                            </div>
                        </div>
            `;
        }

        modalHTML += `
                        <div class="challenge-form-actions">
                            <button id="cancelChallengeBtn" class="challenge-cancel-btn">取消</button>
                            <button id="confirmChallengeBtn" class="challenge-confirm-btn">${isEditing ? '更新' : '创建'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.innerHTML = modalHTML;
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
            const endDateInput = document.getElementById('challengeEndDateInput');
            const target = parseInt(targetInput.value);

            if (isNaN(target) || target < 100) {
                this.showMessage('请输入有效目标金币数量（至少100）', 'error');
                return;
            }

            if (isEditing) {
                this.updateChallenge(challengeId, target, endDateInput.value);
            } else {
                this.createNewChallenge(target, endDateInput.value);
            }
            this.closeChallengeModal();
        };

        // 触发动画
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    // 创建新挑战
    createNewChallenge(target, endDate = null) {
        this.createChallenge(target, endDate);
        this.updateChallengeDisplay();
        this.showMessage(`🎯 新挑战设定成功！目标：${target}金币`, 'success');
    }

    // 更新挑战
    updateChallenge(challengeId, target, endDate = null) {
        const challenge = this.getChallenge(challengeId);
        if (challenge) {
            challenge.target = target;
            challenge.endDate = endDate ? new Date(endDate).toISOString() : null;
            challenge.currentProgress = this.calculateTotal(); // 刷新进度
            this.checkChallengeCompletion(challenge);
            this.updateChallengeDisplay();
            this.showMessage('挑战已更新！', 'success');
        }
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
            // 设置默认日期（北京时间）
            // 这里不需要重新计算，因为getBeijingDate()和getBeijingYesterdayDate()已经处理了时区

            document.getElementById('startDate').value = this.getBeijingYesterdayDate();
            document.getElementById('endDate').value = this.getBeijingDate();

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
            // 使用Intl API确保正确计算北京时间日期
            let dateStr;
            try {
                dateStr = new Intl.DateTimeFormat('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(currentDate).replace(/\//g, '-');
            } catch (error) {
                // 备用方法
                const beijingDate = new Date(currentDate.getTime() + (8 * 60 * 60 * 1000));
                dateStr = beijingDate.toISOString().split('T')[0];
            }

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
            // 使用Intl API确保正确计算北京时间日期
            let dateStr;
            try {
                dateStr = new Intl.DateTimeFormat('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(currentDate).replace(/\//g, '-');
            } catch (error) {
                // 备用方法
                const beijingDate = new Date(currentDate.getTime() + (8 * 60 * 60 * 1000));
                dateStr = beijingDate.toISOString().split('T')[0];
            }

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
            // 首次成就
            first_record: { unlocked: false, unlockedDate: null },

            // 连击成就
            week_streak: { unlocked: false, unlockedDate: null },
            month_streak: { unlocked: false, unlockedDate: null },
            hundred_days: { unlocked: false, unlockedDate: null },

            // 金币里程碑成就
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

        // 检查连击成就
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

        // 检查金币里程碑成就
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

    // 检查完美月（整个月每天都记录）
    checkPerfectMonth() {
        if (this.coinData.length < 28) return false; // 至少需要28天记录

        const monthlyStats = this.calculateMonthlyStats();
        for (const month of monthlyStats) {
            const monthStart = new Date(month.year, month.month - 1, 1);
            const monthEnd = new Date(month.year, month.month, 0);
            const daysInMonth = monthEnd.getDate();

            // 如果该月记录天数等于该月的总天数，且连续记录
            if (month.count === daysInMonth) {
                return true;
            }
        }
        return false;
    }

    // 检查无缺席周（连续7天记录）
    checkNoMissWeek() {
        return this.calculateCurrentStreak() >= 7;
    }

    // 检查王者归来（中断后重新开始并达到更高连击）
    checkComebackKing() {
        if (this.streakData.longestStreak < 7) return false;

        // 如果当前连击达到最长连击的1.5倍
        return this.streakData.currentStreak >= Math.floor(this.streakData.longestStreak * 1.5);
    }

    calculateCurrentStreak() {
        if (this.coinData.length === 0) return 0;

        let streak = 1;
        const today = this.getBeijingDate();

        for (let i = this.coinData.length - 1; i > 0; i--) {
            // 将日期字符串转换为日期对象，确保正确处理时区
            const currentDateStr = this.coinData[i].date + 'T00:00:00+08:00'; // 北京时间
            const prevDateStr = this.coinData[i - 1].date + 'T00:00:00+08:00'; // 北京时间

            const currentDate = new Date(currentDateStr);
            const prevDate = new Date(prevDateStr);
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
            unlockedDate: new Date().toISOString() // 虽然是UTC时间，但对于成就解锁时间来说影响不大
        };
        this.saveAchievements();
    }

    showAchievementUnlock(achievementId) {
        const achievementNames = {
            // 首次成就
            first_record: '首次记录',

            // 连击成就
            week_streak: '坚持7天',
            month_streak: '坚持30天',
            hundred_days: '百日坚持',

            // 金币里程碑成就
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
            // 首次成就
            first_record: '首次记录',

            // 连击成就
            week_streak: '坚持7天',
            month_streak: '坚持30天',
            hundred_days: '百日坚持',

            // 金币里程碑成就
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

// 触摸设备优化
function optimizeForTouchDevices() {
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // 防止触摸滚动时触发缩放
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    });

    // 为触摸设备添加触摸反馈
    const buttons = document.querySelectorAll('button, .tab-btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });

    // 优化输入框体验
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            // 滚动到可视区域（移动端优化）
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 优化触摸设备体验
    optimizeForTouchDevices();

    window.coinTracker = new CoinTracker();
});
