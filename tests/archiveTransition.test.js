import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveSlotIndex, captureArchiveSource, frontFacingYaw, getArchiveAssignments, resolveArchiveFlights } from '../src/archiveTransition.js';
import { projects, ringImages } from '../src/portfolio.js';

test('every Works project archives to its own distinct ring slot across the full circle', () => {
  const slots = projects.map((project, index) => {
    const candidates = ringImages.filter(image => image.project.id === project.id);
    const slot = candidates[archiveSlotIndex(index, candidates.length)];
    assert.equal(slot.project, project);
    return ringImages.indexOf(slot);
  });
  assert.equal(new Set(slots).size, projects.length);
  const ordered = [...slots].sort((a, b) => a - b);
  const gaps = ordered.map((slot, index) => (ordered[(index + 1) % ordered.length] - slot + ringImages.length) % ringImages.length);
  // Project counts change the repeated ring layout. A fourth partial cycle
  // may contain only copies; allow that tail while still bounding clustering.
  const maxGap = Math.ceil(ringImages.length / projects.length) * 2;
  assert.ok(Math.max(...gaps) <= maxGap, 'arrivals should cover the whole circle, not collect on one side');
});

test('the flight front face matches the ring image after its backside correction', () => {
  for (const yaw of [-740, -181, -120, -40, 0, 65, 120, 240, 360, 815]) {
    const front = frontFacingYaw(yaw);
    assert.ok(front >= -90 && front <= 90);
    const radians = yaw * Math.PI / 180;
    const normalized = front * Math.PI / 180;
    const flip = Math.cos(radians) < 0 ? -1 : 1;
    assert.ok(Math.abs(Math.cos(normalized) - Math.cos(radians) * flip) < 1e-10);
    assert.ok(Math.abs(Math.sin(normalized) - Math.sin(radians) * flip) < 1e-10);
  }
});

test('56 flights land one per ring slot, with 17 original projects and 39 visual copies', () => {
  const sources = projects.map((project, index) => ({ ...project, index }));
  const slots = ringImages.map(image => ({ id: image.id, projectId: image.project.id }));
  const assignments = getArchiveAssignments(sources, slots);
  assert.equal(assignments.length, 56);
  assert.equal(new Set(assignments.map(item => item.slot.id)).size, 56);
  assert.equal(assignments.filter(item => item.duplicate).length, 39);
  const originals = assignments.filter(item => !item.duplicate);
  assert.equal(originals.length, 17);
  assert.equal(new Set(originals.map(item => item.source.id)).size, 17);
  for (const { source, slot } of assignments) assert.equal(source.id, slot.projectId);
});

const bounds = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

function sourceCard(id, rect) {
  return {
    dataset: { projectId: id, archiveSrc: `/images/${id}-thumbnail.jpg` },
    getBoundingClientRect: () => rect,
    querySelector: () => ({ currentSrc: `/images/${id}-large.jpg`, naturalWidth: 800, naturalHeight: 600, style: { objectPosition: '40% center' } }),
  };
}

test('continuous document capture only treats photographs inside the actual viewport as visible', () => {
  const cards = [
    sourceCard('earlier', bounds(300, -400, 180, 135)),
    sourceCard('onscreen', bounds(520, 200, 180, 135)),
    sourceCard('later', bounds(740, 900, 180, 135)),
  ];
  const main = {
    getBoundingClientRect: () => bounds(24, -1800, 1000, 3200),
    querySelectorAll: () => cards,
  };
  const documentSnapshot = captureArchiveSource(main);
  assert.deepEqual(documentSnapshot.sources.map(source => source.from.visible), [true, true, true]);

  const snapshot = captureArchiveSource(main, bounds(24, 0, 1000, 800));
  assert.deepEqual(snapshot.sources.map(source => source.from.visible), [false, true, false]);
  assert.deepEqual(snapshot.viewport, { left: 24, top: 0, width: 1000, height: 800 });
  assert.equal(snapshot.sources[1].from.x, 520 + 90 - 24);
  assert.equal(snapshot.sources[1].from.y, 200 + 67.5);
  assert.ok(snapshot.sources[0].from.y < 0);
  assert.ok(snapshot.sources[2].from.y < 0);
  assert.equal(snapshot.sources[1].src, '/images/onscreen-thumbnail.jpg');
  assert.equal(snapshot.sources[1].position, '40% center');
});

test('document-anchored flights and their ring destinations move by the same amount during native scrolling', t => {
  let scrollY = 1400;
  const mainDocumentTop = 0;
  const sourceDocumentTop = 1620;
  const targetDocumentTop = 1920;
  const source = sourceCard('project', bounds(280, sourceDocumentTop - scrollY, 180, 135));
  const target = {
    dataset: { projectId: 'project', ringSlot: 'slot-1' },
    getBoundingClientRect: () => bounds(430, targetDocumentTop - scrollY, 96, 54),
  };
  const main = {
    getBoundingClientRect: () => bounds(20, mainDocumentTop - scrollY, 1000, 3200),
    querySelectorAll: selector => selector.startsWith('.work-thumbnail') ? [source] : [target],
  };
  const originalStyleDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'getComputedStyle');
  t.after(() => {
    if (originalStyleDescriptor) Object.defineProperty(globalThis, 'getComputedStyle', originalStyleDescriptor);
    else delete globalThis.getComputedStyle;
  });
  globalThis.getComputedStyle = () => ({
    width: '80px', height: '45px', perspective: '1200px', perspectiveOrigin: '40px 22.5px',
    getPropertyValue: property => ({ '--card-pitch': '-27', '--card-yaw': '240', '--card-opacity': '.6', '--card-depth': '210' })[property],
  });
  const snapshot = captureArchiveSource(main, bounds(20, 0, 1000, 800));
  const [flight] = resolveArchiveFlights(snapshot, main);
  const documentTop = -main.getBoundingClientRect().top;
  assert.equal(flight.to.scale, 1.2);
  assert.equal(flight.to.yaw, 60);
  assert.equal(flight.projectId, 'project');

  for (const delta of [0, 85, 270, -110]) {
    scrollY = 1400 + delta;
    const overlayTop = main.getBoundingClientRect().top + documentTop;
    const targetRect = target.getBoundingClientRect();
    assert.equal(overlayTop + flight.to.y, targetRect.top + targetRect.height / 2);
    assert.equal(overlayTop + flight.from.y, sourceDocumentTop - scrollY + 135 / 2);
    assert.equal(main.getBoundingClientRect().left + flight.to.x, targetRect.left + targetRect.width / 2);
  }
});
