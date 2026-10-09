// ==========================================================================
// MAIN APPLICATION COORDINATOR & STASH MANAGER
// ==========================================================================

class StashManager {
  constructor(maxSlots = 8) {
    this.maxSlots = maxSlots;
    this.items = [];
    this.container = document.getElementById('stash-slots');
  }

  isFull() {
    return this.items.length >= this.maxSlots;
  }

  addItem(item) {
    if (this.isFull()) {
      alert('O Baú de Reserva está lotado! Libere espaço antes de abrir novos itens.');
      return false;
    }
    item.row = null;
    item.col = null;
    this.items.push(item);
    this.renderStash();
    return true;
  }

  removeItem(itemId) {
    const idx = this.items.findIndex(it => it.id === itemId);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
    this.renderStash();
  }

  renderStash() {
    if (!this.container) return;
    this.container.innerHTML = '';

    for (let i = 0; i < this.maxSlots; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'stash-slot';
      slotEl.dataset.slotIndex = i;

      const item = this.items[i];
      if (item) {
        slotEl.classList.add('has-item');
        const itemEl = document.createElement('div');
        itemEl.id = `stash-item-${item.id}`;
        itemEl.className = `inventory-item tier-${item.tier}`;
        itemEl.style.position = 'relative';
        itemEl.style.width = '100%';
        itemEl.style.height = '100%';

        itemEl.innerHTML = `
          <span class="item-level-tag">Nv.${item.level}</span>
          <div class="item-icon-wrapper">${item.svgString}</div>
          <span class="item-stat-tag">⚔️+${item.power}</span>
        `;

        window.dragDropController?.attachItemEvents(itemEl, item, 'stash');
        slotEl.appendChild(itemEl);
      }

      this.container.appendChild(slotEl);
    }
  }
}

class AppState {
  constructor() {
    this.gold = 150;
    this.expandCost = 50;
    this.chestCost = 50;
    this.chestLevel = 1;
    this.isMuted = false;
    this.battleSpeed = 1;

    this.currentTotalPower = 0;
    this.currentDps = 0;

    // Elements
    this.goldDisplay = document.getElementById('gold-display');
    this.goldPill = document.getElementById('gold-pill-container') || document.querySelector('.gold-pill');
    this.goldDeltaBubble = document.getElementById('gold-delta-bubble');
    this.powerDisplay = document.getElementById('total-power-display');
    this.dpsSubDisplay = document.getElementById('total-dps-sub');
    this.liveDpsDisplay = document.getElementById('live-dps-display');
    this.liveDpsBadge = document.querySelector('.live-dps-badge');

    this.bannerCurrentPower = document.getElementById('banner-current-power');
    this.bannerNextPower = document.getElementById('banner-next-power');
    this.expandBtn = document.getElementById('btn-expand-grid');
    this.expandCostDisplay = document.getElementById('expand-cost');

    // Chest & Economy elements
    this.chestBtn = document.getElementById('btn-spawn-item');
    this.chestCostDisplay = document.getElementById('chest-cost-display');
    this.chestLevelDisplay = document.getElementById('chest-level-display');
    this.nextDropCost = document.getElementById('next-drop-cost');

    this.updateUI();
  }

  addGold(amount) {
    if (amount <= 0) return;
    const oldGold = this.gold;
    this.gold += amount;
    this.animateNumber(this.goldDisplay, oldGold, this.gold);
    this.triggerGoldHighlight('gain', amount);
    this.updateUI();
  }

  spendGold(amount) {
    if (this.gold < amount) return false;
    const oldGold = this.gold;
    this.gold -= amount;
    this.animateNumber(this.goldDisplay, oldGold, this.gold);
    this.triggerGoldHighlight('spend', amount);
    this.updateUI();
    return true;
  }

  triggerGoldHighlight(type, amount) {
    if (!this.goldPill) return;

    this.goldPill.classList.remove('gold-gain-pulse', 'gold-spend-pulse', 'gold-shortage-shake');
    void this.goldPill.offsetWidth; // Reflow

    if (type === 'gain') {
      this.goldPill.classList.add('gold-gain-pulse');
      if (this.goldDeltaBubble) {
        this.goldDeltaBubble.textContent = `+${amount} 🪙`;
        this.goldDeltaBubble.className = 'gold-delta-bubble float-gain';
      }
    } else if (type === 'spend') {
      this.goldPill.classList.add('gold-spend-pulse');
      if (this.goldDeltaBubble) {
        this.goldDeltaBubble.textContent = `-${amount} 🪙`;
        this.goldDeltaBubble.className = 'gold-delta-bubble float-spend';
      }
    }
  }

