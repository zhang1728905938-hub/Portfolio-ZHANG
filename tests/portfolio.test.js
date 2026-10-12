import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { categories, projects, ringImages } from '../src/portfolio.js';

test('Works has 17 distinct projects split into the requested four categories', () => {
  assert.equal(projects.length, 17);
  assert.equal(new Set(projects.map(project => project.id)).size, 17);
  assert.deepEqual(categories.map(category => category.id), ['work', 'academic', 'aigc', 'other']);
  assert.deepEqual(categories.map(category => projects.filter(project => project.category === category.id).length), [5, 5, 4, 3]);
  assert.deepEqual(projects.filter(project => project.category === 'work').map(project => project.id), ['01', '02', '03', '15', '19']);
  assert.deepEqual(projects.filter(project => project.category === 'academic').map(project => project.id), ['04', '05', '06', '07', '08']);
  assert.deepEqual(projects.filter(project => project.category === 'aigc').map(project => project.id), ['09', '10', '17', '18']);
  assert.deepEqual(projects.filter(project => project.category === 'other').map(project => project.id), ['11', '13', '12']);
  for (const category of categories) {
    const group = projects.filter(project => project.category === category.id);
    assert.equal(new Set(group.map(project => project.image)).size, group.length, `${category.id} repeats a photograph`);
  }
});

test('all projects have existing local cover photographs with English paths', () => {
  for (const project of projects) {
    for (const path of [project.image, project.thumbnail]) {
      assert.match(path, /^\/images\/[a-z0-9-]+\.(jpg|webp)$/);
      assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `${project.id}: missing ${path}`);
    }
  }
});

test('the first Work Project displays all eleven uploaded photographs in order and uses 01 as its cover', () => {
  const project = projects.find(item => item.category === 'work');
  assert.equal(project.id, '01');
  const numbers = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
  assert.deepEqual(project.gallery.map(image => image.number), numbers);
  assert.deepEqual(project.gallery.map(image => image.src), numbers.map(number => `/images/work-project-01-${number}.webp`));
  assert.deepEqual(project.gallery.map(image => image.fullSrc), numbers.map(number => `/images/work-project-01-${number}.jpg`));
  assert.equal(project.image, project.gallery[0].src);
  assert.equal(project.imageWidth, project.gallery[0].width);
  assert.equal(project.thumbnail, '/images/work-project-01-01-sm.webp');

  for (const image of project.gallery) {
    for (const path of [image.src, image.fullSrc]) {
      assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `Gallery image ${image.number}: missing ${path}`);
    }
    const preview = readFileSync(new URL(`../public${image.src}`, import.meta.url));
    assert.equal(preview.toString('ascii', 0, 4), 'RIFF', `${image.number}: invalid WebP preview`);
    assert.equal(preview.toString('ascii', 8, 12), 'WEBP', `${image.number}: invalid WebP preview`);
  }
});

test('full gallery images preserve the bytes of the eleven uploaded originals', () => {
  // Digests were read from WORK PROJECT/01 project/01.jpg through 11.jpg.
  // Keep the check independent of the authoring folder in distributed checkouts.
  const originalDigests = [
    'fc5dd34f37b91f6183a35a09dd961d934ea7be548701b09ebc5928b4accb97e2',
    'cd5e73b8857832683bd09d7a115b9c07880d9f991187ed34cf8ffb60746247b8',
    'db486aadc213f05a0859b87282aee6c308eb2771426d0abf8d4f7c6d8a2c1344',
    'd7bdcd1fd8cac56492c9d7939ad54dcd0f6052e983a1ec6cfb4ed73493beaeae',
    '6c069a05dbfbcda8fa8aeb2482c435a984f0a05f1b6132d3e4c17bedd6bf4e24',
    'a0506cd3075a4f02c3bc5e26207c5d23700a4b4fa89bcd62e8ed302d5ca7b9ec',
    '407974ca538d7622fbb1c19a40ee390baf5a7f8ec0b219d785770ff7a2cf7653',
    '883c013d6b3307d86cb9fa159fd70d30119a70932f0f19e47a9d3fddfd77dd6c',
    '8681ee04ed1ed3e4135eb614322289d927b3b4d6b9bd809054490adc6f3bb936',
    'bf98b69998a85f006de7e8e9ebf2d5311bbd9aca2e9453cd293e087b0878d315',
    '043949edf8a4ac8d4642e93e7bc2697250d1bd370d80710e5930b91a1da37b75',
  ];
  const project = projects.find(item => item.id === '01');
  for (const [index, image] of project.gallery.entries()) {
    const original = readFileSync(new URL(`../public${image.fullSrc}`, import.meta.url));
    const digest = createHash('sha256').update(original).digest('hex');
    assert.equal(digest, originalDigests[index], `${image.number}: full image differs from the uploaded original`);
  }
});

