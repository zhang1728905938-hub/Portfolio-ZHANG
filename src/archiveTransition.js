// Keep project identity through the transition, even when projects reuse a photo.
export function captureArchiveSource(viewport, bounds = viewport.getBoundingClientRect()) {
  const sources = [...viewport.querySelectorAll('.work-thumbnail[data-project-id]')].map((card, index) => {
    const rect = card.getBoundingClientRect();
    const image = card.querySelector('img');
    const visible = rect.bottom > bounds.top + 8 && rect.top < bounds.bottom - 8;
    return {
      id: card.dataset.projectId,
      index,
      // The existing 480px thumbnail is enough for these short-lived layers.
      src: card.dataset.archiveSrc || image.currentSrc || image.src,
      imageAspect: image.naturalWidth / image.naturalHeight || 16 / 9,
      position: image.style.objectPosition || 'center',
      from: {
        x: rect.left + rect.width / 2 - bounds.left,
        // Earlier projects join from above the viewport, in their original columns.
        y: visible ? rect.top + rect.height / 2 - bounds.top : -rect.height / 2 - Math.min(index, 10) * 6,
        width: rect.width,
        height: rect.height,
        visible,
      },
    };
  });
  return {
    viewport: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
    sources,
  };
}

export function archiveSlotIndex(projectIndex, count) {
  // Alternate the repetitions to distribute project arrivals over the ring.
  return projectIndex % Math.min(3, Math.max(1, count));
}

export function frontFacingYaw(degrees) {
  let yaw = ((degrees + 180) % 360 + 360) % 360 - 180;
  if (yaw > 90) yaw -= 180;
  if (yaw < -90) yaw += 180;
  return yaw;
}

export function getArchiveAssignments(sources, slots) {
  const byProject = new Map(sources.map(source => [source.id, source]));
  const primarySlots = new Set(sources.map(source => {
    const candidates = slots.filter(slot => slot.projectId === source.id);
    return candidates[archiveSlotIndex(source.index, candidates.length)]?.id;
  }));
  return slots.flatMap((slot, index) => {
    const source = byProject.get(slot.projectId);
    return source ? [{ source, slot, index, duplicate: !primarySlots.has(slot.id) }] : [];
  });
}

export function resolveArchiveFlights(snapshot, viewport) {
  const slots = [...viewport.querySelectorAll('.spatial-ring-item[data-project-id]')].map(target => ({
    id: target.dataset.ringSlot, projectId: target.dataset.projectId, target,
  }));
  return getArchiveAssignments(snapshot.sources, slots).map(({ source, slot, index, duplicate }) => {
    const target = slot.target;
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    if (!(width > 0 && height > 0)) return null;
    const value = (property, fallback) => parseFloat(style.getPropertyValue(property)) || fallback;
    let from = source.from;
    if (duplicate) {
      // A second, smaller stream fills every remaining ring position. Reuse
      // each project's photograph, with staggered origins above the grid.
      const variation = .62 + (index % 7) * .045;
      const startWidth = Math.min(source.from.width * variation, snapshot.viewport.width * .145);
      const startHeight = startWidth * 9 / 16;
      const destinationX = rect.left + rect.width / 2 - snapshot.viewport.left;
      const fan = Math.sin(index * 2.39996) * snapshot.viewport.width * .11;
      const x = source.from.x * .6 + destinationX * .4 + fan;
      from = {
        x: Math.max(startWidth / 2, Math.min(snapshot.viewport.width - startWidth / 2, x)),
        y: -startHeight / 2 - (index % 5) * 12,
        width: startWidth, height: startHeight, visible: false,
      };
    } else if (!from.visible) {
      const startWidth = Math.min(from.width, snapshot.viewport.width * .19);
      from = { ...from, width: startWidth, height: startWidth * 9 / 16, y: -startWidth * 9 / 32 - (source.index % 4) * 10 };
    }
    return {
      ...source,
      id: slot.id,
      projectId: source.id,
      slot: slot.id,
      duplicate,
      from,
      to: {
        x: rect.left + rect.width / 2 - snapshot.viewport.left,
        y: rect.top + rect.height / 2 - snapshot.viewport.top,
        width,
        height,
        scale: rect.width / width,
        perspective: parseFloat(style.perspective),
        perspectiveOrigin: style.perspectiveOrigin,
        pitch: value('--card-pitch', -27),
        yaw: frontFacingYaw(value('--card-yaw', 0)),
        opacity: value('--card-opacity', 1),
        depth: value('--card-depth', 0),
      },
    };
  }).filter(Boolean).sort((a, b) => Number(a.duplicate) - Number(b.duplicate) || Number(b.from.visible) - Number(a.from.visible) || a.index - b.index);
}
