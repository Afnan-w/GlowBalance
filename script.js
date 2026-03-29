// GlowBalance - Accurate & Fast Budget Splitter with Dark Theme
class GlowBalance {
  constructor() {
    this.expenses = JSON.parse(localStorage.getItem('glowBalanceExpenses')) || [];
    // Sync people count from the UI immediately
    const peopleInput = document.getElementById('numPeople');
    this.people = peopleInput ? Math.max(1, parseInt(peopleInput.value) || 2) : 2;
    this.balances = {};
    this.searchTerm = '';
    this.chart = null;
    this.isDark = localStorage.getItem('darkTheme') === 'true';
    this.init();
  }

  init() {
    this.initTheme();
    this.attachEvents();
    this.updateBalances(); // Full accurate calc
    this.renderMembers();
    this.updateVisuals();
  }

  initTheme() {
    const html = document.documentElement;
    if (this.isDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      const toggleBtn = document.getElementById('themeToggle');
      if (toggleBtn) toggleBtn.textContent = '☀️';
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
      const toggleBtn = document.getElementById('themeToggle');
      if (toggleBtn) toggleBtn.textContent = '🌙';
    }
  }

  toggleDarkMode() {
    this.isDark = !this.isDark;
    localStorage.setItem('darkTheme', this.isDark);
    this.initTheme();
    // Update chart colors if chart exists
    if (this.chart) {
      this.updateChartColors();
    }
  }

