// SPEC 11.2: svgo без prettify, viewBox сохраняется (в svgo 4 removeViewBox не входит в preset-default).
// aria-label и role остаются: это подпись иконки по умолчанию для <Icon>.
// Схема поля (R1.3): id зон и рамки-<rect> — контракт с board-zones.ts, поэтому svgo не удаляет
// «неиспользуемые» id, не превращает <rect> в <path> и не схлопывает группы зон.
export default {
  multipass: true,
  js2svg: { pretty: false },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: { cleanupIds: false, convertShapeToPath: false, collapseGroups: false },
      },
    },
  ],
};
