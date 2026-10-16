"""Comprueba que los valores de templates/*.json encajan con los esquemas de las secciones."""
import json, re, glob, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
schemas = {}
for f in glob.glob(os.path.join(root, 'sections', '*.liquid')):
    s = open(f, encoding='utf-8').read()
    m = re.search(r'{% schema %}(.*){% endschema %}', s, re.S)
    schemas[os.path.basename(f)[:-7]] = json.loads(m.group(1))
errs = []
def check(where, defs, values):
    by = {d['id']: d for d in defs if 'id' in d}
    for k, v in values.items():
        d = by.get(k)
        if not d: errs.append(f'{where}: ajuste desconocido {k}'); continue
        t = d['type']
        if t == 'range':
            if not isinstance(v, (int, float)) or v < d['min'] or v > d['max'] or (v - d['min']) % d['step']: errs.append(f'{where}: {k}={v} fuera de rango/paso')
        if t == 'select' and v not in [o['value'] for o in d['options']]: errs.append(f'{where}: {k}={v} no es opción')
        if t == 'checkbox' and not isinstance(v, bool): errs.append(f'{where}: {k} debe ser booleano')
        if t in ('text', 'textarea') and not isinstance(v, str): errs.append(f'{where}: {k} debe ser texto')
for f in glob.glob(os.path.join(root, 'templates', '*.json')):
    t = json.load(open(f, encoding='utf-8'))
    for sid, sec in t['sections'].items():
        sch = schemas.get(sec['type'])
        if not sch: continue
        w = f'{os.path.basename(f)}:{sid}'
        check(w, sch.get('settings', []), sec.get('settings', {}))
        bt = {b['type']: b for b in sch.get('blocks', [])}
        for bid, b in sec.get('blocks', {}).items():
            if b['type'] not in bt: errs.append(f'{w}:{bid} tipo de bloque {b["type"]} no existe'); continue
            check(f'{w}:{bid}', bt[b['type']].get('settings', []), b.get('settings', {}))
        if set(sec.get('blocks', {})) != set(sec.get('block_order', [])): errs.append(f'{w}: block_order no coincide')
    if set(t['sections']) != set(t['order']): errs.append(f'{f}: order no coincide')
print('\n'.join(errs) or 'plantillas OK'); sys.exit(1 if errs else 0)
