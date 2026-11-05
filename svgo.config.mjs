// SPEC 11.2: svgo без prettify, viewBox сохраняется (в svgo 4 removeViewBox не входит в preset-default).
// aria-label и role остаются: это подпись иконки по умолчанию для <Icon>.
export default {
  multipass: true,
  js2svg: { pretty: false },
  plugins: ['preset-default'],
};
