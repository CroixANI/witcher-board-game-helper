---
order: 4
node:
  id: s04-skill-trophies
  type: step
  title: '④ Карты трофеев за навыки'
  phase: setup
  pages: 6
  rules: [setup-skill-trophies]
  components: [skill-trophy]
  zones: [z-skill-trophies]
  checklist:
    - text: 'Отберите по 1 трофею на каждый навык: сражение, защита, алхимия, специализация — всего 4 карты'
      showIf: { players: [2, 3] }
    - text: 'Оставшиеся 4 трофея за навыки уберите в коробку'
      showIf: { players: [2, 3] }
    - text: 'Возьмите все 8 трофеев за навыки'
      showIf: { players: [4, 5] }
    - text: 'Сложите трофеи в колоду и положите на её место у поля'
  next: s05-exploration-events
---