const addedWorkGalleries = [
  { folder: '02', projectId: '02', extension: 'jpg', dimensions: [[1436, 755], ...Array.from({ length: 9 }, () => [2400, 1694])] },
  { folder: '03', projectId: '03', extension: 'jpg', dimensions: Array.from({ length: 4 }, () => [2400, 1694]) },
  { folder: '04', projectId: '15', extension: 'png', dimensions: [[2400, 1350], [2400, 2400], ...Array.from({ length: 5 }, () => [2400, 1350])] },
  { folder: '05', projectId: '19', extension: 'png', dimensions: [...Array.from({ length: 5 }, () => [2048, 1152]), [2400, 1599], [2400, 2400]] },
];

for (const { folder, projectId, extension, dimensions } of addedWorkGalleries) {
  test(`Work Project ${folder} keeps every uploaded image in order, preserves its proportions, and uses cover 01`, () => {
    const project = projects.find(item => item.id === projectId);
    assert.ok(project, `Missing Work Project ${folder}`);
    assert.equal(project.category, 'work');
    assert.ok(Array.isArray(project.gallery), `${folder}: missing gallery`);
    const numbers = dimensions.map((_, index) => String(index + 1).padStart(2, '0'));
    assert.deepEqual(project.gallery.map(image => image.number), numbers);
    assert.deepEqual(project.gallery.map(image => image.src), numbers.map(number => `/images/work-project-${folder}-${number}.webp`));
    assert.deepEqual(project.gallery.map(image => image.fullSrc), numbers.map(number => `/images/work-project-${folder}-${number}.${extension}`));
    // Includes the square source sheets and smaller covers that must not be
    // stretched to a shared landscape ratio or unnecessarily upscaled.
    assert.deepEqual(project.gallery.map(image => [image.width, image.height]), dimensions);
    assert.equal(project.image, project.gallery[0].src);
    assert.equal(project.imageWidth, project.gallery[0].width);
    assert.equal(project.thumbnail, `/images/work-project-${folder}-01-sm.webp`);

    for (const image of project.gallery) {
      for (const path of [image.src, image.fullSrc]) {
        assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `${folder}/${image.number}: missing ${path}`);
      }
      const preview = readFileSync(new URL(`../public${image.src}`, import.meta.url));
      assert.equal(preview.toString('ascii', 0, 4), 'RIFF', `${folder}/${image.number}: invalid WebP preview`);
      assert.equal(preview.toString('ascii', 8, 12), 'WEBP', `${folder}/${image.number}: invalid WebP preview`);
    }
  });
}

