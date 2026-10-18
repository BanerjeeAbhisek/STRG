// Reactive SVG charts of published values in data/paper-results.json.
// No simulations, inferred confidence intervals, or external CDNs.
const GOLD = '#FDB719', INK = '#000000', COLORS = ['#989898', '#333333', '#FDB719'];
const NS = 'http://www.w3.org/2000/svg';
function node(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== undefined) el.textContent = text;
  return el;
}
function chart(w, h, title, description) {
  const svg = node('svg', {viewBox: `0 0 ${w} ${h}`, width: w, height: h,
    role: 'img', class: 'paper-chart', 'aria-label': `${title}. ${description}`});
  svg.append(node('title', {}, title), node('desc', {}, description));
  return svg;
}
function text(svg, x, y, content, attrs = {}) {
  svg.append(node('text', {x, y, 'font-size': 23, fill: INK, ...attrs}, content));
}
function line(svg, x1, y1, x2, y2, attrs = {}) {
  svg.append(node('line', {x1, y1, x2, y2, stroke: '#D4D4D4', ...attrs}));
}
function tip(el, value) { el.append(node('title', {}, value)); return el; }
function ticks(svg, values, x, top, bottom, format = v => v.toFixed(1)) {
  for (const t of values) {
    line(svg, x(t), top, x(t), bottom, {stroke: t === 0 ? '#777' : '#D4D4D4'});
    text(svg, x(t), bottom + 34, format(t), {'font-size': 20, 'text-anchor': 'middle'});
  }
}
export function selector(labelText, options, initial) {
  const label = document.createElement('label');
  label.className = 'figure-control';
  const caption = document.createElement('span');
  caption.textContent = labelText;
  const select = document.createElement('select');
  select.setAttribute('aria-label', labelText);
  for (const item of options) {
    const option = document.createElement('option');
    option.value = typeof item === 'string' ? item : item.value;
    option.textContent = typeof item === 'string' ? item : item.label;
    select.append(option);
  }
  if (initial !== undefined) select.value = initial;
  label.value = select.value;
  select.addEventListener('input', () => { label.value = select.value; });
  label.append(caption, select);
  return label;
}
export function detectionChart(data, dataset) {
  const values = data[dataset];
  const svg = chart(980, 480, `${dataset} object detection`,
    data.models.map((m, i) => `${data.regimes[i]} ${m}: ${values[i]} percent mAP`).join('. '));
  const left = 345, right = 900, x = v => left + v / 60 * (right - left);
  ticks(svg, [0, 10, 20, 30, 40, 50, 60], x, 45, 405, String);
  data.models.forEach((m, i) => {
    const y = 78 + i * 80 + (i > 1 ? 22 : 0);
    const fill = i === 1 || i === 3 ? GOLD : '#777';
    svg.append(tip(node('rect', {x: left, y, width: x(values[i]) - left, height: 42, fill}),
      `${m}: ${values[i].toFixed(2)}% mAP (${data.regimes[i]})`));
    text(svg, left - 20, y + 28, m, {'text-anchor': 'end', 'font-size': 23});
    text(svg, x(values[i]) + 12, y + 29, values[i].toFixed(2), {'font-size': 24, 'font-weight': 650});
  });
  line(svg, 20, 244, 945, 244, {stroke: '#333', 'stroke-dasharray': '5 5'});
  text(svg, 20, 62, 'ZERO-SHOT', {'font-size': 17, 'font-weight': 700});
  text(svg, 20, 275, 'FEW-SHOT', {'font-size': 17, 'font-weight': 700});
  text(svg, left, 471, 'mAP (%) · higher is better', {'font-size': 20});
  return svg;
}
export function transferChart(data, metric) {
  const isR2 = metric === 'r2';
  const svg = chart(1400, 410, `Cross-country transfer to France: ${isR2 ? 'R squared' : 'MAPE'}`,
    data.targets.map(d => `${d.label}: ${d[metric].join(', ')}`).join('. '));
  const min = isR2 ? -.15 : 0, max = isR2 ? 1 : 32;
  data.targets.forEach((target, panel) => {
    const origin = panel * 465;
    const x = v => origin + 165 + (v - min) / (max - min) * 258;
    text(svg, origin + 25, 39, target.label, {'font-size': 28, 'font-weight': 650});
    ticks(svg, isR2 ? [0, .5, 1] : [0, 10, 20, 30], x, 75, 312, v => isR2 ? v.toFixed(1) : String(v));
    target[metric].forEach((value, i) => {
      const y = 115 + i * 77;
      line(svg, x(0), y, x(value), y, {stroke: COLORS[i], 'stroke-width': 10});
      svg.append(tip(node('circle', {cx: x(value), cy: y, r: 8, fill: COLORS[i], stroke: INK, 'stroke-width': .7}),
        `${target.label}, ${data.models[i]}: ${value.toFixed(2)}`));
      text(svg, origin + 150, y + 7, ['IDW', 'RBF', 'Population'][i], {'text-anchor': 'end', 'font-size': 22});
      text(svg, x(value), y - 16, value.toFixed(2), {'text-anchor': 'middle', 'font-size': 21, 'font-weight': 650});
    });
  });
  text(svg, 25, 396, isR2 ? 'R² · higher is better. Population = Population Dynamics Foundations.' : 'MAPE (%) · lower is better. Population = Population Dynamics Foundations.', {'font-size': 21});
  return svg;
}
export function targetOptions(data) {
  return [{value: 'mean', label: 'Mean across all targets'},
    ...data.targets.map((d, i) => ({value: String(i), label: d.label}))];
}
function targetRow(data, selected) {
  return selected === 'mean' ? {label: 'Mean across all targets', values: data.mean} : data.targets[+selected];
}
export function fusionChart(models, data, selected) {
  const row = targetRow(data, selected);
  const svg = chart(990, 425, `Table ${data.table}: ${row.label}`,
    models.map((m, i) => `${m} R squared ${row.values[i].toFixed(2)}`).join('. '));
  const left = 285, right = 916, x = v => left + v * (right - left);
  text(svg, left, 30, row.label, {'font-size': 25, 'font-weight': 650});
  ticks(svg, [0, .2, .4, .6, .8, 1], x, 55, 335);
  models.forEach((m, i) => {
    const y = 78 + i * 88;
    svg.append(tip(node('rect', {x: left, y, width: x(row.values[i]) - left, height: 48, fill: COLORS[i]}),
      `${row.label}, ${m}: R² ${row.values[i].toFixed(2)}`));
    text(svg, left - 20, y + 32, m, {'text-anchor': 'end', 'font-size': 23});
    text(svg, x(row.values[i]) + 13, y + 32, row.values[i].toFixed(2), {'font-size': 26, 'font-weight': 650});
  });
  text(svg, left, 414, 'Test-set R² · fixed scale from 0 to 1', {'font-size': 21});
  return svg;
}
export function fusionSummary(data, selected) {
  const row = targetRow(data, selected);
  const el = document.createElement('div');
  el.className = 'benchmark-summary';
  const value = document.createElement('span');
  value.className = 'summary-number';
  value.textContent = row.values[2].toFixed(2);
  const label = document.createElement('span');
  label.className = 'summary-label';
  label.textContent = `Combined R²: ${selected === 'mean' ? `mean of ${data.targets.length} targets` : row.label.toLowerCase()}`;
  el.append(value, label);
  return el;
}
export function qaChart(data, category) {
  const row = data.categories.find(d => d.id === category);
  const svg = chart(990, 435, `Q&A benchmark: ${row.label}`,
    data.models.map((m, i) => `${m}: ${row.means[i].toFixed(2)} plus or minus ${row.ci[i].toFixed(2)}`).join('. '));
  const left = 280, right = 914, x = v => left + v * (right - left);
  text(svg, left, 32, `${row.questions} questions · ${row.label}`, {'font-size': 23, 'font-weight': 650});
  ticks(svg, [0, .2, .4, .6, .8, 1], x, 57, 337);
  row.means.forEach((value, i) => {
    const y = 109 + i * 90, lo = value - row.ci[i], hi = value + row.ci[i];
    text(svg, left - 20, y + 8, data.models[i], {'text-anchor': 'end', 'font-size': 23});
    line(svg, x(lo), y, x(hi), y, {stroke: INK, 'stroke-width': 3});
    for (const end of [lo, hi]) line(svg, x(end), y - 8, x(end), y + 8, {stroke: INK, 'stroke-width': 2});
    svg.append(tip(node('circle', {cx: x(value), cy: y, r: 10, fill: COLORS[i], stroke: INK, 'stroke-width': 1}),
      `${data.models[i]}: ${value.toFixed(2)} ± ${row.ci[i].toFixed(2)} (published 95% CI across runs)`));
    text(svg, x(value), y - 22, `${value.toFixed(2)} ± ${row.ci[i].toFixed(2)}`, {'text-anchor': 'middle', 'font-size': 23, 'font-weight': 650});
  });
  text(svg, left, 416, 'Partial-credit score · higher is better', {'font-size': 21});
  return svg;
}
export function crisisChart(data, showIntervals) {
  const svg = chart(1060, 535, 'Crisis response benchmark: all ten prompts',
    'Gemini 2.5 Pro versus the geospatial agent. Published confidence intervals can extend beyond the score range.');
  const left = 365, right = 1010, min = -.05, max = 1.2;
  const x = v => left + (v - min) / (max - min) * (right - left);
  ticks(svg, [0, .25, .5, .75, 1], x, 48, 477, v => v.toFixed(2));
  line(svg, x(1), 48, x(1), 477, {stroke: '#777', 'stroke-dasharray': '5 5'});
  data.prompts.forEach((d, i) => {
    const y = 69 + i * 41;
    text(svg, left - 22, y + 7, `${d.id}. ${d.label}`, {'font-size': 20, 'text-anchor': 'end'});
    line(svg, x(d.baseline), y, x(d.agent), y, {stroke: '#B7B7B7', 'stroke-width': 1.5});
    for (const [key, color, offset] of [['baseline', '#555555', -3], ['agent', GOLD, 3]]) {
      const py = y + offset;
      if (showIntervals === 'yes') line(svg, x(d[key] - d[`${key}_ci`]), py, x(d[key] + d[`${key}_ci`]), py,
        {stroke: color, 'stroke-width': 2, 'stroke-opacity': .65});
      svg.append(tip(node('circle', {cx: x(d[key]), cy: py, r: 6.5, fill: color, stroke: INK, 'stroke-width': .7}),
        `Prompt ${d.id}, ${key}: ${d[key].toFixed(2)} ± ${d[`${key}_ci`].toFixed(2)}`));
    }
  });
  text(svg, left, 531, 'Rubric score · gray: Gemini 2.5 Pro · gold: geospatial agent', {'font-size': 20});
  return svg;
}
