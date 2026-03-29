// GlowBalance - Accurate & Fast Budget Splitter
class GlowBalance {
  constructor() {
    this.expenses = JSON.parse(localStorage.getItem('glowBalanceExpenses')) || [];
    this.people = 2;
    this.balances = {};
    this.chart = null;
    this.init();
  }

  init() {
    this.attachEvents();
    this.updateBalances(); // Full accurate calc
    this.renderMembers();
    this.updateVisuals();
  }

  attachEvents() {
    document.getElementById('addExpense').onclick = () => this.addExpense();
    document.getElementById('numPeople').onchange = (e) => {
      this.people = Math.max(1, parseInt(e.target.value) || 2);
      this.updateBalances(); // Full recalc - correct shares
      this.renderMembers();
      this.updateVisuals();
    };
    document.getElementById('settleUp').onclick = () => this.settleUp();
  }

  addExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name || amount <= 0 || isNaN(amount)) {
      alert('Please enter valid expense name and amount.');
      return;
    }

    this.expenses.push({ name, amount });
    localStorage.setItem('glowBalanceExpenses', JSON.stringify(this.expenses));
    
    nameInput.value = '';
    amountInput.value = '';

    this.updateBalances(); // Accurate update
    this.updateVisuals();
  }

  updateBalances() {
    this.balances = {};
    // Initialize all people balances to 0
    for (let i = 1; i <= this.people; i++) {
      this.balances[`Person ${i}`] = 0;
    }
    // Equal split every expense among current people
    this.expenses.forEach(exp => {
      const share = exp.amount / this.people;
      for (let i = 1; i <= this.people; i++) {
        this.balances[`Person ${i}`] += share;
      }
    });
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
    if (this.people === 0 || Object.keys(this.balances).length === 0) {
      alert('No balances to settle.');
      return;
    }
    
    // For equal split, all balances equal - check deviation
    const avgBalance = Object.values(this.balances)[0] || 0;
    let needsSettlement = false;
    let settlements = [];

    for (let i = 1; i <= this.people; i++) {
      const balance = this.balances[`Person ${i}`] || 0;
      const diff = Math.abs(balance - avgBalance);
      if (diff > 0.01) { // Floating point tolerance
        needsSettlement = true;
        settlements.push(`Person ${i}: $${balance.toFixed(2)} (diff $${diff.toFixed(2)})`);
      }
    }

    if (!needsSettlement) {
      alert('All perfectly balanced! ✅');
    } else {
      alert(`Balances not even:\n${settlements.join('\n')}\n\nReset to continue?`);
    }

    if (confirm('Reset all expenses and start new cycle?')) {
      this.reset();
    }
  }

  reset() {
    this.expenses = [];
    this.balances = {};
    localStorage.removeItem('glowBalanceExpenses');
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
    if (Object.keys(this.balances).length === 0) return; // Guard

    this.updateChart();
    this.updateEnergyBars();
    this.generateTips();
  }

  updateChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    const labels = Object.keys(this.balances);
    const data = Object.values(this.balances).map(b => parseFloat(b.toFixed(2)));

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = data;
      this.chart.update('active'); // Smooth but fast
    } else {
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'],
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
                color: '#e2e8f0',
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

    const values = Object.values(this.balances);
    const maxBalance = Math.max(...values, 1);

    Object.entries(this.balances).forEach(([name, balance]) => {
      const percent = (balance / maxBalance) * 100;
      const bar = document.createElement('div');
      bar.className = 'energy-bar';
      bar.innerHTML = `<div class="energy-fill" style="width: ${percent}%" data-name="${name}: $${balance.toFixed(2)}"></div>`;
      container.appendChild(bar);
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