  updateChartColors() {
    const lightColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];
    const darkColors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    const colors = document.documentElement.classList.contains('dark') ? darkColors : lightColors;
    this.chart.data.datasets[0].backgroundColor = colors;
    this.chart.update('none');
  }

  applyGlobalStyles() {
    // Removed - using CSS custom properties instead for theme support
  }

  attachEvents() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.onclick = () => this.toggleDarkMode();

    document.getElementById('addExpense').onclick = () => this.addExpense();
    document.getElementById('numPeople').onchange = (e) => {
      this.people = Math.max(1, parseInt(e.target.value) || 2);
      this.updateBalances(); // Full recalc - correct shares
      this.renderMembers();
      this.updateVisuals();
    };
    
    const searchInput = document.getElementById('expenseSearch');
    const clearBtn = document.querySelector('.clear-search-btn');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        if (clearBtn) clearBtn.style.display = this.searchTerm ? 'flex' : 'none';
        this.renderExpenses();
      };
    }
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (searchInput) {
          searchInput.value = '';
          this.searchTerm = '';
          clearBtn.style.display = 'none';
          searchInput.focus();
        }
        this.renderExpenses();
      };
    }

    document.getElementById('settleUp').onclick = () => this.settleUp();
  }

  addExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    const categoryInput = document.getElementById('expenseCategory');
    const name = nameInput.value.trim();
    const rawAmount = amountInput.value.trim().replace(/[^0-9.]/g, '');
    const amount = parseFloat(rawAmount) || 0;
    const category = categoryInput ? categoryInput.value : 'General';

    if (!name || amount <= 0 || isNaN(amount)) {
      alert('Please enter valid expense name and amount (numbers only).');
      amountInput.value = '';
      return;
    }

    const date = new Date().toLocaleString([], { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });

    this.expenses.push({ name, amount, date, category });
    localStorage.setItem('glowBalanceExpenses', JSON.stringify(this.expenses));
    
    nameInput.value = '';
    if (categoryInput) categoryInput.value = 'General';
    amountInput.value = '';

    this.updateBalances(); // Accurate update
    this.renderMembers();
    this.updateVisuals();
  }

  deleteExpense(index) {
    this.expenses.splice(index, 1);
    localStorage.setItem('glowBalanceExpenses', JSON.stringify(this.expenses));
    
    this.updateBalances();
    this.renderMembers();
    this.updateVisuals();
  }

  updateBalances() {
    this.balances = {};
    if (this.people <= 0) return;

    // Use cent-based math to avoid floating point errors
    const totalCents = Math.round(this.expenses.reduce((sum, exp) => sum + exp.amount, 0) * 100);
    
    // Base share per person in cents
    const baseShareCents = Math.floor(totalCents / this.people);
    // Remaining cents to distribute (the "Penny Gap")
    let extraCents = totalCents % this.people;

    for (let i = 1; i <= this.people; i++) {
      const personShare = (baseShareCents + (extraCents > 0 ? 1 : 0)) / 100;
      this.balances[`Person ${i}`] = personShare;
      extraCents--;
    }
  }

  renderMembers() {
    const container = document.getElementById('membersList');
    container.innerHTML = ''; // Clear
    for (let i = 1; i <= this.people; i++) {
      const personKey = `Person ${i}`;
      const balance = this.balances[personKey] || 0;
      const div = document.createElement('div');
      div.className = 'member';
      div.innerHTML = `
        <span>${personKey}</span>
        <span class="balance">$${balance.toFixed(2)}</span>
      `;
      container.appendChild(div);
    }
  }

  settleUp() {
    if (this.people === 0 || this.expenses.length === 0) {
      alert('No balances to settle.');
      return;
    }
    
    const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const perPerson = (total / this.people).toFixed(2);

    alert(
      `Settle Up Report:\n` +
      `------------------\n` +
      `Total Expenses: $${total.toFixed(2)}\n` +
      `Each person owes: $${perPerson}\n\n` +
      `Ready to reset?`
    );

    if (confirm('Reset all expenses and start new cycle?')) {
      this.reset();
    }
  }

  reset() {
    this.expenses = [];
    this.balances = {};
    localStorage.removeItem('glowBalanceExpenses');
    if (document.getElementById('expenseList')) document.getElementById('expenseList').innerHTML = '';
    document.getElementById('membersList').innerHTML = '';
    document.getElementById('energyBars').innerHTML = '';
    document.getElementById('tips').innerHTML = '';
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    document.getElementById('numPeople').value = 2;
    this.people = 2;
  }

  updateVisuals() {
    this.renderExpenses();
    if (Object.keys(this.balances).length === 0) return; // Guard

    this.updateChart();
    this.updateEnergyBars();
    this.generateTips();
  }

  renderExpenses() {
    const container = document.getElementById('expenseList');
    if (!container) return;
    
    const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const filteredExpenses = this.expenses.filter(exp => 
      exp.name.toLowerCase().includes(this.searchTerm) || 
      exp.category.toLowerCase().includes(this.searchTerm)
    );

    let content = '';
    if (this.expenses.length === 0) {
      content = '<p style="text-align:center; color:var(--color-text-muted); font-size:0.9rem; padding: 2rem;">No expenses yet. Add one above!</p>';
    } else {
      content = `<div class="expense-total-header">
        <span class="expense-total-label">Total Expenses</span>
        <span class="expense-total-value">$${total.toFixed(2)}</span>
      </div>`;
      if (filteredExpenses.length === 0 && this.searchTerm) {
        content += '<p style="text-align:center; color:var(--color-text-muted);">No expenses match your search.</p>';
      }
    }
    container.innerHTML = content;

    this.expenses.forEach((exp, index) => {
      const matchesSearch = exp.name.toLowerCase().includes(this.searchTerm) || 
                           (exp.category && exp.category.toLowerCase().includes(this.searchTerm));
      
      if (!matchesSearch) return;

      const item = document.createElement('div');
      item.className = 'expense-item';
      item.innerHTML = `
        <div class="expense-info">
          <div style="display: flex; align-items: center;">
            <span class="expense-name">${exp.name}</span>
            <span class="category-badge">${exp.category || 'General'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="expense-amount">$${exp.amount.toFixed(2)}</span>
            <span class="expense-date">• ${exp.date || 'Historical'}</span>
          </div>
        </div>
        <button class="delete-btn">Delete</button>
      `;
      item.querySelector('.delete-btn').onclick = () => {
        if (confirm(`Are you sure you want to delete "${exp.name}"?`)) {
          this.deleteExpense(index);
        }
      };
      container.appendChild(item);
    });
  }

  updateChart() {
    const canvas = document.getElementById('balanceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(this.balances);
    const data = Object.values(this.balances);

    const lightColors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'];
    const darkColors = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    const colors = document.documentElement.classList.contains('dark') ? darkColors : lightColors;

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.data.datasets[0].backgroundColor = colors;
      this.chart.update('active'); // Smooth but fast
    } else {
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: window.getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim(),
                padding: 20,
                usePointStyle: true
              }
            }
          },
          animation: { duration: 800 }
        }
      });
    }
  }

  updateEnergyBars() {
    const container = document.getElementById('energyBars');
    container.innerHTML = '';
    if (Object.keys(this.balances).length === 0) return;

    Object.entries(this.balances).forEach(([name, balance]) => {
      const div = document.createElement('div');
      div.className = 'balance-item';
      div.innerHTML = `<strong>${name}</strong><span>$${balance.toFixed(2)}</span>`;
      container.appendChild(div);
    });
  }

  generateTips() {
    const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avg = total / this.people;
    const container = document.getElementById('tips');

    const tips = [
      `📊 Total expenses: $${total.toFixed(2)}`,
      `👥 Per person share: $${avg.toFixed(2)}`,
      total === 0 ? 'Add your first expense!' : 
      (total < 100 ? 'Great start! Low spending.' : 
       total > 1000 ? 'High total - review big expenses.' : 'Balanced spending.')
    ];

    container.innerHTML = tips.map(tip => `<div class="tip">${tip}</div>`).join('');
  }
}

new GlowBalance();
