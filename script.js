// GlowBalance - Accurate & Fast Budget Splitter
class GlowBalance {
  constructor() {
    this.expenses = JSON.parse(localStorage.getItem('glowBalanceExpenses')) || [];
    // Sync people count from the UI immediately
    const peopleInput = document.getElementById('numPeople');
    this.people = peopleInput ? Math.max(1, parseInt(peopleInput.value) || 2) : 2;
    this.balances = {};
    this.searchTerm = '';
    this.chart = null;
    this.init();
  }

  init() {
    this.applyGlobalStyles();
    this.attachEvents();
    this.updateBalances(); // Full accurate calc
    this.renderMembers();
    this.updateVisuals();
  }

  applyGlobalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body {
        background-color: #f8fafc !important;
        color: #1e293b !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        padding: 20px;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
      }
      /* Container for the whole app */
      #app-container, .main-card {
        background: white;
        max-width: 500px;
        width: 100%;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 1px solid #cbd5e1;
      }
      h1, h2, h3 { color: #0f172a; margin-top: 0; font-weight: 800; letter-spacing: -0.025em; }
      label { 
        display: block; 
        font-size: 0.875rem; 
        font-weight: 600; 
        color: #475569; 
        margin-bottom: 6px; 
      }
      .total-badge {
        background: #f1f5f9;
        padding: 16px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 24px;
      }
      .input-group { margin-bottom: 20px; }
      
      input, select {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 14px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;
        color: #1e293b;
        background-color: #ffffff;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
      }
      button {
        width: 100%;
        cursor: pointer;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.2s;
        border: 1px solid transparent;
        margin-top: 10px;
      }
      #addExpense { background: #6366f1; color: white; }
      #addExpense:hover { background: #4f46e5; }
      #settleUp { background: white; border: 1px solid #e2e8f0; color: #475569; }
      #settleUp:hover { background: #f1f5f9; color: #1e293b; }
      
      #membersList {
        margin: 24px 0;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
      }
      .member {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.2s;
      }
      .member:hover { background: #f8fafc; }
      .balance { font-weight: 600; color: #0f172a; }
      
      .category-badge {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 99px;
        background: #f1f5f9;
        color: #64748b;
        font-weight: 700;
        text-transform: uppercase;
        margin-left: 8px;
        border: 1px solid #e2e8f0;
      }

      .energy-bar { background: #f1f5f9; border-radius: 99px; height: 8px; overflow: hidden; margin: 10px 0; }
      .energy-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #6366f1, #818cf8); transition: width 0.5s ease-out; }

      .tip { 
        background: white; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; 
        border: 1px solid #e2e8f0; border-left: 4px solid #6366f1; font-size: 0.9rem; color: #475569;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
    `;
    document.head.appendChild(style);
  }

  attachEvents() {
    document.getElementById('addExpense').onclick = () => this.addExpense();
    document.getElementById('numPeople').onchange = (e) => {
      this.people = Math.max(1, parseInt(e.target.value) || 2);
      this.updateBalances(); // Full recalc - correct shares
      this.renderMembers();
      this.updateVisuals();
    };
    
    const searchInput = document.getElementById('expenseSearch');
    if (searchInput) {
      const wrapper = document.createElement('div');
      wrapper.className = 'search-wrapper';
      searchInput.parentNode.insertBefore(wrapper, searchInput);
      wrapper.appendChild(searchInput);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'clear-search-btn';
      clearBtn.innerHTML = '✕';
      clearBtn.type = 'button';
      wrapper.appendChild(clearBtn);

      searchInput.oninput = (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        clearBtn.style.display = this.searchTerm ? 'flex' : 'none';
        this.renderExpenses();
      };

      clearBtn.onclick = () => {
        searchInput.value = '';
        this.searchTerm = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
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

    container.innerHTML = this.expenses.length === 0 ? 
      '<p style="text-align:center; color:#94a3b8; font-size:0.9rem;">No expenses yet.</p>' : 
      `<div class="expense-total-header">
        <span class="expense-total-label">Total Expenses</span>
        <span class="expense-total-value">$${total.toFixed(2)}</span>
      </div>`;

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
backgroundColor: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
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
                color: '#475569',
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
