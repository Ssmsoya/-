import { UIComponent } from '../UIComponent.js';

export class ToDoWidget extends UIComponent {
  constructor(id, onChange, onRemove, tasks = []) {
    super(id, 'Список дел', 'todo', '☑', 'Всё важное под рукой', onChange, onRemove);
    this.tasks = Array.isArray(tasks) ? tasks.filter(t => t && typeof t.text === 'string' && typeof t.id === 'string').map(t => ({ id: t.id, text: t.text.slice(0, 200), done: Boolean(t.done) })) : [];
  }

  renderContent() {
    const form = document.createElement('form');
    form.className = 'todo-form';
    const input = document.createElement('input');
    input.className = 'text-input';
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = 'Что нужно сделать?';
    input.setAttribute('aria-label', 'Новая задача');
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'primary-button';
    add.textContent = '+ Добавить';
    form.append(input, add);
    const list = document.createElement('ul');
    list.className = 'todo-list';
    const summary = document.createElement('p');
    summary.className = 'todo-summary';
    this.body.append(form, list, summary);
    this.list = list;
    this.summary = summary;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.tasks.push({ id: (globalThis.crypto?.randomUUID?.() || `t-${Date.now()}-${Math.random().toString(36).slice(2)}`), text, done: false });
      input.value = '';
      this.updateTasks();
    }, { signal: this.controller.signal });
    list.addEventListener('change', event => {
      if (!event.target.matches('input[type="checkbox"]')) return;
      const task = this.tasks.find(t => t.id === event.target.dataset.taskId);
      if (task) { task.done = event.target.checked; this.updateTasks(); }
    }, { signal: this.controller.signal });
    list.addEventListener('click', event => {
      const button = event.target.closest('button[data-task-id]');
      if (!button) return;
      this.tasks = this.tasks.filter(t => t.id !== button.dataset.taskId);
      this.updateTasks();
    }, { signal: this.controller.signal });
    this.updateTasks(false);
  }

  updateTasks(notify = true) {
    this.list.replaceChildren();
    if (this.tasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'Задач пока нет. Добавьте первую!';
      this.list.append(empty);
    }
    for (const task of this.tasks) {
      const li = document.createElement('li');
      li.className = `todo-item${task.done ? ' done' : ''}`;
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.checked = task.done;
      check.dataset.taskId = task.id;
      check.setAttribute('aria-label', `Выполнено: ${task.text}`);
      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = task.text;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'task-delete';
      remove.dataset.taskId = task.id;
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
      li.append(check, span, remove);
      this.list.append(li);
    }
    const done = this.tasks.filter(t => t.done).length;
    this.summary.textContent = `Выполнено ${done} из ${this.tasks.length}`;
    if (notify) this.onChange();
  }

  serialize() { return { ...super.serialize(), tasks: this.tasks }; }
}
