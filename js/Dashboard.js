import { ClockWidget } from './widgets/ClockWidget.js';
import { PackingWidget } from './widgets/PackingWidget.js';
import { TripsWidget } from './widgets/TripsWidget.js';
import { PlacesWidget } from './widgets/PlacesWidget.js';
import { ToDoWidget } from './widgets/ToDoWidget.js';
import { WeatherWidget } from './widgets/WeatherWidget.js';
import { CurrencyWidget } from './widgets/CurrencyWidget.js';

const STORAGE_KEY = 'waypoint-dashboard-v3';
const PREVIOUS_KEY = 'waypoint-dashboard-v2';
const OLD_KEY = 'waypoint-dashboard-v1';
const TYPES = ['todo', 'weather', 'currency', 'clock', 'packing', 'trips', 'places'];

export class Dashboard {
  constructor(container, announcement, count, emptyState) {
    this.container = container;
    this.announcement = announcement;
    this.count = count;
    this.emptyState = emptyState;
    this.widgets = new Map();
    this.setupDrag();
    this.restoring = true;
    this.restore();
    this.restoring = false;
    this.save();
  }

  notify(message) { this.announcement.textContent = message; }

  addWidget(type, saved = null) {
    if (!TYPES.includes(type)) { this.notify('Неизвестный тип виджета.'); return false; }
    this.pruneMissingWidgets();
    const existing = [...this.widgets.values()].find(widget => widget.type === type);
    if (existing) {
      // Кнопка валют всегда восстанавливает карточку, даже при повреждённом состоянии.
      if (type === 'currency' && !saved) {
        const snapshot = existing.serialize();
        this.widgets.delete(existing.id);
        existing.destroy();
        return this.addWidget(type, { ...snapshot, collapsed: false });
      }
      existing.setCollapsed(false);
      existing.root?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.notify(`Виджет «${existing.title}» уже открыт на панели.`);
      return false;
    }
    const id = saved && typeof saved.id === 'string' && saved.id.length < 100 ? saved.id : (globalThis.crypto?.randomUUID?.() || `w-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (this.widgets.has(id)) return false;
    const onChange = () => this.save();
    const onRemove = widgetId => this.removeWidget(widgetId);
    let widget;
    if (type === 'todo') widget = new ToDoWidget(id, onChange, onRemove, saved?.tasks);
    if (type === 'weather') widget = new WeatherWidget(id, onChange, onRemove, saved?.city);
    if (type === 'currency') widget = new CurrencyWidget(id, onChange, onRemove, saved);
    if (type === 'clock') widget = new ClockWidget(id, onChange, onRemove, saved);
    if (type === 'packing') widget = new PackingWidget(id, onChange, onRemove, saved);
    if (type === 'trips') widget = new TripsWidget(id, onChange, onRemove, saved);
    if (type === 'places') widget = new PlacesWidget(id, onChange, onRemove, saved);
    this.widgets.set(id, widget);
    try { this.container.append(widget.render()); } catch (error) { this.widgets.delete(id); widget.destroy(); this.notify('Не удалось открыть виджет: '+error.message); console.error(error); return false; }
    widget.root.draggable = true;
    widget.root.querySelector('.widget-header').title = 'Перетащите карточку за заголовок';
    if (saved?.collapsed) widget.setCollapsed(true, false);
    this.updateView();
    this.save();
    if (!saved) this.notify(`Виджет «${widget.title}» добавлен.`);
    return true;
  }

  removeWidget(id) {
    const widget = this.widgets.get(id);
    if (!widget) return;
    this.widgets.delete(id);
    widget.destroy();
    this.updateView();
    this.save();
    this.notify(`Виджет «${widget.title}» удалён. Его можно добавить снова.`);
  }

  setupDrag() {
    let dragging = null;
    this.container.addEventListener('dragstart', event => {
      const card = event.target.closest('.widget');
      if (!card || event.target.closest('button, input, select')) { event.preventDefault(); return; }
      dragging = card;
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.dataset.id);
    });
    this.container.addEventListener('dragover', event => {
      if (!dragging) return;
      event.preventDefault();
      const target = event.target.closest('.widget');
      if (!target || target === dragging) return;
      const rect = target.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2 || (Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height / 2 && event.clientX < rect.left + rect.width / 2);
      this.container.insertBefore(dragging, before ? target : target.nextSibling);
    });
    this.container.addEventListener('drop', event => {if (dragging) {event.preventDefault(); this.reorder();}});
    this.container.addEventListener('dragend', () => {dragging?.classList.remove('dragging');dragging=null;this.reorder();});
  }

  reorder() {
    const order = [...this.container.children].map(el => el.dataset.id);
    const ordered = order.filter(id => this.widgets.has(id)).map(id => [id, this.widgets.get(id)]);
    const remaining = [...this.widgets].filter(([id]) => !order.includes(id));
    this.widgets = new Map([...ordered, ...remaining]);
    this.save();
  }

  pruneMissingWidgets() {
    for (const [id, widget] of this.widgets) {
      if (!widget.root || !this.container.contains(widget.root)) {
        this.widgets.delete(id);
        widget.destroy();
      }
    }
    this.updateView();
  }

  updateView() {
    this.count.textContent = String(this.widgets.size);
    this.emptyState.hidden = this.widgets.size > 0;
  }

  save() {
    if (this.restoring) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.widgets.values()].map(w => w.serialize())));
    } catch (error) {
      this.notify('Браузер запретил сохранение. Данные останутся до обновления страницы.');
      console.warn('Не удалось сохранить панель:', error);
    }
  }

  restore() {
    let saved;
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const raw = current ?? localStorage.getItem(PREVIOUS_KEY) ?? localStorage.getItem(OLD_KEY);
      this.migrating = current === null;
      saved = raw === null ? null : JSON.parse(raw);
    } catch (error) {
      this.notify('Сохранённые данные повреждены или недоступны. Открыта стандартная панель.');
      console.warn('Не удалось восстановить панель:', error);
      saved = null;
    }
    const items = Array.isArray(saved) ? saved.slice() : TYPES.map(type => ({ type }));
    // Однократно возвращаем валютный виджет, потерянный в старой версии.
    // В дальнейшем пользователь может удалить его намеренно.
    if (this.migrating && !items.some(item => item?.type === 'currency')) {
      items.push({ type: 'currency' });
    }
    for (const item of items) {
      if (item && typeof item === 'object' && TYPES.includes(item.type)) this.addWidget(item.type, item);
    }
    this.updateView();
    this.save();
  }

  reset() {
    for (const widget of this.widgets.values()) widget.destroy();
    this.widgets.clear();
    for (const type of TYPES) this.addWidget(type, { type });
    this.notify('Панель восстановлена. Предыдущие задачи удалены.');
  }
}
