"""Genera templates/index.json y templates/product.vortix.json (secciones compartidas)."""
import json, copy, os
H = 'vortix-vaso-mezclador-electrico-proteinas'

def blocks(prefix, items):
    b, order = {}, []
    for i, (t, s) in enumerate(items, 1):
        k = f'{prefix}-{i}'; b[k] = {'type': t, 'settings': s}; order.append(k)
    return b, order

S = {}
S['hero'] = {'type': 'vx-hero', 'settings': {'product': H}}
S['marquee'] = {'type': 'vx-marquee', 'settings': {'style': 'accent', 'rows': '1', 'size': 88, 'speed': 28,
    'words': 'Sin grumos\n7000 rpm\nRecargable USB\n400 ml\nListo en 5 segundos\nCabe en tu mochila'}}
S['expand'] = {'type': 'vx-expand', 'settings': {'fallback_index': 2, 'contain': True, 'media_bg': '#ffffff',
    'side_left': 'Menos\nagitar.', 'side_right': 'Más\ndisfrutar.', 'eyebrow': 'El efecto vórtice',
    'title': 'Un remolino perfecto en cada trago.'}}
S['film'] = {'type': 'vx-film', 'settings': {}}
sb, so = blocks('st', [
    ('stat', {'number': '7000', 'suffix': 'rpm', 'label': 'velocidad de mezcla'}),
    ('stat', {'number': '1200', 'suffix': 'mAh', 'label': 'batería recargable por USB'}),
    ('stat', {'number': '400', 'suffix': 'ml', 'label': 'capacidad con escala de medida'}),
    ('stat', {'number': '5', 'suffix': 's', 'label': 'para un batido sin grumos'}),
    ('group', {'title': 'Tiempo hasta un batido sin grumos', 'hint': 'menos es mejor'}),
    ('bar', {'name': 'Vortix', 'value': 14, 'display': '≈ 5 s', 'highlight': True}),
    ('bar', {'name': 'Batidora', 'value': 40, 'display': '≈ 15 s'}),
    ('bar', {'name': 'Shaker a mano', 'value': 88, 'display': '30 s +'}),
    ('group', {'title': 'Lo fácil que es llevarlo contigo', 'hint': 'más es mejor'}),
    ('bar', {'name': 'Vortix', 'value': 94, 'display': 'Mochila', 'highlight': True}),
    ('bar', {'name': 'Shaker a mano', 'value': 96, 'display': 'Mochila'}),
    ('bar', {'name': 'Batidora', 'value': 12, 'display': 'Cocina'}),
])
S['stats'] = {'type': 'vx-stats', 'blocks': sb, 'block_order': so, 'settings': {}}
pb, po = blocks('pp', [
    ('card', {'fallback_index': 4, 'card_bg': '#e6ddcf', 'tag': 'Post-entreno', 'quote': 'El batido listo antes de salir del vestuario.', 'name': 'Momento gym', 'role': 'Clásico · Negro'}),
    ('card', {'fallback_index': 6, 'card_bg': '#ffd9cc', 'tag': 'Oficina', 'quote': 'Tu tentempié de media tarde, sin manchar la mesa.', 'name': 'Momento oficina', 'role': 'Estilizado · Rosa'}),
    ('card', {'fallback_index': 3, 'card_bg': '#efe4d2', 'tag': 'Por la mañana', 'quote': 'Café con leche o avena batidos mientras te calzas.', 'name': 'Momento desayuno', 'role': 'Clásico · Crema'}),
    ('card', {'fallback_index': 7, 'card_bg': '#d9e6d5', 'tag': 'Al aire libre', 'quote': 'Sin enchufes: la batería va contigo a cualquier parte.', 'name': 'Momento ruta', 'role': 'Estilizado · Verde'}),
    ('card', {'fallback_index': 5, 'card_bg': '#e9e6e1', 'tag': 'De viaje', 'quote': 'Cabe en la mochila, en el coche y en la maleta.', 'name': 'Momento viaje', 'role': 'Estilizado · Blanco'}),
    ('card', {'fallback_index': 1, 'card_bg': '#f3d3c4', 'tag': 'Para regalar', 'quote': 'El regalo que acaba usando cada día.', 'name': 'Momento regalo', 'role': 'Clásico · Blanco'}),
])
S['people'] = {'type': 'vx-people', 'blocks': pb, 'block_order': po, 'settings': {}}
fb, fo = blocks('ft', [
    ('feature', {'fallback_index': 2, 'title': 'Efecto vórtice a 7000 rpm', 'text': 'La base crea un remolino a alta velocidad que disuelve el polvo por completo. Batidos cremosos, sin bolas de proteína en el último trago.'}),
    ('feature', {'fallback_index': 4, 'title': 'Recargable por USB', 'text': 'Batería de 1200 mAh. Lo cargas con el cable incluido y te olvidas de enchufes durante días.'}),
    ('feature', {'fallback_index': 1, 'title': '400 ml con escala', 'text': 'El tamaño justo para tu batido, un café con leche o un smoothie. La escala impresa te ahorra el medidor.'}),
    ('feature', {'fallback_index': 3, 'title': 'Tapa de un clic', 'text': 'Abres y bebes directamente del vaso, sin desenroscar nada. Cierra firme para llevarlo en la bolsa.'}),
    ('feature', {'fallback_index': 6, 'title': 'Ligero e irrompible', 'text': 'ABS, PP y PC: materiales resistentes para el día a día. 10,5 × 8,6 × 19 cm y un diseño que te apetece sacar en cualquier sitio.'}),
])
S['features'] = {'type': 'vx-features', 'blocks': fb, 'block_order': fo, 'settings': {}}
cb, co = blocks('cp', [
    ('row', {'label': 'Batido sin grumos', 'us': True, 'a': False, 'b': True}),
    ('row', {'label': 'Sin esfuerzo, con un botón', 'us': True, 'a': False, 'b': True}),
    ('row', {'label': 'Cabe en la mochila', 'us': True, 'a': True, 'b': False}),
    ('row', {'label': 'Funciona sin enchufe', 'us': True, 'a': True, 'b': False}),
    ('row', {'label': 'Bebes del mismo vaso', 'us': True, 'a': True, 'b': False}),
    ('row', {'label': 'Se limpia en segundos', 'us': True, 'a': True, 'b': False}),
])
S['compare'] = {'type': 'vx-compare', 'blocks': cb, 'block_order': co, 'settings': {}}
S['buy'] = {'type': 'vx-buy', 'settings': {'product': H}}
rv = [
    ('Laura G.', 5, 'Adiós a los grumos', 'Llevaba años agitando el shaker como una loca y siempre quedaba algo abajo. Con este pulso el botón y en unos segundos está perfecto. Lo uso todos los días después del gym.', 'Clásico · Negro'),
    ('Marcos R.', 5, 'Mejor de lo que esperaba', 'Pensaba que sería un juguete, pero mezcla de verdad. La proteína de chocolate queda cremosa. La batería me dura bastante.', 'Clásico · Blanco'),
    ('Ana P.', 5, 'Mi café de las mañanas', 'Lo compré para la proteína y al final lo uso más para el café con leche y cacao. Queda espumoso.', 'Estilizado · Rosa'),
    ('Javier M.', 4, 'Muy práctico', 'Cumple lo que promete. Le quito una estrella porque hay que tener cuidado al lavarlo para no mojar la base, pero viene explicado.', 'Clásico · Negro'),
    ('Sofía L.', 5, 'Regalo acertado', 'Se lo regalé a mi pareja que va al gimnasio y está encantado. El color crema es precioso en persona.', 'Clásico · Crema'),
    ('Daniel C.', 5, 'Para la oficina, ideal', 'Me preparo el batido de media tarde en la oficina sin hacer ruido ni manchar. Cabe en el cajón.', 'Estilizado · Blanco'),
    ('Elena V.', 5, 'Bonito y útil', 'Por fin un accesorio de gym que no parece de gym. El verde es muy bonito.', 'Estilizado · Verde'),
    ('Pablo S.', 4, 'Buena compra', 'Mezcla muy bien con agua y con leche. Para batidos muy espesos añado primero el líquido y va mejor.', 'Clásico · Blanco'),
    ('Irene T.', 5, 'Lo llevo a todas partes', 'Lo uso en el coche de camino al trabajo. Sin enchufes y sin ensuciar nada.', 'Clásico · Negro'),
]
rb, ro = blocks('rv', [('review', {'name': n, 'rating': r, 'title': t, 'text': x, 'variant': v, 'verified': False}) for n, r, t, x, v in rv])
S['reviews'] = {'type': 'vx-reviews', 'blocks': rb, 'block_order': ro, 'settings': {'count_text': 'valoración media de nuestros clientes'}}
qb, qo = blocks('qa', [
    ('qa', {'q': '¿Cómo se usa?', 'a': 'Añade primero el líquido (agua, leche o bebida vegetal), después la proteína en polvo, cierra la tapa y pulsa el botón de la base. En unos segundos lo tienes listo.'}),
    ('qa', {'q': '¿Cuánto dura la batería?', 'a': 'La batería de 1200 mAh da para muchos batidos con una sola carga (depende de la duración de cada uso). Se carga por USB (5 V / 1 A) con el cable incluido. Cárgalo antes del primer uso.'}),
    ('qa', {'q': '¿Se puede meter en el lavavajillas?', 'a': 'No. La base lleva el motor y la batería: limpia el vaso con agua y un paño suave, sin sumergir la base. Un truco: agua con una gota de jabón, pulsa unos segundos y aclara.'}),
    ('qa', {'q': '¿Sirve para fruta o hielo?', 'a': 'Vortix es un mezclador, no una batidora de cuchillas: está pensado para polvos y líquidos (proteína, cacao, café soluble, avena fina). No tritura fruta entera ni hielo.'}),
    ('qa', {'q': '¿Puedo usar bebidas calientes?', 'a': 'Úsalo con bebidas frías o templadas. Nunca con líquidos hirviendo.'}),
    ('qa', {'q': '¿Cuánto tarda el envío?', 'a': 'El envío es gratis a toda España y llega normalmente en 8–15 días laborables. Recibirás un número de seguimiento por email.'}),
    ('qa', {'q': '¿Y si no me convence?', 'a': 'Tienes 14 días desde que lo recibes para desistir de la compra. Además cuenta con la garantía legal de 3 años frente a defectos de fabricación.'}),
])
S['faq'] = {'type': 'vx-faq', 'blocks': qb, 'block_order': qo, 'settings': {}}
S['cta'] = {'type': 'vx-cta', 'settings': {'product': H}}

def tpl(order, overrides=None):
    secs = {}
    for k in order:
        secs[k] = copy.deepcopy(S[k])
    for k, v in (overrides or {}).items():
        secs[k]['settings'].update(v)
    return {'layout': 'vortix', 'sections': secs, 'order': order}

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '..', 'templates')
index = tpl(['hero', 'marquee', 'expand', 'film', 'stats', 'people', 'features', 'compare', 'buy', 'reviews', 'faq', 'cta'])
prod = tpl(['buy', 'marquee', 'expand', 'film', 'stats', 'features', 'compare', 'reviews', 'faq', 'cta'],
           {'buy': {'product': None, 'padding_top': 40}})
del prod['sections']['buy']['settings']['product']
del prod['sections']['cta']['settings']['product']
for name, data in (('index.json', index), ('product.vortix.json', prod)):
    with open(os.path.join(out, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
print('ok')
