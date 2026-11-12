export class UIComponent {
  constructor(id, title, type, icon, subtitle, onChange = () => {}, onRemove = () => {}) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.icon = icon;
    this.subtitle = subtitle;
    this.onChange = onChange;
    this.onRemove = onRemove;
    this.collapsed = false;
    this.root = null;
    this.controller = new AbortController();
  }

  render() {
    const card = document.createElement('article');
    card.className = 'widget';
    card.dataset.type = this.type;
    card.dataset.id = this.id;
    const header = document.createElement('div');
    header.className = 'widget-header';
    const icon = document.createElement('span');
    icon.className = 'widget-icon';
    icon.textContent = this.icon;
    const titleBox = document.createElement('div');
    titleBox.className = 'widget-title';
    const heading = document.createElement('h3');
    heading.textContent = this.title;
    const subtitle = document.createElement('p');
    subtitle.textContent = this.subtitle;
    titleBox.append(heading, subtitle);
    const actions = document.createElement('div');
    actions.className = 'widget-actions';
    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'icon-button';
    collapse.setAttribute('aria-label', 'Свернуть виджет');
    collapse.title = 'Свернуть';
    collapse.textContent = '−';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button delete';
    remove.setAttribute('aria-label', 'Удалить виджет');
    remove.title = 'Удалить';
    remove.textContent = '×';
    actions.append(collapse, remove);
    header.append(icon, titleBox, actions);
    const body = document.createElement('div');
    body.className = 'widget-body';
    card.append(header, body);
    this.root = card;
    this.body = body;
    this.collapseButton = collapse;
    collapse.addEventListener('click', () => this.setCollapsed(!this.collapsed), { signal: this.controller.signal });
    remove.addEventListener('click', () => this.onRemove(this.id), { signal: this.controller.signal });
    this.renderContent();
    return card;
  }

  setCollapsed(value, notify = true) {
    this.collapsed = Boolean(value);
    if (this.root) this.root.classList.toggle('collapsed', this.collapsed);
    if (this.collapseButton) {
      this.collapseButton.textContent = this.collapsed ? '+' : '−';
      this.collapseButton.title = this.collapsed ? 'Развернуть' : 'Свернуть';
      this.collapseButton.setAttribute('aria-label', this.collapseButton.title + ' виджет');
    }
    if (notify) this.onChange();
  }

  renderContent() {}
  serialize() { return { id: this.id, type: this.type, collapsed: this.collapsed }; }
  destroy() { this.controller.abort(); this.root?.remove(); this.root = null; }
}
