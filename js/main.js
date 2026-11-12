import { Dashboard } from './Dashboard.js';

const dashboard = new Dashboard(
  document.querySelector('#dashboard'),
  document.querySelector('#announcement'),
  document.querySelector('#widget-count'),
  document.querySelector('#empty-state')
);

document.querySelectorAll('[data-add]').forEach(button => {
  button.addEventListener('click', () => {
    dashboard.addWidget(button.dataset.add);
    if (button.dataset.add === 'currency') document.querySelector('.widget[data-type="currency"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

document.querySelector('#reset-dashboard').addEventListener('click', () => {
  if (window.confirm('Восстановить все виджеты? Сохранённые задачи будут удалены.')) dashboard.reset();
});
