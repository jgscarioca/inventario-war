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
    this.inspectedItem = null;

    this.initGlobalEvents();
  }

  initGlobalEvents() {
    // Desktop keyboard shortcut 'R' to rotate held or inspected item
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.draggedItem) {
          this.rotateHeldItem();
        } else if (this.inspectedItem) {
          this.rotateItem(this.inspectedItem);
        }
      }
      if (e.key === 'Escape') {
        this.closeWeaponInspector();
      }
    });

    // Weapon Inspector Modal controls
    document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
      this.closeWeaponInspector();
    });
    document.getElementById('btn-inspector-close-main')?.addEventListener('click', () => {
      this.closeWeaponInspector();
    });
    document.getElementById('btn-inspector-rotate')?.addEventListener('click', () => {
      if (this.inspectedItem) {
        this.rotateItem(this.inspectedItem);
      }
    });
    document.getElementById('weapon-inspector-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'weapon-inspector-modal') {
        this.closeWeaponInspector();
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
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let dragThresholdPassed = false;

    el.addEventListener('pointerdown', (e) => {
      // Primary button or touch only
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      dragThresholdPassed = false;

      const onPointerMovePreDrag = (moveEv) => {
        const dist = Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY);
        if (dist > 7) {
          dragThresholdPassed = true;
          window.removeEventListener('pointermove', onPointerMovePreDrag);
          window.removeEventListener('pointerup', onPointerUpPreDrag);
          this.startDrag(moveEv, item, sourceType);
        }
      };

      const onPointerUpPreDrag = (upEv) => {
        window.removeEventListener('pointermove', onPointerMovePreDrag);
        window.removeEventListener('pointerup', onPointerUpPreDrag);

        // If distance was small and time < 400ms, consider as TAP / CLICK to Inspect
        if (!dragThresholdPassed && (Date.now() - startTime < 400)) {
          this.openWeaponInspector(item);
        }
      };

      window.addEventListener('pointermove', onPointerMovePreDrag);
      window.addEventListener('pointerup', onPointerUpPreDrag);
    });

    // Right-click directly opens inspector
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.openWeaponInspector(item);
    });

    // Hover tooltip & synergy highlight
    el.addEventListener('pointerenter', (e) => {
      if (this.isDragging) return;
      this.showTooltip(item, e);
      this.highlightSynergyConnections(item, true);
    });

    el.addEventListener('pointerleave', () => {
      this.hideTooltip();
      this.highlightSynergyConnections(item, false);
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

  // Modern Floating Tooltip
  showTooltip(item, e) {
    const t = this.tooltipEl;
    if (!t) return;

    const catLabels = {
      blade: '⚔️ LÂMINA',
      magic: '🔮 ARCANO',
      armor: '🛡️ BALUARTE',
      potion: '🧪 ALQUIMIA',
      accessory: '⚡ AFIAÇÃO',
      ranged: '🎯 PRECISÃO'
    };
    const catName = catLabels[item.category] || '⚔️ EQUIPAMENTO';
    const tierLabels = ['Comum', 'Raro', 'Épico', 'Lendário', 'Mítico'];

    // Update class and accent bar
    t.className = `item-tooltip tier-${item.tier}`;
    const accent = document.getElementById('tooltip-rarity-accent');
    if (accent) accent.className = `tooltip-rarity-accent tier-${item.tier}`;

    const iconEl = document.getElementById('tooltip-icon');
    if (iconEl) iconEl.innerHTML = item.svgString;

    const catBadge = document.getElementById('tooltip-cat-badge');
    if (catBadge) {
      catBadge.textContent = catName;
      catBadge.className = `tooltip-badge cat-${item.category}`;
    }

    const tierBadge = document.getElementById('tooltip-tier');
    if (tierBadge) {
      tierBadge.textContent = `${tierLabels[item.tier - 1] || 'Raro'} • Nv. ${item.level}`;
    }

    document.getElementById('tooltip-title').textContent = item.name;
    const powerTag = document.getElementById('tooltip-power');
    const totalPower = item.power + (item.adjacencyBonusPower || 0);
    if (powerTag) {
      powerTag.textContent = item.adjacencyBonusPower > 0 ? `+${totalPower} (${item.power}+${item.adjacencyBonusPower})` : `+${totalPower}`;
    }

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
        synergyVal.innerHTML = item.buffedBy.map(b => `${b.icon || '⚡'} ${b.name}: +${b.bonus} DPS`).join('<br>');
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
      document.getElementById('tooltip-bonus').textContent = `Funde para Nv.${nextTier.level} (${nextTier.width}x${nextTier.height}) com +${nextTier.power} DPS!`;
    } else {
      document.getElementById('tooltip-bonus').textContent = '👑 Nível Máximo Atingido!';
    }

    t.classList.remove('hidden');
    const x = Math.min(e.clientX + 16, window.innerWidth - 270);
    const y = Math.min(e.clientY + 16, window.innerHeight - 240);
    t.style.left = `${Math.max(x, 10)}px`;
    t.style.top = `${Math.max(y, 10)}px`;
  }

  hideTooltip() {
    this.tooltipEl?.classList.add('hidden');
  }

  // Highlight all adjacent items connected via synergies
  highlightSynergyConnections(item, isHighlighted) {
    if (!this.grid || !this.grid.items) return;

    if (!isHighlighted) {
      document.querySelectorAll('.synergy-connected-glow, .synergy-beam-target').forEach(el => {
        el.classList.remove('synergy-connected-glow', 'synergy-beam-target');
      });
      return;
    }

    // Identify connected partner items
    const partnerIds = new Set();
    if (item.buffedBy && item.buffedBy.length > 0) {
      item.buffedBy.forEach(b => {
        const found = this.grid.items.find(it => it.name === b.name);
        if (found) partnerIds.add(found.id);
      });
    }
    if (item.buffingItems && item.buffingItems.length > 0) {
      item.buffingItems.forEach(b => {
        const found = this.grid.items.find(it => it.name === b.name);
        if (found) partnerIds.add(found.id);
      });
    }

    partnerIds.forEach(id => {
      const el = document.getElementById(`item-dom-${id}`);
      if (el) el.classList.add('synergy-connected-glow');
    });
  }

  // Open the Full Weapon Inspector Modal Card
  openWeaponInspector(item) {
    this.hideTooltip();
    window.sound?.playInspect();

    const modal = document.getElementById('weapon-inspector-modal');
    if (!modal) return;

    this.inspectedItem = item;

    const tierLabels = ['COMUM', 'RARO', 'ÉPICO', 'LENDÁRIO', 'MÍTICO'];
    const tierName = tierLabels[item.tier - 1] || 'RARO';
    const card = document.getElementById('inspector-card-container');
    const rarityText = document.getElementById('inspector-rarity-text');

    if (card) {
      card.className = `weapon-inspector-card tier-${item.tier}`;
    }
    if (rarityText) {
      rarityText.textContent = `✦ ARTEFATO ${tierName} • NÍVEL ${item.level} ✦`;
    }

    // Name & Lore
    document.getElementById('inspector-name').textContent = item.name;
    document.getElementById('inspector-lore').textContent = item.desc || 'Arma forjada para combate de alto desempenho.';

    // Category Pill
    const catLabels = {
      blade: '⚔️ LÂMINA DE CORTE',
      magic: '🔮 ARCANO DE FOGO',
      armor: '🛡️ BALUARTE DE DEFESA',
      potion: '🧪 INFUSÃO ALQUÍMICA',
      accessory: '⚡ AFIAÇÃO CRÍTICA',
      ranged: '🎯 TIRO DE PRECISÃO'
    };
    const catPill = document.getElementById('inspector-category-pill');
    if (catPill) {
      catPill.textContent = catLabels[item.category] || '⚔️ EQUIPAMENTO';
      catPill.className = `inspector-cat-pill cat-${item.category}`;
    }

    // Hero Showcase Icon with 3D perspective
    const showcase = document.getElementById('inspector-icon-showcase');
    if (showcase) {
      showcase.innerHTML = item.svgString;
    }

    // Element Badges
    const badgesRow = document.getElementById('inspector-badges-row');
    if (badgesRow) {
      const badges = [];
      badges.push(`<span class="hero-badge badge-tier tier-${item.tier}">Tier ${item.tier}</span>`);
      badges.push(`<span class="hero-badge badge-size">📐 ${item.width}x${item.height} Células</span>`);
      if (item.category === 'magic' || (item.synergiesActive && item.synergiesActive.some(s => s.type === 'fire'))) {
        badges.push(`<span class="hero-badge badge-elem-fire">🔥 FOGO +${item.buffPercent || 35}%</span>`);
      }
      if (item.category === 'accessory' || (item.synergiesActive && item.synergiesActive.some(s => s.type === 'sharp'))) {
        badges.push(`<span class="hero-badge badge-elem-crit">⚡ CRÍTICO +40%</span>`);
      }
      if (item.category === 'potion' || (item.synergiesActive && item.synergiesActive.some(s => s.type === 'alchemy'))) {
        badges.push(`<span class="hero-badge badge-elem-heal">🧪 ALQUIMIA +${item.buffPercent || 30}%</span>`);
      }
      if (item.category === 'armor' || (item.synergiesActive && item.synergiesActive.some(s => s.type === 'armor'))) {
        badges.push(`<span class="hero-badge badge-elem-shield">🛡️ MURALHA +25%</span>`);
      }
      badgesRow.innerHTML = badges.join('');
    }

    // Core Stats
    const totalPower = item.power + (item.adjacencyBonusPower || 0);
    document.getElementById('inspector-power-val').textContent = item.power;
    const powerBar = document.getElementById('inspector-power-bar');
    if (powerBar) {
      const pct = Math.min(Math.round((item.power / 2800) * 100), 100);
      powerBar.style.width = `${Math.max(pct, 14)}%`;
    }

    const synergyVal = document.getElementById('inspector-synergy-val');
    const synergySource = document.getElementById('inspector-synergy-source');
    if (synergyVal) {
      synergyVal.textContent = item.adjacencyBonusPower > 0 ? `+${item.adjacencyBonusPower} DPS` : '+0 DPS';
    }
    if (synergySource) {
      if (item.buffedBy && item.buffedBy.length > 0) {
        synergySource.innerHTML = item.buffedBy.map(b => `${b.icon || '⚡'} ${b.name}: +${b.bonus} DPS (${b.label || ''})`).join('<br>');
      } else if (item.buffingItems && item.buffingItems.length > 0) {
        synergySource.innerHTML = `Irradiando bônus para ${item.buffingItems.length} armas conectadas`;
      } else {
        synergySource.textContent = 'Posicione ao lado de Grimórios ou Pedras Amoladoras para bônus!';
      }
    }

    const totalDpsEl = document.getElementById('inspector-total-dps');
    if (totalDpsEl) totalDpsEl.textContent = `${totalPower} DPS`;

    // Mini Grid Preview
    const miniGrid = document.getElementById('inspector-mini-grid');
    if (miniGrid) {
      miniGrid.innerHTML = '';
      const cols = Math.max(item.width, 3);
      const rows = Math.max(item.height, 3);
      miniGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'mini-cell';
          if (r < item.height && c < item.width) {
            cell.classList.add('occupied', `tier-${item.tier}`);
          }
          miniGrid.appendChild(cell);
        }
      }
    }

    // Synergy Tips
    const tipsBox = document.getElementById('inspector-synergy-tips');
    if (tipsBox && typeof getItemSynergyGuide === 'function') {
      const guides = getItemSynergyGuide(item);
      tipsBox.innerHTML = guides.map(g => `
        <div class="synergy-tip-card">
          <div class="tip-icon-box">${g.icon}</div>
          <div class="tip-body">
            <span class="tip-title">${g.title}</span>
            <span class="tip-text">${g.desc}</span>
          </div>
        </div>
      `).join('');
    }

    // Evolution Track
    const evoTrack = document.getElementById('inspector-evolution-track');
    const nextMergeBox = document.getElementById('inspector-next-merge-box');
    if (evoTrack && typeof getItemEvolutionChain === 'function') {
      const chain = getItemEvolutionChain(item.type);
      evoTrack.innerHTML = chain.map((tierItem, i) => {
        const isCurrent = tierItem.level === item.level;
        const isUnlocked = tierItem.level <= item.level;
        return `
          <div class="evo-step ${isCurrent ? 'is-current' : ''} ${isUnlocked ? 'is-unlocked' : 'is-locked'}">
            <div class="evo-icon-box tier-${tierItem.tier}">
              ${tierItem.svgString}
              ${isCurrent ? '<span class="current-pill">ATUAL</span>' : ''}
            </div>
            <div class="evo-name">${tierItem.name}</div>
            <div class="evo-meta">
              <span class="evo-lvl">Nv.${tierItem.level}</span>
              <span class="evo-dim">${tierItem.width}x${tierItem.height}</span>
            </div>
            <div class="evo-power">+${tierItem.power} DPS</div>
          </div>
          ${i < chain.length - 1 ? '<div class="evo-connector">➔</div>' : ''}
        `;
      }).join('');
    }

    if (nextMergeBox) {
      const nextTier = getNextTier(item.type, item.level);
      if (nextTier) {
        nextMergeBox.innerHTML = `
          <div class="next-merge-wrap">
            <span class="merge-callout-icon glow-pulse">⚡</span>
            <div class="merge-callout-text">
              <strong>Como Evoluir:</strong> Combine este item com outro <em>${item.name}</em> (Nv.${item.level}) para desbloquear 
              <span class="highlight-next-tier tier-${nextTier.tier}">${nextTier.name} (Nv.${nextTier.level})</span> 
              com tamanho <strong>${nextTier.width}x${nextTier.height}</strong> e poder absurdo de <strong>+${nextTier.power} DPS</strong>!
            </div>
          </div>
        `;
      } else {
        nextMergeBox.innerHTML = `
          <div class="next-merge-wrap max-level-wrap">
            <span class="merge-callout-icon">👑</span>
            <div class="merge-callout-text">
              <strong>NÍVEL MÁXIMO ALCANÇADO:</strong> Esta arma atingiu sua evolução cósmica suprema!
            </div>
          </div>
        `;
      }
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  closeWeaponInspector() {
    const modal = document.getElementById('weapon-inspector-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
    this.inspectedItem = null;
  }

  // Rotate an item directly on grid or stash
  rotateItem(item) {
    if (!item) return;
    const oldW = item.width;
    const oldH = item.height;
    const newW = oldH;
    const newH = oldW;

    if (item.row !== null && item.col !== null) {
      // It is placed on the grid
      this.grid.removeItem(item.id);
      const testItem = { ...item, width: newW, height: newH };
      if (this.grid.canPlaceItem(testItem, item.row, item.col)) {
        item.width = newW;
        item.height = newH;
        this.grid.placeItem(item, item.row, item.col);
        window.sound?.playTone(520, 'sine', 0.08);
      } else {
        // Return original
        this.grid.placeItem(item, item.row, item.col);
        window.sound?.playError();
      }
    } else {
      // In stash
      item.width = newW;
      item.height = newH;
      window.stashManager?.renderStash();
      window.sound?.playTone(520, 'sine', 0.08);
    }

    // Refresh inspector if open
    if (this.inspectedItem && this.inspectedItem.id === item.id) {
      this.openWeaponInspector(item);
    }
  }
}

