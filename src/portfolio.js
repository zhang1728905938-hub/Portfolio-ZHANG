import { workProjectGalleries } from './workProjectGalleries.js';
import { academicProjectGalleries } from './academicProjectGalleries.js';
import { aigcProjectGalleries } from './aigcProjectGalleries.js';
import { otherProjectGalleries } from './otherProjectGalleries.js';
import { resolveProjectMedia } from './publicAssetUrl.js';

// Asset metadata keeps local paths; a configured media base resolves them for deployment.
export const profile = {
  name: 'Rui Zhang',
  role: 'Architectural Designer',
  email: 'rui.zhang1@aalumni.org',
  phone: '18773772732',
  location: 'Open to possibilities, everywhere.',
  introduction: 'Thoughtful architecture at the intersection of people, place, and possibility. Designing with sensitivity to context, material, and everyday life.',
  chineseIntroduction: '以建筑回应生活，在空间中探索更多可能。',
  experience: 'Add your practice, position, project responsibilities, and dates.',
  education: 'Add your university, degree, and graduation year.',
  skills: ['Rhino', 'Grasshopper', 'Revit', 'AutoCAD', 'Adobe Suite', 'AI workflows'],
};

export const categories = [
  { id: 'work', label: 'WORK PROJECT', short: 'Practice', description: 'Spaces shaped by context. Architecture made for life.' },
  { id: 'academic', label: 'ACADEMIC PROJECT', short: 'Research', description: 'Questions, experiments, and new spatial perspectives.' },
  { id: 'aigc', label: 'AIGC & MODELLING', short: 'Exploration', description: 'Where computational thinking meets architectural imagination.' },
  { id: 'other', label: 'OTHER WORKS', short: 'Observation', description: 'An open collection of objects, details, and everyday discoveries.' },
];

const makeProject = (id, category, title, subtitle, image, year, position = 'center') => ({
  id, category, title, subtitle, image: `/images/${image}.jpg`, thumbnail: `/images/${image}-sm.webp`, year, position,
  description: 'An exploration of light, proportion, and the relationship between architecture and its surroundings. This illustrative project is a space for your own story: the brief, the design process, and the ideas that make the work yours.',
  sample: true,
});

const workProject01Gallery = Array.from({ length: 11 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    number,
    src: `/images/work-project-01-${number}.webp`,
    fullSrc: `/images/work-project-01-${number}.jpg`,
    width: 2400,
    height: 1694,
  };
});

// Keep new projects numbered until their own titles and credits are supplied.
const makeWorkProject = (id, number) => ({
  id,
  category: 'work',
  title: `Project ${number}`,
  position: 'center',
  showYear: false,
  showFullDescription: true,
  sample: false,
  ...workProjectGalleries[number],
});

const makeAcademicProject = (id, number) => ({
  id,
  category: 'academic',
  title: `Academic Project ${number}`,
  position: 'center',
  showYear: false,
  showFullDescription: true,
  sample: false,
  ...academicProjectGalleries[number],
});

const makeAigcProject = (id, number) => ({
  id,
  category: 'aigc',
  categoryLabel: 'AIGC &MODELLING PROJECT',
  title: `AIGC Project ${number}`,
  position: 'center',
  showYear: false,
  showFullDescription: true,
  sample: false,
  ...aigcProjectGalleries[number],
});

const makeOtherProject = (id, number) => ({
  id,
  category: 'other',
  categoryLabel: 'INDUSTRIAL DESIGN',
  title: `Other Project ${number}`,
  position: 'center',
  showYear: false,
  showFullDescription: true,
  sample: false,
  ...otherProjectGalleries[number],
});

