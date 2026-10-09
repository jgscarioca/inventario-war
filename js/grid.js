// ==========================================================================
// 12x12 EXPANDABLE GRID SYSTEM
// Handles matrix cells, unlocked expansion zones, collision checks, & placement
// ==========================================================================

class BackpackGrid {
  constructor(rows = 12, cols = 12) {
    this.rows = rows;
    this.cols = cols;
    this.unlockedMatrix = Array(rows).fill(null).map(() => Array(cols).fill(false));
    this.items = []; // Items currently inside the grid
    this.container = document.getElementById('backpack-grid');
    this.colRuler = document.getElementById('col-ruler');
    this.rowRuler = document.getElementById('row-ruler');
    
    // Expansion level & cost
    this.expandCost = 50;
    this.allUnlocked = false;

    // Default unlocked central region: 6x6 (Rows 3..8, Cols 3..8)
    this.initDefaultUnlockedArea(3, 8, 3, 8);
  }

  initDefaultUnlockedArea(startR, endR, startC, endC) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (r >= startR && r <= endR && c >= startC && c <= endC) {
          this.unlockedMatrix[r][c] = true;
        } else {
          this.unlockedMatrix[r][c] = false;
        }
      }
    }
  }

  // Build the 144 grid cells into the DOM
  buildDOM() {
    if (!this.container) return;
    this.container.innerHTML = '';
    if (this.colRuler) this.colRuler.innerHTML = '';
    if (this.rowRuler) this.rowRuler.innerHTML = '';

    // Build rulers
    for (let c = 0; c < this.cols; c++) {
      const sp = document.createElement('span');
      sp.textContent = c + 1;
      this.colRuler?.appendChild(sp);
    }
    for (let r = 0; r < this.rows; r++) {
      const sp = document.createElement('span');
      sp.textContent = String.fromCharCode(65 + r); // A, B, C, D...
      this.rowRuler?.appendChild(sp);
    }

    // Build 144 cells
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.id = `cell-${r}-${c}`;

        // Click on a locked cell to prompt unlock if neighboring
        cell.addEventListener('click', () => {
          if (!this.isUnlocked(r, c)) {
            this.handleCellUnlockClick(r, c);
          }
        });

        this.container.appendChild(cell);
      }
    }

    this.updateCellClasses();
  }

  // Update cell styles (unlocked, locked, expand-target)
  updateCellClasses() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        if (!cell) continue;

        cell.classList.remove('unlocked', 'locked', 'expand-target', 'hover-valid', 'hover-merge', 'hover-invalid');
        
        if (this.unlockedMatrix[r][c]) {
          cell.classList.add('unlocked');
        } else {
          cell.classList.add('locked');
          // If adjacent to an unlocked cell, it's an immediate candidate for expansion
          if (this.hasUnlockedNeighbor(r, c)) {
            cell.classList.add('expand-target');
          }
        }
      }
    }
  }

  hasUnlockedNeighbor(r, c) {
    const deltas = [[-1,0], [1,0], [0,-1], [0,1]];
    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        if (this.unlockedMatrix[nr][nc]) return true;
      }
    }
    return false;
  }

  isUnlocked(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    return !!this.unlockedMatrix[r][c];
  }

  // Check if cell is occupied by any item
  getItemAt(r, c) {
    for (const it of this.items) {
      if (
        r >= it.row &&
        r < it.row + it.height &&
        c >= it.col &&
        c < it.col + it.width
      ) {
        return it;
      }
    }
    return null;
  }

  // Check if an item of dimension w x h fits at (r, c) without collision
  canPlaceItem(item, r, c, ignoreItemId = null) {
    const w = item.width;
    const h = item.height;

    // Check bounds
    if (r < 0 || r + h > this.rows || c < 0 || c + w > this.cols) {
      return false;
    }

    // Check all cells inside the footprint are unlocked and free
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const curR = r + dr;
        const curC = c + dc;
        if (!this.isUnlocked(curR, curC)) {
          return false;
        }
        const occupant = this.getItemAt(curR, curC);
        if (occupant && occupant.id !== ignoreItemId) {
          return false;
        }
      }
    }
    return true;
  }

  // Check if dropping onto (r, c) targets an identical item of same level for MERGE
  checkMergeTarget(draggedItem, r, c) {
    // Check cell directly under cursor
    const directOccupant = this.getItemAt(r, c);
    if (directOccupant && directOccupant.id !== draggedItem.id) {
      if (directOccupant.type === draggedItem.type && directOccupant.level === draggedItem.level) {
        return directOccupant;
      }
    }

    // Check cells covered by the dragged item's footprint
    for (let dr = 0; dr < draggedItem.height; dr++) {
      for (let dc = 0; dc < draggedItem.width; dc++) {
        const checkR = r + dr;
        const checkC = c + dc;
        const occupant = this.getItemAt(checkR, checkC);
        if (occupant && occupant.id !== draggedItem.id) {
          if (occupant.type === draggedItem.type && occupant.level === draggedItem.level) {
            return occupant;
          }
        }
      }
    }

    return null;
  }

  // Find nearest valid position in grid (used when merged item expands and needs room)
  findNearestValidPosition(item, preferredR, preferredC, ignoreIds = []) {
    // Try preferred position first
    if (this.canPlaceItemWithIgnore(item, preferredR, preferredC, ignoreIds)) {
      return { r: preferredR, c: preferredC };
    }

    // Spiral/BFS outwards
    for (let radius = 1; radius < 12; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          const nr = preferredR + dr;
          const nc = preferredC + dc;
          if (this.canPlaceItemWithIgnore(item, nr, nc, ignoreIds)) {
            return { r: nr, c: nc };
          }
        }
      }
    }
    return null;
  }

  canPlaceItemWithIgnore(item, r, c, ignoreIds = []) {
    const w = item.width;
    const h = item.height;
    if (r < 0 || r + h > this.rows || c < 0 || c + w > this.cols) return false;

    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const curR = r + dr;
        const curC = c + dc;
        if (!this.isUnlocked(curR, curC)) return false;
        const occupant = this.getItemAt(curR, curC);
        if (occupant && !ignoreIds.includes(occupant.id)) {
          return false;
        }
      }
    }
    return true;
  }

  // Check if item A is adjacent (cardinal or diagonal neighbor) to item B
  checkAdjacency(itemA, itemB) {
    if (itemA.row === null || itemB.row === null) return false;
    for (let ra = itemA.row; ra < itemA.row + itemA.height; ra++) {
      for (let ca = itemA.col; ca < itemA.col + itemA.width; ca++) {
        for (let rb = itemB.row; rb < itemB.row + itemB.height; rb++) {
          for (let cb = itemB.col; cb < itemB.col + itemB.width; cb++) {
            const dr = Math.abs(ra - rb);
            const dc = Math.abs(ca - cb);
            // Adjacent if 1 step away in any direction (including diagonals) and not same cell
            if (dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Calculate and apply adjacency synergies between classes
  updateAdjacencySynergies() {
    // 1. Reset synergy states
    this.items.forEach(it => {
      it.adjacencyBonusPower = 0;
      it.buffedBy = [];
      it.buffingItems = [];
      it.synergiesActive = [];
    });

    const weapons = this.items.filter(it => it.category === 'blade' || it.category === 'ranged');
    const magicItems = this.items.filter(it => it.category === 'magic');
    const accessories = this.items.filter(it => it.category === 'accessory');
    const potions = this.items.filter(it => it.category === 'potion');
    const shields = this.items.filter(it => it.type === 'shield');
    const helmets = this.items.filter(it => it.type === 'helmet');

    // 2. Spellbook (Magia): Infuses adjacent weapons with Fire Damage (+25% a +85%)
    magicItems.forEach(mag => {
      weapons.forEach(wep => {
        if (this.checkAdjacency(mag, wep)) {
          const buffPct = mag.buffPercent || 25;
          const bonus = Math.round(wep.power * (buffPct / 100));
          wep.adjacencyBonusPower += bonus;
          wep.synergiesActive.push({ type: 'fire', icon: '🔥', label: `+${bonus} Dano de Fogo` });
          wep.buffedBy.push({
            name: mag.name,
            bonus: bonus,
            icon: '🔥',
            label: `+${buffPct}% Fogo Arcana`
          });
          mag.buffingItems.push({
            name: wep.name,
            bonus: bonus
          });
        }
      });
    });

    // 3. Whetstone (Acessório / Pedra de Amolar): Sharpens blades with high Critical DPS (+40% a +110%)
    accessories.forEach(acc => {
      weapons.forEach(wep => {
        if (this.checkAdjacency(acc, wep)) {
          const buffPct = acc.buffPercent || 40;
          const bonus = Math.round(wep.power * (buffPct / 100));
          wep.adjacencyBonusPower += bonus;
          wep.synergiesActive.push({ type: 'sharp', icon: '⚡', label: `+${bonus} DPS Crítico` });
          wep.buffedBy.push({
            name: acc.name,
            bonus: bonus,
            icon: '⚡',
            label: `+${buffPct}% Fio Navalha`
          });
          acc.buffingItems.push({
            name: wep.name,
            bonus: bonus
          });
        }
      });
    });

    // 4. Potions: Alchemy infusion (+30% a +90%)
    potions.forEach(pot => {
      weapons.forEach(wep => {
        if (this.checkAdjacency(pot, wep)) {
          const buffPct = pot.buffPercent || 30;
          const bonus = Math.round(wep.power * (buffPct / 100));
          wep.adjacencyBonusPower += bonus;
          wep.synergiesActive.push({ type: 'alchemy', icon: '🧪', label: `+${bonus} Alquimia` });
          wep.buffedBy.push({
            name: pot.name,
            bonus: bonus,
            icon: '🧪',
            label: `+${buffPct}% Alquimia`
          });
          pot.buffingItems.push({
            name: wep.name,
            bonus: bonus
          });
        }
      });
    });

    // 5. Armors (Shield + Helmet adjacency: Muralha de Aço)
    shields.forEach(sh => {
      helmets.forEach(helm => {
        if (this.checkAdjacency(sh, helm)) {
          const bonusSh = Math.round(sh.power * 0.25);
          const bonusHelm = Math.round(helm.power * 0.25);
          sh.adjacencyBonusPower += bonusSh;
          helm.adjacencyBonusPower += bonusHelm;
          sh.synergiesActive.push({ type: 'armor', icon: '🛡️', label: '+25% Muralha' });
          helm.synergiesActive.push({ type: 'armor', icon: '🛡️', label: '+25% Muralha' });
          sh.buffedBy.push({ name: helm.name, bonus: bonusSh, icon: '🛡️', label: '+25% Muralha' });
          helm.buffedBy.push({ name: sh.name, bonus: bonusHelm, icon: '🛡️', label: '+25% Muralha' });
        }
      });
    });

    // 6. Update DOM styling: visual glow, borders, and boosted stat tags
    this.items.forEach(it => {
      const el = document.getElementById(`item-dom-${it.id}`);
      if (!el) return;

      el.classList.remove(
        'synergy-buffed',
        'synergy-provider',
        'synergy-fire',
        'synergy-sharp',
        'synergy-alchemy',
        'synergy-armor'
      );

      const statTag = el.querySelector('.item-stat-tag');

      // Specific synergy glow classes
      if (it.synergiesActive && it.synergiesActive.length > 0) {
        it.synergiesActive.forEach(syn => {
          el.classList.add(`synergy-${syn.type}`);
        });
      }

      if (it.adjacencyBonusPower > 0) {
        el.classList.add('synergy-buffed');
        if (statTag) {
          const icon = it.synergiesActive?.[0]?.icon || '⚡';
          statTag.innerHTML = `⚔️+${it.power + it.adjacencyBonusPower} <span class="synergy-tag-sup">(+${it.adjacencyBonusPower}${icon})</span>`;
        }
      } else {
        if (statTag) {
          if (it.category === 'magic') {
            statTag.innerHTML = (it.buffingItems && it.buffingItems.length > 0)
              ? `🔥+${it.buffPercent}% (${it.buffingItems.length})`
              : `🔮+${it.power}`;
          } else if (it.category === 'accessory') {
            statTag.innerHTML = (it.buffingItems && it.buffingItems.length > 0)
              ? `⚡+${it.buffPercent}% (${it.buffingItems.length})`
              : `⚙️+${it.power}`;
          } else if (it.category === 'potion') {
            statTag.innerHTML = `🧪 Cura`;
          } else if (it.category === 'armor') {
            statTag.innerHTML = `🛡️+${it.power}`;
          } else {
            statTag.innerHTML = `⚔️+${it.power}`;
          }
        }
      }

      if (it.buffingItems && it.buffingItems.length > 0) {
        el.classList.add('synergy-provider');
      }
    });
  }

  // Place item in grid
  placeItem(item, r, c) {
    this.removeItem(item.id);
    item.row = r;
    item.col = c;
    this.items.push(item);
    this.renderItemDOM(item);
    this.updateAdjacencySynergies();
  }

  // Remove item from grid
  removeItem(itemId) {
    const idx = this.items.findIndex(it => it.id === itemId);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
    const el = document.getElementById(`item-dom-${itemId}`);
    if (el) el.remove();
    this.updateAdjacencySynergies();
  }

  // Render or update an item's DOM element on the 12x12 grid
  renderItemDOM(item) {
    let el = document.getElementById(`item-dom-${item.id}`);
    if (!el) {
      el = document.createElement('div');
      el.id = `item-dom-${item.id}`;
      el.className = `inventory-item tier-${item.tier}`;
      el.dataset.itemId = item.id;
      this.container.appendChild(el);
      
      // Attach drag listeners
      window.dragDropController?.attachItemEvents(el, item);
    } else {
      el.className = `inventory-item tier-${item.tier}`;
    }

    // Calculate pixel-perfect position from target cell
    const cell = document.getElementById(`cell-${item.row}-${item.col}`);
    const endCell = document.getElementById(`cell-${item.row + item.height - 1}-${item.col + item.width - 1}`);

    if (cell && endCell) {
      const left = cell.offsetLeft;
      const top = cell.offsetTop;
      const width = (endCell.offsetLeft + endCell.offsetWidth) - left;
      const height = (endCell.offsetTop + endCell.offsetHeight) - top;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    } else {
      const cellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 38;
      const cellGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap')) || 3;
      const pad = 4;
      const left = pad + item.col * (cellSize + cellGap);
      const top = pad + item.row * (cellSize + cellGap);
      const width = item.width * cellSize + (item.width - 1) * cellGap;
      const height = item.height * cellSize + (item.height - 1) * cellGap;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    }

    // Inner content (icon, level badge, stats, size tag)
    el.innerHTML = `
      <span class="item-level-tag">Nv.${item.level}</span>
      ${(item.width > 1 || item.height > 1) ? `<span class="item-size-tag">${item.width}x${item.height}</span>` : ''}
      <div class="item-icon-wrapper">
        ${item.svgString}
      </div>
      <span class="item-stat-tag">⚔️+${item.power}</span>
    `;
  }

  // Reposition all items on window resize
  repositionAllItems() {
    this.items.forEach(it => this.renderItemDOM(it));
  }

  // Expand Grid by unlocking the next ring of neighbor cells
  expandGrid(cost = 50) {
    const candidates = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.unlockedMatrix[r][c] && this.hasUnlockedNeighbor(r, c)) {
          candidates.push({ r, c });
        }
      }
    }

    if (candidates.length === 0) {
      return false; // fully unlocked
    }

    // Unlock up to 8 candidate cells per expansion step
    const countToUnlock = Math.min(candidates.length, 8);
    for (let i = 0; i < countToUnlock; i++) {
      const { r, c } = candidates[i];
      this.unlockedMatrix[r][c] = true;
    }

    this.updateCellClasses();
    window.sound?.playCoin();
    return true;
  }

  // Toggle or unlock entire 12x12 grid (144 cells)
  toggleUnlockAll() {
    this.allUnlocked = !this.allUnlocked;
    if (this.allUnlocked) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.unlockedMatrix[r][c] = true;
        }
      }
    } else {
      // Revert to 6x6 center
      this.initDefaultUnlockedArea(3, 8, 3, 8);
      // Evict items that ended up on newly locked cells
      const itemsToEvict = this.items.filter(it => !this.canPlaceItem(it, it.row, it.col, it.id));
      itemsToEvict.forEach(it => {
        this.removeItem(it.id);
        window.stashManager?.addItem(it);
      });
    }
    this.updateCellClasses();
    this.repositionAllItems();
    window.sound?.playTone(600, 'sine', 0.15);
    return this.allUnlocked;
  }

  handleCellUnlockClick(r, c) {
    if (this.hasUnlockedNeighbor(r, c)) {
      if (window.appState && window.appState.gold >= 25) {
        window.appState.spendGold(25);
        this.unlockedMatrix[r][c] = true;
        this.updateCellClasses();
        window.sound?.playCoin();
      } else {
        window.appState?.triggerGoldShortage();
      }
    }
  }

  // Calculate total power of all items inside the backpack grid (including adjacency bonuses)
  calculateTotalPower() {
    this.updateAdjacencySynergies();
    return this.items.reduce((total, it) => total + it.power + (it.adjacencyBonusPower || 0), 0);
  }
}
