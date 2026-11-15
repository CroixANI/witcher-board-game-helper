---
order: 0
node:
  id: s00-params
  type: choice
  title: 'Сколько игроков?'
  phase: setup
  pages: [6, 8]
  rules: [setup-overview]
  note: 'От числа игроков зависят трофеи за навыки, стартовые монстры, ведьмачьи трофеи и стартовые ресурсы.'
  options:
    - label: '2 игрока'
      hint: 'Хороший выбор для первой партии'
      next: s01-board
      setParam: { key: players, value: 2 }
    - label: '3 игрока'
      hint: 'Хороший выбор для первой партии'
      next: s01-board
      setParam: { key: players, value: 3 }
    - label: '4 игрока'
      hint: 'Лучше, когда все уже знают правила'
      next: s01-board
      setParam: { key: players, value: 4 }
    - label: '5 игроков'
      hint: 'Лучше, когда все уже знают правила'
      next: s01-board
      setParam: { key: players, value: 5 }
---
