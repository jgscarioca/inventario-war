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

    const countEl = document.getElementById('stash-count-text');
    if (countEl) {
      countEl.textContent = `${this.items.length} / ${this.maxSlots} ocupados`;
    }
  }
}

// ==========================================================================
// TACTICAL SHOP & ROUND CYCLE MANAGER (Auto-Chess / Backpack Battles Style)
// ==========================================================================
class ShopManager {
  constructor(maxOffers = 4) {
    this.maxOffers = maxOffers;
    this.rerollCost = 2;
    this.offers = []; // array of { id, item, price, isFrozen, isSold }
    this.shelfEl = document.getElementById('shop-shelf');
    this.waveBadgeEl = document.getElementById('shop-wave-badge');
    this.rerollCostEl = document.getElementById('reroll-cost-display');

    this.availableTypes = ['axe', 'sword', 'spellbook', 'whetstone', 'shield', 'helmet', 'potion', 'bow'];
  }

  init() {
    this.refreshShop(true);
  }

  // Generate 4 offers (respecting frozen status)
  refreshShop(forceAll = false) {
    const newOffers = [];
    for (let i = 0; i < this.maxOffers; i++) {
      const prevOffer = this.offers[i];
      if (!forceAll && prevOffer && prevOffer.isFrozen && !prevOffer.isSold) {
        newOffers.push(prevOffer);
      } else {
        const type = this.availableTypes[Math.floor(Math.random() * this.availableTypes.length)];
        const item = createItem(type, 1);
        newOffers.push({
          id: `offer_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          item: item,
          price: item.shopPrice || 35,
          isFrozen: false,
          isSold: false
        });
      }
    }
    this.offers = newOffers;
    this.renderShelf();
  }

  // Reroll action
  reroll() {
    if (window.appState.gold < this.rerollCost) {
      window.appState.triggerGoldShortage();
      const btn = document.getElementById('btn-reroll-shop');
      btn?.classList.add('btn-shake');
      setTimeout(() => btn?.classList.remove('btn-shake'), 400);
      alert(`Você precisa de ${this.rerollCost} moedas de ouro para atualizar a loja!`);
      return false;
    }

    const paid = window.appState.spendGold(this.rerollCost);
    if (!paid) return false;

    window.sound?.playDrop();
    this.refreshShop(false);
    return true;
  }

  // Toggle freeze on an offer
  toggleFreeze(offerIndex) {
    const offer = this.offers[offerIndex];
    if (!offer || offer.isSold) return;

    offer.isFrozen = !offer.isFrozen;
    window.sound?.playTone(offer.isFrozen ? 880 : 440, 'triangle', 0.1);
    this.renderShelf();
  }

  // Buy offer
  buyItem(offerIndex) {
    const offer = this.offers[offerIndex];
    if (!offer || offer.isSold) return;

    if (window.stashManager.isFull()) {
      window.sound?.playError();
      alert('O Baú de Reserva está lotado! Libere espaço antes de comprar.');
      return;
    }

    if (window.appState.gold < offer.price) {
      window.appState.triggerGoldShortage();
      alert(`Você precisa de ${offer.price} moedas de ouro para comprar este item!`);
      return;
    }

    const paid = window.appState.spendGold(offer.price);
    if (!paid) return;

    // Add to stash
    window.stashManager.addItem(offer.item);
    offer.isSold = true;
    offer.isFrozen = false;

    window.sound?.playChest();
    window.sound?.playCoin();

    this.renderShelf();
    window.appState.updateCombatAndStats();
  }

  // Hook for round / wave progress
  onNewWave(wave) {
    if (this.waveBadgeEl) {
      this.waveBadgeEl.textContent = `Onda ${wave}`;
    }
    // Refresh shop keeping frozen items
    this.refreshShop(false);
  }

  renderShelf() {
    if (!this.shelfEl) return;
    this.shelfEl.innerHTML = '';

    const categoryIcons = {
      blade: '⚔️ Lâmina',
      magic: '🔮 Magia',
      armor: '🛡️ Armadura',
      potion: '🧪 Poção',
      accessory: '⚙️ Acessório',
      ranged: '🏹 Distância'
    };

    this.offers.forEach((offer, idx) => {
      const card = document.createElement('div');
      card.className = `shop-card ${offer.isFrozen ? 'is-frozen' : ''} ${offer.isSold ? 'is-sold' : ''}`;

      if (offer.isSold) {
        card.innerHTML = `
          <div class="sold-overlay">
            <span class="sold-icon">✅</span>
            <span class="sold-text">COMPRADO</span>
          </div>
        `;
      } else {
        const item = offer.item;
        const catLabel = categoryIcons[item.category] || '⚔️ Equipamento';

        let statSummary = `⚔️+${item.power} DPS`;
        if (item.category === 'magic') statSummary = `🔥+${item.buffPercent}% Fogo`;
        if (item.category === 'accessory') statSummary = `⚡+${item.buffPercent}% Afiar`;
        if (item.category === 'armor') statSummary = `🛡️+${item.power} Defesa`;
        if (item.category === 'potion') statSummary = `🧪 Cura +${item.buffPercent}%`;

        card.innerHTML = `
          <div class="shop-card-header">
            <span class="shop-card-category cat-${item.category}">${catLabel}</span>
            <button class="btn-freeze-card ${offer.isFrozen ? 'frozen-active' : ''}" title="${offer.isFrozen ? 'Descongelar item' : 'Congelar item para a próxima rodada'}">
              ${offer.isFrozen ? '❄️ Preso' : '❄️'}
            </button>
          </div>

          <div class="shop-card-icon-wrap tier-${item.tier}">
            ${item.svgString}
            <span class="shop-card-lvl">Nv.${item.level}</span>
          </div>

          <div class="shop-card-info">
            <div class="shop-card-name" title="${item.name}">${item.name}</div>
            <div class="shop-card-stat">${statSummary}</div>
          </div>

          <button class="btn-buy-card" ${window.appState?.gold < offer.price ? 'disabled' : ''}>
            <span>Comprar</span>
            <span class="shop-price-tag"><strong>${offer.price}</strong> 🪙</span>
          </button>
        `;

        // Event listeners
        const freezeBtn = card.querySelector('.btn-freeze-card');
        freezeBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFreeze(idx);
        });

        const buyBtn = card.querySelector('.btn-buy-card');
        buyBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.buyItem(idx);
        });
      }

      this.shelfEl.appendChild(card);
    });
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

    // Update shop reroll and buy buttons disabled state
    const rerollBtn = document.getElementById('btn-reroll-shop');
    if (rerollBtn && window.shopManager) {
      rerollBtn.disabled = this.gold < window.shopManager.rerollCost;
    }

    if (window.shopManager?.shelfEl) {
      const cards = window.shopManager.shelfEl.querySelectorAll('.shop-card:not(.is-sold)');
      cards.forEach((card, idx) => {
        const offer = window.shopManager.offers[idx];
        const buyBtn = card.querySelector('.btn-buy-card');
        if (buyBtn && offer) {
          buyBtn.disabled = this.gold < offer.price;
        }
      });
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

  // 2. Initialize Stash, Shop, and Drag & Drop
  window.stashManager = new StashManager(8);
  window.shopManager = new ShopManager(4);
  window.shopManager.init();
  window.dragDropController = new DragDropController(window.backpackGrid);

  // 3. Initialize Top Battle Arena
  window.combatArena = new CombatArena('battle-canvas');

  // 4. Initial Items: Weapons + Magic Book + Whetstone to demo fire & sharpening synergies!
  const axe1 = createItem('axe', 1);
  const axe2 = createItem('axe', 1);
  const dagger1 = createItem('sword', 1);
  const dagger2 = createItem('sword', 1);
  const potion = createItem('potion', 1);
  const shield = createItem('shield', 1);
  const spellbook = createItem('spellbook', 1);
  const whetstone = createItem('whetstone', 1);

  // Place items in grid:
  // axe1 at (4, 4) and axe2 at (4, 6) in the center of the unlocked 6x6 area
  window.backpackGrid.placeItem(axe1, 4, 4);
  window.backpackGrid.placeItem(axe2, 4, 6);
  window.backpackGrid.placeItem(dagger1, 5, 4);
  window.backpackGrid.placeItem(potion, 6, 5);

  // Place in stash:
  window.stashManager.addItem(dagger2);
  window.stashManager.addItem(shield);
  window.stashManager.addItem(spellbook);
  window.stashManager.addItem(whetstone);

  // Preview initial recipe in the merge hint banner
  window.dragDropController.previewItemInBanner(axe1);

  // Initial stats calculation
  window.appState.updateCombatAndStats();

  // Shop Reroll Button
  document.getElementById('btn-reroll-shop')?.addEventListener('click', () => {
    window.shopManager.reroll();
  });

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