  triggerGoldShortage() {
    if (!this.goldPill) return;
    this.goldPill.classList.remove('gold-gain-pulse', 'gold-spend-pulse', 'gold-shortage-shake');
    void this.goldPill.offsetWidth;
    this.goldPill.classList.add('gold-shortage-shake');
    window.sound?.playError();
  }

  updateUI() {
    if (this.goldDisplay) this.goldDisplay.textContent = this.gold;
    if (this.expandCostDisplay) this.expandCostDisplay.textContent = this.expandCost;
    if (this.chestCostDisplay) this.chestCostDisplay.textContent = this.chestCost;
    if (this.nextDropCost) this.nextDropCost.textContent = this.chestCost;
    if (this.chestLevelDisplay) this.chestLevelDisplay.textContent = this.chestLevel;

    if (this.expandBtn) {
      this.expandBtn.disabled = this.gold < this.expandCost;
    }
    if (this.chestBtn) {
      this.chestBtn.disabled = this.gold < this.chestCost;
    }
  }

  // Smooth number interpolation animation for real-time feel
  animateNumber(el, start, end, suffix = '', duration = 350) {
    if (!el) return;
    if (start === end) {
      el.textContent = `${end}${suffix}`;
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const eased = 1 - (1 - progress) * (1 - progress);
      const val = Math.round(start + (end - start) * eased);
      el.textContent = `${val}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = `${end}${suffix}`;
      }
    };
    requestAnimationFrame(step);
  }

  // Real-time Power & DPS Calculator
  updateCombatAndStats() {
    window.combatArena?.calculateHeroStats();
    const totalPower = window.backpackGrid?.calculateTotalPower() || 0;
    const heroIntervalSec = (window.combatArena?.heroAttackInterval || 850) / 1000;
    const currentDps = Math.round(totalPower / heroIntervalSec);

    const oldPower = this.currentTotalPower;
    this.currentTotalPower = totalPower;
    this.currentDps = currentDps;

    // Pulse animation if power increased
    if (totalPower > oldPower && this.liveDpsBadge) {
      this.liveDpsBadge.classList.remove('pulse-gain');
      void this.liveDpsBadge.offsetWidth; // trigger reflow
      this.liveDpsBadge.classList.add('pulse-gain');
    }

    // Animate UI indicators
    this.animateNumber(this.powerDisplay, oldPower, totalPower);
    this.animateNumber(this.dpsSubDisplay, oldPower, currentDps, ' DPS');
    this.animateNumber(this.liveDpsDisplay, oldPower, currentDps);
    this.animateNumber(this.bannerCurrentPower, oldPower, totalPower);

    if (this.bannerNextPower) {
      const nextPowerEst = totalPower + 240;
      this.animateNumber(this.bannerNextPower, oldPower + 240, nextPowerEst);
    }

    this.updateUI();
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State and Grid
  window.appState = new AppState();
  window.backpackGrid = new BackpackGrid(12, 12);
  window.backpackGrid.buildDOM();

  // 2. Initialize Stash and Drag & Drop
  window.stashManager = new StashManager(8);
  window.dragDropController = new DragDropController(window.backpackGrid);

  // 3. Initialize Top Battle Arena
  window.combatArena = new CombatArena('battle-canvas');

  // 4. Initial Items (Pre-populate with 2 identical Lv.1 Axes ready for merge!)
  const axe1 = createItem('axe', 1);
  const axe2 = createItem('axe', 1);
  const dagger1 = createItem('sword', 1);
  const dagger2 = createItem('sword', 1);
  const potion = createItem('potion', 1);
  const shield = createItem('shield', 1);

  // Place items in grid:
  // axe1 at (4, 4) and axe2 at (4, 6) in the center of the unlocked 6x6 area
  window.backpackGrid.placeItem(axe1, 4, 4);
  window.backpackGrid.placeItem(axe2, 4, 6);
  window.backpackGrid.placeItem(dagger1, 5, 4);
  window.backpackGrid.placeItem(potion, 6, 5);

  // Place in stash:
  window.stashManager.addItem(dagger2);
  window.stashManager.addItem(shield);

  // Preview initial recipe in the merge hint banner
  window.dragDropController.previewItemInBanner(axe1);

  // Initial stats calculation
  window.appState.updateCombatAndStats();

  // 5. Button Event Handlers
  // Spawn New Item from Chest (Paid: 50 Gold)
  const spawnChestBtn = document.getElementById('btn-spawn-item');
  spawnChestBtn?.addEventListener('click', () => {
    if (window.appState.gold < window.appState.chestCost) {
      window.appState.triggerGoldShortage();
      spawnChestBtn.classList.add('btn-shake');
      setTimeout(() => spawnChestBtn.classList.remove('btn-shake'), 400);
      alert(`Você precisa de ${window.appState.chestCost} moedas de ouro para abrir o equipamento!`);
      return;
    }

    if (window.stashManager.isFull()) {
      window.sound?.playError();
      alert('O Baú de Reserva está lotado! Libere espaço antes de abrir novos itens.');
      return;
    }

    const paid = window.appState.spendGold(window.appState.chestCost);
    if (!paid) return;

    const types = ['axe', 'sword', 'bow', 'shield', 'potion', 'helmet'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const newItem = createItem(chosenType, 1);

    if (window.stashManager.addItem(newItem)) {
      window.sound?.playChest();
      window.sound?.playCoin();
    }
  });

  // Expand Grid with Gold
  document.getElementById('btn-expand-grid')?.addEventListener('click', () => {
    if (window.appState.gold >= window.appState.expandCost) {
      const success = window.backpackGrid.expandGrid();
      if (success) {
        window.appState.spendGold(window.appState.expandCost);
        window.appState.expandCost = Math.round(window.appState.expandCost * 1.4);
        window.appState.updateUI();
      } else {
        alert('Todas as células do grid 12x12 já foram desbloqueadas!');
      }
    } else {
      window.appState.triggerGoldShortage();
      alert(`Você precisa de ${window.appState.expandCost} moedas de ouro para expandir a mochila!`);
    }
  });

  // Unlock All 144 Cells Toggle
  const unlockAllBtn = document.getElementById('btn-unlock-all');
  const unlockAllText = document.getElementById('unlock-all-text');
  unlockAllBtn?.addEventListener('click', () => {
    const isAll = window.backpackGrid.toggleUnlockAll();
    if (unlockAllText) {
      unlockAllText.textContent = isAll ? 'Restaurar 6x6' : 'Grid 12x12 Total';
    }
    window.appState.updateCombatAndStats();
  });

  // Rotate Item Button
  document.getElementById('btn-rotate-item')?.addEventListener('click', () => {
    window.dragDropController.rotateHeldItem();
  });

  // Clear Backpack
  document.getElementById('btn-clear-bag')?.addEventListener('click', () => {
    if (confirm('Deseja limpar todos os itens da mochila para o baú?')) {
      const itemsToEvict = [...window.backpackGrid.items];
      itemsToEvict.forEach(it => {
        window.backpackGrid.removeItem(it.id);
        window.stashManager.addItem(it);
      });
      window.appState.updateCombatAndStats();
    }
  });

  // Audio Toggle
  const audioBtn = document.getElementById('btn-audio-toggle');
  audioBtn?.addEventListener('click', () => {
    const isEnabled = window.sound.toggle();
    audioBtn.textContent = isEnabled ? '🔊' : '🔇';
  });

  // Battle Speed Toggle
  const speedBtn = document.getElementById('btn-speed-toggle');
  let currentSpeed = 1;
  speedBtn?.addEventListener('click', () => {
    currentSpeed = currentSpeed === 1 ? 2 : 1;
    speedBtn.textContent = `${currentSpeed}x ⏩`;
    window.combatArena?.setSpeed(currentSpeed);
  });

  // Help Modal Toggle
  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-fullscreen-toggle')?.addEventListener('click', () => {
    helpModal?.classList.remove('hidden');
  });
  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    helpModal?.classList.add('hidden');
  });
  document.getElementById('btn-modal-got-it')?.addEventListener('click', () => {
    helpModal?.classList.add('hidden');
  });

  // Window resize: reposition items accurately
  window.addEventListener('resize', () => {
    window.backpackGrid.repositionAllItems();
  });
});
