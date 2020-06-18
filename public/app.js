(function() {
  const e = React.createElement;
  const initialLogs = [];

  function logReducer(state, action) {
    if (action.type === 'append') {
      return [...state, action.item];
    }

    throw new Error();
  }

  function getCategories(items) {
    const cats = [];
    for (let i = 0; i < items.length; i++) {
      if (!cats.includes(items[i].category)) {
        cats.push(items[i].category);
      }
    }

    cats.sort();
    return cats;
  }

  function matchState(category, filter) {
    const r = {
      exact: false,
      p1: false,
      p2: false,
    };

    for (const c of filter) {
      if (c === category) r.exact = true;
      if (c !== category && c.startsWith(category)) r.p1 = true;
      if (c !== category && category.startsWith(c)) r.p2 = true;
    }

    return r;
  }

  function buildPath(categories) {
    const path = [];
    for (const cat of categories) {
      const spl = cat.match(/(\:\:|\\)?[a-zA-Z0-9_-]+/g);

      let cp = path;
      let key = '';
      for (let s of spl) {
        key += s;
        let f = false;

        for (const c of cp) {
          if (c.key === key) {
            cp = c.children;
            f = true;
            break;
          }
        }

        if (!f) {
          const c = {key, label: s, children: []};
          cp.push(c);
          cp = c.children;
        }
      }
    }

    return path;
  }

  function CheckBox({category, filter, setFilter}) {
    const m = matchState(category.key, filter.category);
    const checked = Boolean(m.exact || m.p2);
    const indeterminate = Boolean(!checked && m.p1);
    const disabled = Boolean(m.p2);

    return e(React.Fragment, {}, [
      e('input', {
        type: 'checkbox',
        id: `cat-${category.key}`,
        key: 0,
        checked: checked,
        ref: el => el && (el.indeterminate = indeterminate),
        disabled: disabled,
        value: category.key,
        onChange: function(e) {
          const va = e.currentTarget.value;
          const en = e.currentTarget.checked;

          if (en) {
            setFilter(x => {
              if (!x.category.includes(va))
                return {
                  category: [...x.category, va],
                };
              else return x;
            });
          } else {
            setFilter(x => {
              const i = x.category.indexOf(va);
              if (i >= 0) {
                return {
                  category: [...x.category.slice(0, i), ...x.category.slice(i + 1)],
                };
              } else {
                return x;
              }
            });
          }
        },
      }),
      e('label', {htmlFor: `cat-${category.key}`, key: 1}, category.label),
    ]);
  }

  function LogFilter({items, filter, setFilter}) {
    const pcats = React.useMemo(() => {
      const cats = getCategories(items);
      return buildPath(cats);
    }, [items]);

    const appendItems = p => {
      const el1 = [];
      for (let i = 0; i < p.length; i++) {
        el1.push(
          e('div', {className: 'filter-checkbox-wrap', key: i}, [
            e(CheckBox, {key: 0, category: p[i], filter, setFilter}),
            e(
              React.Fragment,
              {key: 1},
              p[i].children && p[i].children.length ? appendItems(p[i].children) : null,
            ),
          ]),
        );
      }

      return e('div', {className: 'log-categories'}, el1);
    };

    return e('div', {className: 'log-filter'}, appendItems(pcats));
  }

  function LogList({items, filter}) {
    const el = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const m = matchState(item.category, filter.category);
      if (!m.exact && !m.p2) continue;

      el.push(e(LogItem, {item, key: i}));
    }

    return e('div', {className: 'log-list'}, el);
  }

  function LogItem({item}) {
    const {levelName, message, category, stack} = item;

    const [expanded, setExpanded] = React.useState(false);
    return e(
      'div',
      {className: `log-item log-item-${levelName}`},
      e('div', {className: expanded ? 'log-item-inner expanded' : 'log-item-inner'}, [
        e('div', {className: 'log-item-category', key: 0}, category),
        e('div', {className: 'log-item-message', key: 1}, e('pre', {}, message)),
        stack
          ? e('div', {className: 'log-item-message', key: 2}, e('pre', {}, stack.join('\n')))
          : null,
        e(
          'button',
          {
            onClick: () => {
              setExpanded(x => !x);
            },
            key: 3,
          },
          'Exp',
        ),
      ]),
    );
  }

  function App() {
    const [state, dispatch] = React.useReducer(logReducer, initialLogs);
    const [logFilter, setLogFilter] = React.useState({category: ['application']});

    React.useEffect(function() {
      const ws = new WebSocket('ws://' + location.host + '/websocket');
      ws.addEventListener('message', function(event) {
        const item = JSON.parse(event.data);
        dispatch({
          type: 'append',
          item: item,
        });
      });

      return function() {
        ws.close();
      };
    }, []);

    return e('div', {className: 'app'}, [
      e(
        'div',
        {className: 'app-header', key: 'header'},
        e(LogFilter, {key: 'filter', items: state, filter: logFilter, setFilter: setLogFilter}),
      ),
      e(
        'div',
        {className: 'app-body', key: 'body'},
        e(LogList, {key: 'list', items: state, filter: logFilter}),
      ),
    ]);
  }

  ReactDOM.render(e(App), document.getElementById('app'));
})();