export const projects = [
  {
    ...makeProject('01', 'work', "Chongqing Central Mix'c (Interior +Rooftop Design)", 'Chongqing, China - Commercial Building - Completed in 2027', 'sculpted-light', '2027'),
    titleZh: '重庆中环万象城室内及屋顶街区设计',
    showYear: false,
    description: [
      'Work Project: Coldefy & Associés Architectes Urbanistes,RADI',
      'Architect in charge: Thomas Coldefy, Denis Montel',
      'Client: HKL & CRL',
      'Date: March. 2024',
      'Area: 170,000 sq.m.',
    ].join('\n'),
    showFullDescription: true,
    sample: false,
    image: workProject01Gallery[0].src,
    imageWidth: workProject01Gallery[0].width,
    thumbnail: '/images/work-project-01-01-sm.webp',
    gallery: workProject01Gallery,
  },
  {
    ...makeWorkProject('02', '02'),
    title: 'Shanghai School International Division And Changqing School Competition Design',
    titleZh: '上海中学国际部虹口校区与长青学校规划设计',
    subtitle: 'Shanghai, China - Educational Building - Competition Design',
    description: [
      'Work Project: Studio Link-Arc, LLC',
      'Architect in charge: Yichen Lu',
      'Status: 2nd Prize of competition',
      'Site: Shanghai, China',
      'Date: September. 2023',
      'Area: 30764 sq.m.',
    ].join('\n'),
  },
  {
    ...makeWorkProject('03', '03'),
    title: 'Conceptual Design Of Literature And Art Center Project, Shenzhen',
    titleZh: '深圳文学艺术中心建筑概念设计',
    subtitle: 'Shenzhen, China - Cultural Building - Completed in 2027',
    description: [
      'Work Project: Studio Link-Arc, LLC',
      'Architect in charge: Yichen Lu',
      'Status: 1nd Prize of competition',
      'Site: Shenzhen, China',
      'Date: August. 2023',
      'Area: 18909 sq.m.',
    ].join('\n'),
  },
  {
    ...makeWorkProject('15', '04'),
    title: "Chongqing Mix'c Renovation",
    titleZh: '重庆万象城改造',
    subtitle: 'Chongqing, China - Commercial Building - Competition Design',
    description: [
      'Work Project: Coldefy & Associés Architectes Urbanistes',
      'Architect in charge: Zhuo Wang',
      'Client: CRL',
      'Site: Chongqing, China',
      'Date: January. 2026',
    ].join('\n'),
  },
  {
    ...makeWorkProject('19', '05'),
    title: "Nanning Mix'c Renovation",
    titleZh: '南宁万象城改造',
    subtitle: 'Nanning, China - Commercial Building - Completed in 2028',
    description: [
      'Work Project: Coldefy & Associés Architectes Urbanistes',
      'Architect in charge: Zhuo Wang',
      'Client: CRL',
      'Site: Nanning, China',
      'Date: March. 2026',
    ].join('\n'),
  },
  {
    ...makeAcademicProject('04', '01'),
    title: 'IMAGE-VERSE',
    titleSubtitle: '-[ CYBER-URBAN INCUBATOR 2: METAVERSE URBANISM ]',
    titleZh: '元意向城市\n-元城市孵化器2：虚拟城市主义',
    subtitle: 'London, UK - Urban Design',
    description: [
      'Academic Project: Architectural Association School of  Architecture（AA）',
      'Team Work: Rui Zhang  Zihan Xu  Qiurong Lai  Qinling Li  Dan Wang',
      'Tutor: Patrik Schumacher, Jose Pareja-Gomez, Philipp Siedler',
      'Date: January 28. 2022',
    ].join('\n'),
  },
  {
    ...makeAcademicProject('05', '02'),
    title: 'CIRCLE',
    titleSubtitle: '-[ Co-living Based On Rapid Transit ]',
    titleZh: '环形城市城市\n-基于快速运输体系的城市共居',
    subtitle: 'Xinjiang, China - Urban Design',
    description: [
      'Academic Project: Competition',
      'Team Work: Rui Zhang   Qizheng Zhang   Huining Zheng',
      'Date: October 02. 2023',
    ].join('\n'),
  },
  {
    ...makeAcademicProject('06', '03'),
    title: 'CAIRN',
    titleSubtitle: '-[ Observation Station ]',
    titleZh: '堆石\n-观察站',
    subtitle: 'Iceland - Urban Design',
    description: [
      'Academic Project: Competition',
      'Team Work: Rui Zhang   Qizheng Zhang   Huining Zheng',
      'Date: December 03. 2025',
    ].join('\n'),
  },
  {
    ...makeAcademicProject('07', '04'),
    title: 'TOPOS PAVILION',
    titleSubtitle: '-[ Find a Type From The Natural Structure ]',
    titleZh: '拓扑亭子\n-从自然逻辑中找型',
    subtitle: 'London, UK - Pavilion Design',
    description: [
      'Academic Project: Architectural Association School of  Architecture（AA）',
      'Team Work: Rui Zhang   Qizheng Zhang   Luyao Huang',
      'Tutor: Pierandrea Anguis',
      'Date: September 28. 2021',
    ].join('\n'),
  },
  {
    ...makeAcademicProject('08', '05'),
    title: 'COMMERCIAL IN RESIDENTIAL',
    titleSubtitle: '-[ High-rise Residence ]',
    titleZh: '居住在商铺中\n-低收入人群高密度住宅新可能',
    subtitle: 'Hongkong, China - High-rise Residence Design',
    description: [
      'Academic Project: Competition',
      'Team Work: Rui Zhang',
      'Date: March 03. 2019',
    ].join('\n'),
  },
  {
    ...makeAigcProject('09', '01'),
    title: 'COLLAPSAR THEATRE V1',
    titleZh: '黑洞剧院',
    description: [
      'Individual Work: Rui Zhang',
      'Date: April 02. 2026',
    ].join('\n'),
  },
  {
    ...makeAigcProject('10', '02'),
    title: 'COLLAPSAR THEATRE V2',
    titleZh: '黑洞剧院',
    description: [
      'Individual Work: Rui Zhang',
      'Date: July 10. 2026',
    ].join('\n'),
  },
  {
    ...makeAigcProject('17', '03'),
    title: 'MODULAR RESIDENCE',
    titleZh: '模块住宅',
    description: [
      'Individual Work: Rui Zhang',
      'Date: September 11. 2026',
    ].join('\n'),
  },
  {
    ...makeAigcProject('18', '04'),
    title: 'LIBERLAND MODEL PRACTICE',
    titleZh: '利伯市民中心模型练习',
    description: [
      'Individual Work: Rui Zhang',
      'Date: September 20. 2024',
    ].join('\n'),
  },
  {
    ...makeOtherProject('11', '01'),
    title: 'ZHOU XI',
    titleZh: '舟息（线香盘设计）',
    description: [
      'Individual Work: Rui Zhang',
      'Date: July 20. 2025',
    ].join('\n'),
  },
  {
    ...makeOtherProject('13', '03'),
    title: 'BLOOM',
    titleZh: '绽放（首饰盘设计）',
    description: [
      'Individual Work: Rui Zhang',
      'Date: March 20. 2025',
    ].join('\n'),
  },
  {
    ...makeOtherProject('12', '02'),
    title: 'REVOLVE',
    titleZh: '扭转（花瓶设计）',
    description: [
      'Individual Work: Rui Zhang',
      'Date: March 12. 2024',
    ].join('\n'),
  },
].map(project => resolveProjectMedia(project));

// Include every Works project in display order so each photograph has a matching
// destination for the archive transition, while keeping the ring's 56 positions.
export const ringImages = Array.from({ length: 56 }, (_, index) => ({
  id: `ring-${index + 1}`,
  project: projects[index % projects.length],
}));