const academicGalleries = [
  { folder: '01', projectId: '04', originalDigests: [
    '8fecc169e151aa9aec03d678c6bb84f60bc6b59e5042bd18e5d02290738b4529',
    '62cedc64279651408e8b11a1165750692da6e517c6297200071c1ee98ac48fc6',
    'fd33c106e85e344e3cc0be69333be9e54096d9a6190e1452a907c8265ca8f561',
    'de72ddbbdb6f3b917a5697da500d5621f4654de4da8187795ced30e7cd71e68e',
    '38568fee88d8516c2887a93b35f296ba691694be71b32f547abaf9e2f96927b2',
    '7022f395eac67227c3685e99547fa9721dcc1f4d34ee86e98b867ab5afb9a6d7',
    '062fc7585c221926470e82e511ec216168cd76584e70a1ce590c15abd757ae59',
    'dbf5d9be99df6e2ccda6832aaa28b47b52f00e51bb8f6ad0053c149fc43859b6',
    '6c7ceb80480aa5dfdef2792d925dfaca5b1c34590a98d0a95b7b9b95751b4da7',
  ] },
  { folder: '02', projectId: '05', originalDigests: [
    'f93d5cc9152c3e63c626f488230360e57b472cd97616af0a1a21f2bd1a39e145',
    '88aafdde0b04686ca85a206ce88e8c0897f05c0dc1647a50dd4bb979825cd52e',
    'b83675e60fdde4f90835a6238153994cb2e441d35476c098a6e4c88188af3c09',
    'd7576d5e088aa04fc22f97f7077b014c26ed7823abd2bdfb3b2064c016dfc481',
    'c746c077d835eea046a4fba19510714b76b506fbf9bbe975b94a7032145ba213',
    '37a7ba6cad2707e3de55b1d4149ea4215576fedc6d73f35eb7325a297a320934',
  ] },
  { folder: '03', projectId: '06', coverNumber: '04', originalDigests: [
    '5b8dc8bc76c8aea500dd429b403fa795f9cc9abec2c1902aa6d433e35ee57dc1',
    'f8ad18d339a46fa8bfc95090295961ad004a85c13425a7d42a845dd7dc1e3e1c',
    '2fc15520230b17cc09f810d20ad0c17329fd204bed38a75c77660588aca6efdd',
    '574d1289e4780aa16419ed1ca6d8f1cef1150de0e676c4a936444496f57a0a64',
    'e5b62de4dc79bae00e1626eb3dc5057964d236265d801158b60dcc9d21aebbcd',
    'f3d44b72c30941b3ffd5673e8518eaa0b40a65b34a0a57da0aa2311b68090daf',
  ] },
  { folder: '04', projectId: '07', originalDigests: [
    '0ed2138f5612d99eda8a692b3a4e6754af763135b3ffa865b3fd15f4f82ca798',
    '61b093e3d9a35a8364c4cbc8084cba431e0f853a9568d793ebe2c12afeed489d',
    '3fdf2f2468ffab67e104e28e04c79f2e8b389d5c18142be5317e22085e70f91f',
    '3c6cfa7da459fa0eff316a8926fc342efb7beb11e74a31ec5d902c2f20ff9821',
    'b21ac96b1f88d413069d6cad3d9cde210c9e36775675f0c517d022f134c680ac',
  ] },
  { folder: '05', projectId: '08', originalDigests: [
    '31a8c5081ae25c5fc70a240be5c25897717ba6bee56d7dd7f08c807a9821ae34',
    'fbd63e7021ec8ab9afed8f6cf47be66f58029539b3abaa2b4570d5a7ebd2b40d',
    '28d8397af4abb5966d5f0517b705fcc0442295c2ed689518fe4d792ce5d5502b',
    '7e68076507e15548176ef24bfc0b6c7044d3027e3c1f3a2be76444c4610c3c1b',
    '83d0997a5b59421ae149130044537e666b8ca68a57aec2c5feb1594d229bfa91',
  ] },
];

