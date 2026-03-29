// GlowBalance - Optimized Budget Splitter & Expense Visualizer
class GlowBalance {
  constructor() {
    this.expenses = JSON.parse(localStorage.getItem('glowBalanceExpenses')) || [];
    this.people = 2;
    this.balances = {}; // { 'Person 1': total, ... }
    this.totalExpenses = 0;
    this.chart = null;
    this.init();
  }

  init() {
    this.attachEvents();
    // Initialize balances incrementally from stored expenses
    this.expenses.forEach(exp => this._addExpenseShare(exp.amount));
    this.renderMembers();
    this.updateVisuals();
  }

  attachEvents() {
    document.getElementById('addExpense').addEventListener('click', () => this.addExpense());
    document.getElementById('numPeople').addEventListener('input', (e) => { // Use input for real-time
      const newPeople = parseInt(e.target.value) || 2;
      if (newPeople !== this.people && newPeople >= 1 && newPeople <= 10) {
        this.setPeople(newPeople);
      }
    });
    document.getElementById('settleUp').addEventListener('click', () => this.settleUp());
  }

  addExpense() {
    const nameEl = document.getElementById('expenseName');
    const amountEl = document.getElementById('expenseAmount');
    const name = nameEl.value.trim();
    const amount = parseFloat(amountEl.value) || 0;

    if (!name || amount <= 0) return;

    // Incremental add - O(1) per person
    this._addExpenseShare(amount);
    this.expenses.push({ name, amount });
    
    // Fast localStorage with throttle-like behavior
    localStorage.setItem('glowBalanceExpenses', JSON.stringify(this.expenses));
    
    nameEl.value = '';
    amountEl.value = '';
    
    this.updateVisuals(); // Instant since incremental
  }

  _addExpenseShare(amount) {
    this.totalExpenses += amount;
    const share = amount / this.people;
    for (let i = 1; i <= this.people; i++) {
      const key = `Person ${i}`;
      this.balances[key] = (this.balances[key] || 0) + share;
    }
  }

  setPeople(newPeople) {
    if (newPeople === this.people) return;
    
    // Recalculate only when people change (rare)
    const oldBalances = { ...this.balances };
    this.people = newPeople;
    this.balances = {};
    const newShare = this.totalExpenses / this.people;
    for (let i = 1; i <= this.people; i++) {
      this.balances[`Person ${i}`] = newShare;
    }
    
    this.renderMembers();
    this.updateVisuals();
  }

  renderMembers() {
    const list = document.getElementById('membersList');
    list.innerHTML = '';
    for (let i = 1; i <= this.people; i++) {
      const div = document.createElement('div');
      div.className = 'member';
      const balance = this.balances[`Person ${i}`] || 0;
      div.innerHTML = `<span>Person ${i}</span><span>$${balance.toFixed(2)}</span>`;
      list.appendChild(div);
    }
  }

  settleUp() {
    const avg = this.totalExpenses / this.people;
    let settlements = [];
    
    for (let i = 1; i <= this.people; i++) {
      const person = `Person ${i}`;
      const balance = this.balances[person] || 0;
      const diff = balance - avg;
      if (Math.abs(diff) > 0.01) {
        settlements.push(`${person} ${diff > 0 ? 'owes' : 'is owed'} $${Math.abs(diff).toFixed(2)}`);
      }
    }
    
    if (settlements.length === 0) {
      alert('Perfectly balanced! No settlements needed.');
    } else {
      alert('Settlements:\n' + settlements.join('\n'));
    }
    
    if (confirm('Reset cycle?')) {
      this.reset();
    }
  }

  reset() {
    this.expenses = [];
    this.totalExpenses = 0;
    this.balances = {};
    localStorage.removeItem('glowBalanceExpenses');
    this.renderMembers();
    this.updateVisuals();
  }

  updateVisuals() {
    this._fastChartUpdate();
    this._fastEnergyBars();
    this._fastTips();
  }

  _fastChartUpdate() {
    const labels = Object.keys(this.balances);
    const data = Object.values(this.balances);

    if (!this.chart) {
      // Initial chart creation
      const ctx = document.getElementById('balanceChart').getContext('2d');
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'], borderWidth: 0, hoverOffset: 20 }] },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: '#e2e8f0' } } },
          animation: { duration: 500, animateRotate: true }
        }
      });
    } else {
      // Fast update - no destroy
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update('none'); // Instant update
    }
  }

  _fastEnergyBars() {
    const container = document.getElementById('energyBars');
    const maxBalance = Math.max(...Object.values(this.balances), 1);
    
    // Update existing or create - minimal DOM
    Object.entries(this.balances).forEach(([name, balance]) => {
      const percent = (balance / maxBalance) * 100;
      let bar = container.querySelector(`[data-name="${name}"]`);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'energy-bar';
        bar.dataset.name = name;
        container.appendChild(bar);
      }
      const fill = bar.querySelector('.energy-fill') || document.createElement('div');
      if (!fill.className) fill.className = 'energy-fill';
      fill.style.width = `${percent}%`;
      fill.dataset.name = `${name}: $${balance.toFixed(2)}`;
      if (!bar.contains(fill)) bar.appendChild(fill);
    });
  }

  _fastTips() {
    const tipsContainer = document.getElementById('tips');
    const avgPerPerson = this.totalExpenses / this.people;
    
    const tips = [
      `Total expenses: $${this.totalExpenses.toFixed(2)}`,
      `Avg per person: $${avgPerPerson.toFixed(2)}`,
      this.totalExpenses > 500 
        ? 'High spending: Consider group savings challenge.' 
        : `Balanced month! Saved enough for a small treat.`
    ];
    
    tipsContainer.innerHTML = tips.map(tip => `<div class="tip">${tip}</div>`).join('');
  }
}

// Initialize optimized app
new GlowBalance();
