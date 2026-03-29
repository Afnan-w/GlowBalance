// GlowBalance - Budget Splitter & Expense Visualizer
class GlowBalance {
  constructor() {
    this.expenses = JSON.parse(localStorage.getItem('glowBalanceExpenses')) || [];
    this.people = 2; // Default
    this.balances = {};
    this.chart = null;
    this.init();
  }

  init() {
    this.attachEvents();
    this.renderMembers();
    this.updateBalances();
    this.updateVisuals();
  }

  attachEvents() {
    document.getElementById('addExpense').addEventListener('click', () => this.addExpense());
    document.getElementById('numPeople').addEventListener('change', (e) => {
      this.people = parseInt(e.target.value) || 2;
      this.renderMembers();
      this.updateBalances();
    });
    document.getElementById('settleUp').addEventListener('click', () => this.settleUp());
  }

  addExpense() {
    const name = document.getElementById('expenseName').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    
    if (!name || amount <= 0) return;

    this.expenses.push({ name, amount });
    localStorage.setItem('glowBalanceExpenses', JSON.stringify(this.expenses));
    
    document.getElementById('expenseName').value = '';
    document.getElementById('expenseAmount').value = '';
    
    this.updateBalances();
  }

  updateBalances() {
    const share = 1 / this.people;
    this.balances = {};
    this.expenses.forEach(exp => {
      const personShare = exp.amount * share;
      for (let i = 1; i <= this.people; i++) {
        this.balances[`Person ${i}`] = (this.balances[`Person ${i}`] || 0) + personShare;
      }
    });
  }

  renderMembers() {
    const list = document.getElementById('membersList');
    list.innerHTML = '';
    for (let i = 1; i <= this.people; i++) {
      const div = document.createElement('div');
      div.className = 'member';
      div.innerHTML = `<span>Person ${i}</span><span>$${this.balances[`Person ${i}`]?.toFixed(2) || '0.00'}</span>`;
      list.appendChild(div);
    }
  }

  settleUp() {
    // Simple settlement: show who owes whom (fair split)
    const avgBalance = Object.values(this.balances).reduce((a, b) => a + b, 0) / this.people;
    let settlements = [];
    
    Object.entries(this.balances).forEach(([person, balance]) => {
      const diff = balance - avgBalance;
      if (Math.abs(diff) > 0.01) {
        settlements.push(`${person} ${diff > 0 ? 'owes' : 'is owed'} $${Math.abs(diff).toFixed(2)}`);
      }
    });
    
    if (settlements.length === 0) {
      alert('Perfectly balanced! ✨ No settlements needed.');
    } else {
      alert('Settlements:\n' + settlements.join('\n'));
    }
    
    // Reset for new cycle
    if (confirm('Start new balance cycle?')) {
      this.expenses = [];
      localStorage.removeItem('glowBalanceExpenses');
      this.updateBalances();
      this.updateVisuals();
    }
  }

  updateVisuals() {
    this.updateChart();
    this.updateEnergyBars();
    this.generateTips();
  }

  updateChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    
    if (this.chart) this.chart.destroy();
    
    const labels = Object.keys(this.balances);
    const data = Object.values(this.balances);
    
    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#ff00ff', '#00ffff', '#ffff00', '#ffaa00', '#00ff00'],
          borderWidth: 0,
          hoverOffset: 20
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#fff' }
          }
        },
        animation: {
          animateRotate: true,
          duration: 2000
        }
      }
    });
  }

  updateEnergyBars() {
    const container = document.getElementById('energyBars');
    container.innerHTML = '';
    
    const maxBalance = Math.max(...Object.values(this.balances), 1);
    
    Object.entries(this.balances).forEach(([name, balance]) => {
      const percent = (balance / maxBalance) * 100;
      const bar = document.createElement('div');
      bar.className = 'energy-bar';
      bar.innerHTML = `
        <div class="energy-fill" style="width: ${percent}%" data-name="${name}: $${balance.toFixed(2)}"></div>
      `;
      container.appendChild(bar);
    });
  }

  generateTips() {
    const totalExpenses = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgPerPerson = totalExpenses / this.people;
    const tipsContainer = document.getElementById('tips');
    
    const tips = [
      `Total spent: $${totalExpenses.toFixed(2)}. Nice job keeping it glowing! ✨`,
      `Average per person: $${avgPerPerson.toFixed(2)}. Fair vibes detected.`,
      totalExpenses > 500 ? `Whoa! GlowBalance alert: Consider a group treat this month.` : `This month, treat yourself to coffee because you saved on expenses! ☕`
    ];
    
    tipsContainer.innerHTML = tips.map(tip => `<div class="tip">${tip}</div>`).join('');
  }
}

// Initialize app
new GlowBalance();