for (const { folder, projectId, coverNumber = '01', originalDigests } of academicGalleries) {
  test(`Academic Project ${folder} preserves all ${originalDigests.length} uploaded sheets in order and uses cover ${coverNumber}`, () => {
    const project = projects.find(item => item.id === projectId);
    assert.ok(project, `Missing Academic Project ${folder}`);
    assert.equal(project.category, 'academic');
    assert.ok(Array.isArray(project.gallery), `${folder}: missing Academic gallery`);
    const numbers = originalDigests.map((_, index) => String(index + 1).padStart(2, '0'));
    assert.deepEqual(project.gallery.map(image => image.number), numbers);
    assert.deepEqual(project.gallery.map(image => image.src), numbers.map(number => `/images/academic-project-${folder}-${number}.webp`));
    assert.deepEqual(project.gallery.map(image => image.fullSrc), numbers.map(number => `/images/academic-project-${folder}-${number}.jpg`));
    // All 31 source sheets are 4299 x 3035; their full layouts retain the
    // same landscape proportions in the 2400 x 1694 gallery previews.
    assert.deepEqual(project.gallery.map(image => [image.width, image.height]), numbers.map(() => [2400, 1694]));
    const cover = project.gallery.find(image => image.number === coverNumber);
    assert.equal(project.image, cover.src);
    assert.equal(project.imageWidth, cover.width);
    assert.equal(project.thumbnail, `/images/academic-project-${folder}-${coverNumber}-sm.webp`);
    assert.equal(project.thumbnailWidth, 480);

    for (const [index, image] of project.gallery.entries()) {
      for (const path of [image.src, image.fullSrc]) {
        assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `Academic ${folder}/${image.number}: missing ${path}`);
      }
      const preview = readFileSync(new URL(`../public${image.src}`, import.meta.url));
      assert.equal(preview.toString('ascii', 0, 4), 'RIFF', `Academic ${folder}/${image.number}: invalid WebP preview`);
      assert.equal(preview.toString('ascii', 8, 12), 'WEBP', `Academic ${folder}/${image.number}: invalid WebP preview`);
      // Digests were independently read from ACADEMIC PROJECT/XX project sources.
      const original = readFileSync(new URL(`../public${image.fullSrc}`, import.meta.url));
      const digest = createHash('sha256').update(original).digest('hex');
      assert.equal(digest, originalDigests[index], `Academic ${folder}/${image.number}: full image differs from the uploaded original`);
    }
  });
}

const aigcGalleries = [
  { folder: '01', projectId: '09', count: 4 },
  { folder: '02', projectId: '10', count: 3 },
  { folder: '03', projectId: '17', count: 5 },
  { folder: '04', projectId: '18', count: 2 },
];

for (const { folder, projectId, count } of aigcGalleries) {
  test(`AIGC Project ${folder} keeps all ${count} uploaded sheets in order and uses its own 01 cover`, () => {
    const project = projects.find(item => item.id === projectId);
    assert.ok(project, `Missing AIGC Project ${folder}`);
    assert.equal(project.category, 'aigc');
    assert.ok(Array.isArray(project.gallery), `${folder}: missing AIGC gallery`);
    const numbers = Array.from({ length: count }, (_, index) => String(index + 1).padStart(2, '0'));
    assert.deepEqual(project.gallery.map(image => image.number), numbers);
    assert.deepEqual(project.gallery.map(image => image.src), numbers.map(number => `/images/aigc-project-${folder}-${number}.webp`));
    assert.deepEqual(project.gallery.map(image => image.fullSrc), numbers.map(number => `/images/aigc-project-${folder}-${number}.jpg`));
    // All fourteen source sheets were checked: 4299 x 3035 with no EXIF
    // rotation. Their complete landscape layouts scale to 2400 x 1694.
    assert.deepEqual(project.gallery.map(image => [image.width, image.height]), numbers.map(() => [2400, 1694]));
    assert.equal(project.image, project.gallery[0].src);
    assert.equal(project.imageWidth, project.gallery[0].width);
    assert.equal(project.thumbnail, `/images/aigc-project-${folder}-01-sm.webp`);
    assert.equal(project.thumbnailWidth, 480);

    for (const image of project.gallery) {
      for (const path of [image.src, image.fullSrc]) {
        assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `AIGC ${folder}/${image.number}: missing ${path}`);
      }
      const preview = readFileSync(new URL(`../public${image.src}`, import.meta.url));
      assert.equal(preview.toString('ascii', 0, 4), 'RIFF', `AIGC ${folder}/${image.number}: invalid WebP preview`);
      assert.equal(preview.toString('ascii', 8, 12), 'WEBP', `AIGC ${folder}/${image.number}: invalid WebP preview`);
    }
  });
}

