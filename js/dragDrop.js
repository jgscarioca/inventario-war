// ==========================================================================
// DRAG & DROP CONTROLLER + MERGE RESOLVER
// Supports Desktop Mouse & Mobile Touch, ghost preview, rotation, & merge FX
// ==========================================================================

class DragDropController {
  constructor(grid) {
    this.grid = grid;
    this.draggedItem = null;
    this.sourceType = null; // 'grid' or 'stash'
    this.originalPos = null; // { row, col } or stash index
    
    this.ghostEl = document.getElementById('drag-ghost');
    this.tooltipEl = document.getElementById('item-tooltip');

    this.isDragging = false;
    this.activePointerId = null;

    this.initGlobalEvents();
  }

  initGlobalEvents() {
    // Desktop keyboard shortcut 'R' to rotate held item
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.rotateHeldItem();
      }
    });

    // Global pointer move & up
    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.draggedItem) return;
      this.handlePointerMove(e);
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isDragging || !this.draggedItem) return;
      this.handlePointerUp(e);
    });

    window.addEventListener('pointercancel', (e) => {
      if (!this.isDragging || !this.draggedItem) return;
      this.cancelDrag();
    });
  }

  // Attach pointer events to an item element
  attachItemEvents(el, item, sourceType = 'grid') {
    el.addEventListener('pointerdown', (e) => {
      // Primary button or touch only
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      this.startDrag(e, item, sourceType);
    });

    // Hover tooltip
    el.addEventListener('pointerenter', (e) => {
      if (this.isDragging) return;
      this.showTooltip(item, e);
    });

    el.addEventListener('pointerleave', () => {
      this.hideTooltip();
    });
  }

  startDrag(e, item, sourceType) {
    this.isDragging = true;
    this.draggedItem = item;
    this.sourceType = sourceType;
    this.originalPos = { row: item.row, col: item.col };
    this.hideTooltip();

    // Mark element dragging
    const itemEl = document.getElementById(`item-dom-${item.id}`) || document.getElementById(`stash-item-${item.id}`);
    if (itemEl) {
      itemEl.classList.add('dragging');
    }

    // Sound
    window.sound?.playPick();

    // Build Ghost element
    const cellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 38;
    const cellGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap')) || 3;
    const ghostW = item.width * cellSize + (item.width - 1) * cellGap;
    const ghostH = item.height * cellSize + (item.height - 1) * cellGap;

    this.ghostEl.className = `drag-ghost inventory-item tier-${item.tier}`;
    this.ghostEl.style.width = `${ghostW}px`;
    this.ghostEl.style.height = `${ghostH}px`;
    this.ghostEl.innerHTML = `
      <span class="item-level-tag">Nv.${item.level}</span>
      <div class="item-icon-wrapper">${item.svgString}</div>
    `;

    this.ghostEl.classList.remove('hidden');
    this.updateGhostPosition(e.clientX, e.clientY);

    // Update bottom merge hint banner for this item
    this.previewItemInBanner(item);
  }

  handlePointerMove(e) {
    this.updateGhostPosition(e.clientX, e.clientY);

    // Calculate hover on 12x12 grid
    this.clearAllHoverHighlights();

    const gridCellPos = this.getGridCoordsFromClient(e.clientX, e.clientY);
    if (gridCellPos) {
      const { r, c } = gridCellPos;

      // 1. Check for MERGE candidate (Identical item + same level)
      const mergeTarget = this.grid.checkMergeTarget(this.draggedItem, r, c);
      if (mergeTarget) {
        this.highlightMergeTarget(mergeTarget);
        this.previewMergeInBanner(this.draggedItem, mergeTarget);
        return;
      }

      // 2. Check for normal valid move
      const canPlace = this.grid.canPlaceItem(
        this.draggedItem,
        r,
        c,
        this.sourceType === 'grid' ? this.draggedItem.id : null
      );

      this.highlightFootprint(r, c, this.draggedItem.width, this.draggedItem.height, canPlace ? 'hover-valid' : 'hover-invalid');
    }
  }

  handlePointerUp(e) {
    if (!this.draggedItem) return;

    const gridCellPos = this.getGridCoordsFromClient(e.clientX, e.clientY);
    const inStash = this.checkIfOverStash(e.clientX, e.clientY);

    let dropResolved = false;

    if (gridCellPos) {
      const { r, c } = gridCellPos;

      // 1. CHECK MERGE (Identical + Same Level)
      const mergeTarget = this.grid.checkMergeTarget(this.draggedItem, r, c);
      if (mergeTarget) {
        this.resolveMerge(this.draggedItem, mergeTarget);
        dropResolved = true;
      } 
      // 2. CHECK NORMAL MOVE TO EMPTY CELLS
      else {
        const canPlace = this.grid.canPlaceItem(
          this.draggedItem,
          r,
          c,
          this.sourceType === 'grid' ? this.draggedItem.id : null
        );

        if (canPlace) {
          if (this.sourceType === 'stash') {
            window.stashManager?.removeItem(this.draggedItem.id);
          }
          this.grid.placeItem(this.draggedItem, r, c);
          window.sound?.playDrop();
          dropResolved = true;
        }
      }
    } 
    // 3. DROP INTO STASH
    else if (inStash) {
      if (this.sourceType === 'grid') {
        this.grid.removeItem(this.draggedItem.id);
        window.stashManager?.addItem(this.draggedItem);
        window.sound?.playDrop();
        dropResolved = true;
      } else {
        // already in stash
        dropResolved = true;
      }
    }

    // 4. INVALID DROP -> SNAP BACK
    if (!dropResolved) {
      this.cancelDrag();
    } else {
      this.finishDrag();
    }
  }

  // Execute Merge when dropped on identical item of same level
  resolveMerge(draggedItem, targetItem) {
    const nextTierDef = getNextTier(targetItem.type, targetItem.level);

    if (!nextTierDef) {
      // Max level reached!
      window.sound?.playError();
      alert(`O ${targetItem.name} já alcançou o nível máximo!`);
      this.cancelDrag();
      return;
    }

    // Coordinates of merge center
    const targetR = targetItem.row;
    const targetC = targetItem.col;

    // 1. Remove both constituent items
    if (this.sourceType === 'grid') {
      this.grid.removeItem(draggedItem.id);
    } else {
      window.stashManager?.removeItem(draggedItem.id);
    }
    this.grid.removeItem(targetItem.id);

    // 2. Create the upgraded item (level + 1, larger size, higher power, new icon/color)
    const upgradedItem = createItem(targetItem.type, targetItem.level + 1);

    // 3. Find valid placement for the upgraded item (since its size may have increased!)
    let placedPos = null;
    if (this.grid.canPlaceItem(upgradedItem, targetR, targetC)) {
      placedPos = { r: targetR, c: targetC };
    } else {
      // Intelligently find nearest valid footprint
      placedPos = this.grid.findNearestValidPosition(upgradedItem, targetR, targetC);
    }

    if (placedPos) {
      this.grid.placeItem(upgradedItem, placedPos.r, placedPos.c);
    } else {
      // If the backpack is completely packed and new size doesn't fit, send to stash
      window.stashManager?.addItem(upgradedItem);
      alert('Grid sem espaço suficiente para a nova dimensão expandida do item! O item foi enviado para o Baú.');
    }

    // 4. Epic Audio & Visual Celebration
    window.sound?.playMerge(upgradedItem.tier);
    this.triggerCelebrationFX(upgradedItem);

    // 4b. Trigger Visual Glow, Shockwave & Hero Celebration on Canvas!
    window.combatArena?.triggerMergeCanvasEffect(upgradedItem);

    // 5. Update game state, total combat power, and dynamic banner
    window.appState?.updateCombatAndStats();
    this.previewItemInBanner(upgradedItem);
  }

  triggerCelebrationFX(item) {
    const banner = document.getElementById('merge-banner-fx');
    const nameEl = document.getElementById('fx-item-name');
    const statsEl = document.getElementById('fx-item-stats');

    if (banner && nameEl && statsEl) {
      nameEl.textContent = item.name;
      statsEl.textContent = `Nível ${item.level} • Tamanho ${item.width}x${item.height} • Poder ⚔️+${item.power}!`;

      banner.classList.remove('hidden');
      setTimeout(() => {
        banner.classList.add('hidden');
      }, 1400);
    }
  }

  // Rotate held item (90 degrees: swap width & height)
  rotateHeldItem() {
    if (!this.draggedItem) return;
    const temp = this.draggedItem.width;
    this.draggedItem.width = this.draggedItem.height;
    this.draggedItem.height = temp;

    // Update ghost dimensions
    const cellSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 38;
    const cellGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap')) || 3;
    const ghostW = this.draggedItem.width * cellSize + (this.draggedItem.width - 1) * cellGap;
    const ghostH = this.draggedItem.height * cellSize + (this.draggedItem.height - 1) * cellGap;

    this.ghostEl.style.width = `${ghostW}px`;
    this.ghostEl.style.height = `${ghostH}px`;

    window.sound?.playTone(520, 'sine', 0.08);
  }

  cancelDrag() {
    window.sound?.playError();
    // Return to previous place
    if (this.sourceType === 'grid') {
      this.grid.placeItem(this.draggedItem, this.originalPos.row, this.originalPos.col);
    } else {
      window.stashManager?.renderStash();
    }
    this.finishDrag();
  }

  finishDrag() {
    const itemEl = document.getElementById(`item-dom-${this.draggedItem?.id}`) || document.getElementById(`stash-item-${this.draggedItem?.id}`);
    if (itemEl) {
      itemEl.classList.remove('dragging');
    }

    this.ghostEl.classList.add('hidden');
    this.clearAllHoverHighlights();
    this.draggedItem = null;
    this.isDragging = false;
    this.sourceType = null;
    this.originalPos = null;

    window.appState?.updateCombatAndStats();
  }

  updateGhostPosition(x, y) {
    this.ghostEl.style.left = `${x}px`;
    this.ghostEl.style.top = `${y}px`;
  }

  getGridCoordsFromClient(clientX, clientY) {
    // 1. Direct hit with elementFromPoint
    const hoveredEl = document.elementFromPoint(clientX, clientY);
    if (hoveredEl) {
      const cellEl = hoveredEl.closest('.grid-cell');
      if (cellEl && cellEl.dataset.row !== undefined && cellEl.dataset.col !== undefined) {
        return {
          r: parseInt(cellEl.dataset.row, 10),
          c: parseInt(cellEl.dataset.col, 10)
        };
      }
    }

    // 2. Geometry fallback
    const rect = this.grid.container.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    const firstCell = document.getElementById('cell-0-0');
    const secondCell = document.getElementById('cell-0-1');
    const pitch = (firstCell && secondCell) ? (secondCell.offsetLeft - firstCell.offsetLeft) : 41;
    const pad = firstCell ? firstCell.offsetLeft : 4;

    const relX = clientX - rect.left - pad;
    const relY = clientY - rect.top - (firstCell ? firstCell.offsetTop : 4);

    const c = Math.floor(relX / pitch);
    const r = Math.floor(relY / pitch);

    if (r >= 0 && r < this.grid.rows && c >= 0 && c < this.grid.cols) {
      return { r, c };
    }
    return null;
  }

  checkIfOverStash(clientX, clientY) {
    const stashEl = document.getElementById('stash-slots');
    if (!stashEl) return false;
    const rect = stashEl.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  highlightFootprint(r, c, w, h, className) {
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const cell = document.getElementById(`cell-${r + dr}-${c + dc}`);
        if (cell) cell.classList.add(className);
      }
    }
  }

  highlightMergeTarget(targetItem) {
    for (let dr = 0; dr < targetItem.height; dr++) {
      for (let dc = 0; dc < targetItem.width; dc++) {
        const cell = document.getElementById(`cell-${targetItem.row + dr}-${targetItem.col + dc}`);
        if (cell) cell.classList.add('hover-merge');
      }
    }
  }

  clearAllHoverHighlights() {
    const highlighted = this.grid.container.querySelectorAll('.hover-valid, .hover-invalid, .hover-merge');
    highlighted.forEach(el => el.classList.remove('hover-valid', 'hover-invalid', 'hover-merge'));
  }

  previewMergeInBanner(draggedItem, targetItem) {
    const nextTier = getNextTier(targetItem.type, targetItem.level);
    if (!nextTier) return;

    const recipeA = document.getElementById('recipe-item-a');
    const recipeB = document.getElementById('recipe-item-b');
    const recipeRes = document.getElementById('recipe-item-res');
    const currentPower = document.getElementById('banner-current-power');
    const nextPower = document.getElementById('banner-next-power');

    if (recipeA) recipeA.innerHTML = `<span>${draggedItem.name} Nv.${draggedItem.level} (+${draggedItem.power})</span>`;
    if (recipeB) recipeB.innerHTML = `<span>${targetItem.name} Nv.${targetItem.level} (+${targetItem.power})</span>`;
    if (recipeRes) {
      recipeRes.innerHTML = `
        <div class="recipe-icon glow-pulse">⚡</div>
        <span class="result-text">${nextTier.name} Nv.${nextTier.level} (+${nextTier.power} DPS)</span>
      `;
    }

    const currentTotal = this.grid.calculateTotalPower();
    // Replacing two items with one upgraded: netGain = nextTier.power - (dragged + target)
    const netGain = nextTier.power - (draggedItem.power + targetItem.power);
    if (currentPower) currentPower.textContent = currentTotal;
    if (nextPower) nextPower.textContent = currentTotal + netGain;
  }

  previewItemInBanner(item) {
    const nextTier = getNextTier(item.type, item.level);
    if (!nextTier) return;

    const recipeA = document.getElementById('recipe-item-a');
    const recipeB = document.getElementById('recipe-item-b');
    const recipeRes = document.getElementById('recipe-item-res');
    const currentPower = document.getElementById('banner-current-power');
    const nextPower = document.getElementById('banner-next-power');

    if (recipeA) recipeA.innerHTML = `<span>${item.name} Nv.${item.level} (+${item.power})</span>`;
    if (recipeB) recipeB.innerHTML = `<span>${item.name} Nv.${item.level} (+${item.power})</span>`;
    if (recipeRes) {
      recipeRes.innerHTML = `
        <div class="recipe-icon glow-pulse">⚡</div>
        <span class="result-text">${nextTier.name} Nv.${nextTier.level} (+${nextTier.power} DPS)</span>
      `;
    }

    const currentTotal = this.grid.calculateTotalPower();
    const netGain = nextTier.power - (item.power * 2);
    if (currentPower) currentPower.textContent = currentTotal;
    if (nextPower) nextPower.textContent = currentTotal + Math.max(netGain, 120);
  }

  // Tooltip
  showTooltip(item, e) {
    const t = this.tooltipEl;
    if (!t) return;

    const catLabels = {
      blade: '⚔️ Lâmina',
      magic: '🔮 Magia',
      armor: '🛡️ Armadura',
      potion: '🧪 Poção',
      accessory: '⚙️ Acessório',
      ranged: '🏹 Distância'
    };
    const catName = catLabels[item.category] || 'Equipamento';
    document.getElementById('tooltip-title').textContent = item.name;
    document.getElementById('tooltip-tier').textContent = `${catName} • ${tierLabels[item.tier - 1]} • Nv. ${item.level}`;
    document.getElementById('tooltip-power').textContent = `+${item.power + (item.adjacencyBonusPower || 0)}`;
    document.getElementById('tooltip-size').textContent = `${item.width}x${item.height} células`;
    document.getElementById('tooltip-desc').textContent = item.desc;

    // Sinergia Adjacente
    const synergyRow = document.getElementById('tooltip-synergy-row');
    const synergyLabel = document.getElementById('tooltip-synergy-label');
    const synergyVal = document.getElementById('tooltip-synergy-val');
    if (item.buffedBy && item.buffedBy.length > 0) {
      synergyRow?.classList.remove('hidden');
      if (synergyLabel) synergyLabel.textContent = '✨ Sinergias Ativas:';
      if (synergyVal) {
        synergyVal.innerHTML = item.buffedBy.map(b => `${b.icon || '⚡'} ${b.name}: +${b.bonus} (${b.label || ''})`).join('<br>');
      }
    } else if (item.buffingItems && item.buffingItems.length > 0) {
      synergyRow?.classList.remove('hidden');
      if (synergyLabel) synergyLabel.textContent = '⚡ Fornecendo Bônus:';
      if (synergyVal) {
        synergyVal.innerHTML = item.buffingItems.map(b => `➔ ${b.name}: +${b.bonus} DPS`).join('<br>');
      }
    } else {
      synergyRow?.classList.add('hidden');
    }

    const nextTier = getNextTier(item.type, item.level);
    if (nextTier) {
      document.getElementById('tooltip-bonus').textContent = `Funde para Nv.${nextTier.level} (${nextTier.width}x${nextTier.height}) com +${nextTier.power} Poder!`;
    } else {
      document.getElementById('tooltip-bonus').textContent = 'Nível Máximo Atingido!';
    }

    t.classList.remove('hidden');
    const x = Math.min(e.clientX + 15, window.innerWidth - 240);
    const y = Math.min(e.clientY + 15, window.innerHeight - 200);
    t.style.left = `${x}px`;
    t.style.top = `${y}px`;
  }

  hideTooltip() {
    this.tooltipEl?.classList.add('hidden');
  }
}