const otherGalleries = [
  { folder: '01', projectId: '11', originalDigests: [
    '7e671549464b7471c395eaccab2a352c0b6f9ae02100afcb20a85163e148bb93',
    '5ce52539fd44decb8d39d2ba558e5d0125b6d73568d8209eca0887057720171b',
    '7be2f33bb624e93e7bdf10855348a5bff9b32704d9e8401fc374035b31e2e078',
  ] },
  { folder: '02', projectId: '12', originalDigests: [
    'c86a1e864ef3546e31367c24488ecea6046931451ae5056644d0dab06ad70ef0',
  ] },
  { folder: '03', projectId: '13', originalDigests: [
    '1ed9ad17665fea8ac4b8f5a7843790ae377f7f13ffbf7f8910d9efa0b0f664a7',
    '6ff4612dbe36056b2093dbfce1ed141e04d473426bfd023a0636d03563c33fed',
  ] },
];

for (const { folder, projectId, originalDigests } of otherGalleries) {
  test(`Other Project ${folder} preserves its uploaded sheets, numeric order, dimensions, and 01 cover`, () => {
    const project = projects.find(item => item.id === projectId);
    assert.ok(project, `Missing Other Project ${folder}`);
    assert.equal(project.category, 'other');
    assert.ok(Array.isArray(project.gallery), `${folder}: missing Other gallery`);
    const numbers = originalDigests.map((_, index) => String(index + 1).padStart(2, '0'));
    assert.deepEqual(project.gallery.map(image => image.number), numbers);
    assert.deepEqual(project.gallery.map(image => image.src), numbers.map(number => `/images/other-project-${folder}-${number}.webp`));
    assert.deepEqual(project.gallery.map(image => image.fullSrc), numbers.map(number => `/images/other-project-${folder}-${number}.jpg`));
    // The six source sheets are all 4299 x 3035, retaining their full
    // composition in the optimized 2400 x 1694 previews.
    assert.deepEqual(project.gallery.map(image => [image.width, image.height]), numbers.map(() => [2400, 1694]));
    assert.equal(project.image, project.gallery[0].src);
    assert.equal(project.imageWidth, project.gallery[0].width);
    assert.equal(project.thumbnail, `/images/other-project-${folder}-01-sm.webp`);
    assert.equal(project.thumbnailWidth, 480);

    for (const [index, image] of project.gallery.entries()) {
      for (const path of [image.src, image.fullSrc]) {
        assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `Other ${folder}/${image.number}: missing ${path}`);
      }
      const preview = readFileSync(new URL(`../public${image.src}`, import.meta.url));
      assert.equal(preview.toString('ascii', 0, 4), 'RIFF', `Other ${folder}/${image.number}: invalid WebP preview`);
      assert.equal(preview.toString('ascii', 8, 12), 'WEBP', `Other ${folder}/${image.number}: invalid WebP preview`);
      // Digests were independently read from OTHER WORK/XX PROJECT sources.
      const original = readFileSync(new URL(`../public${image.fullSrc}`, import.meta.url));
      const digest = createHash('sha256').update(original).digest('hex');
      assert.equal(digest, originalDigests[index], `Other ${folder}/${image.number}: full image differs from the uploaded original`);
    }
  });
}

test('the final-page ring gives every Works project matching archive destinations across 56 positions', () => {
  assert.equal(ringImages.length, 56);
  assert.equal(new Set(ringImages.map(image => image.id)).size, 56);
  assert.deepEqual(ringImages.map(image => image.id), Array.from({ length: 56 }, (_, index) => `ring-${index + 1}`));
  assert.deepEqual(new Set(ringImages.map(image => image.project.id)), new Set(projects.map(project => project.id)));
  for (const [index, image] of ringImages.entries()) {
    assert.strictEqual(image.project, projects[index % projects.length]);
  }
  const repetitions = projects.map(project => ringImages.filter(image => image.project === project).length);
  assert.deepEqual(repetitions, [...Array(5).fill(4), ...Array(12).fill(3)]);
});
