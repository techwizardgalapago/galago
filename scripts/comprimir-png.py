#!/usr/bin/env python3
"""Deja un PNG listo para la app: recorta el margen transparente y reduce la
paleta a 256 colores.

Pensado para los dibujos de tintas planas que manda diseno, que llegan en
lienzos enormes y mayormente vacios. En un dibujo asi la paleta reducida no
se distingue del original, y el recorte ademas hace que la figura ocupe toda
la caja donde se pinta en vez de flotar en medio de su propio hueco.

Modifica los archivos que recibe, asi que se trabaja sobre copias, no sobre
los originales de diseno.

Uso, partiendo de un original grande:

    sips -Z 900 original.png --out assets/gositos/go-algo.png
    python3 scripts/comprimir-png.py assets/gositos/go-algo.png

El 900 es el lado del lienzo antes de recortar; la figura suele ocupar unos
dos tercios, con lo que acaba rondando los 700 de ancho. Sobra para una
ficha de 212 en una pantalla de tres pixeles por punto.

No usa nada fuera de la biblioteca estandar: no hay que instalar Pillow ni
ImageMagick.
"""

import zlib, struct, sys, os


def decodifica(ruta):
    d = open(ruta, 'rb').read()
    i, idat, ihdr = 8, b'', None
    while i < len(d):
        ln = struct.unpack('>I', d[i:i+4])[0]
        tipo, cuerpo = d[i+4:i+8], d[i+8:i+8+ln]
        if tipo == b'IHDR': ihdr = struct.unpack('>IIBBBBB', cuerpo)
        elif tipo == b'IDAT': idat += cuerpo
        i += 12 + ln
    w, h, bd, ct = ihdr[0], ihdr[1], ihdr[2], ihdr[3]
    assert bd == 8 and ct == 6, f"{ruta}: se esperaba RGBA de 8 bits"
    raw = zlib.decompress(idat)
    bpp, stride = 4, w * 4
    out, prev, p = bytearray(w * h * 4), bytearray(stride), 0
    for y in range(h):
        f = raw[p]; p += 1
        l = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for x in range(bpp, stride): l[x] = (l[x] + l[x-bpp]) & 255
        elif f == 2:
            for x in range(stride): l[x] = (l[x] + prev[x]) & 255
        elif f == 3:
            for x in range(stride):
                a = l[x-bpp] if x >= bpp else 0
                l[x] = (l[x] + ((a + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(stride):
                a = l[x-bpp] if x >= bpp else 0
                b = prev[x]; c = prev[x-bpp] if x >= bpp else 0
                pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                l[x] = (l[x] + pr) & 255
        out[y*stride:(y+1)*stride] = l
        prev = l
    return w, h, bytes(out)

def recorta(w, h, px, margen=2):
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        base = y*w*4
        for x in range(w):
            if px[base+x*4+3]:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    x0 = max(0, x0-margen); y0 = max(0, y0-margen)
    x1 = min(w-1, x1+margen); y1 = min(h-1, y1+margen)
    nw, nh = x1-x0+1, y1-y0+1
    rec = bytearray(nw*nh*4)
    for y in range(nh):
        o = ((y+y0)*w + x0)*4
        rec[y*nw*4:(y+1)*nw*4] = px[o:o+nw*4]
    return nw, nh, bytes(rec)

def paleta(px, maxcol=256):
    # Median cut sobre los colores presentes, ponderado por cuantas veces
    # aparece cada uno: asi los tonos planos grandes conservan su valor exacto
    # y el error se concentra en los bordes suavizados, donde no se nota.
    cuenta = {}
    for o in range(0, len(px), 4):
        c = px[o:o+4]
        cuenta[c] = cuenta.get(c, 0) + 1
    if len(cuenta) <= maxcol:
        colores = list(cuenta)
    else:
        cajas = [list(cuenta.items())]
        while len(cajas) < maxcol:
            # Se parte la caja con mayor rango en algun canal.
            mejor, mejor_rango, mejor_eje = -1, -1, 0
            for i, caja in enumerate(cajas):
                if len(caja) < 2: continue
                for eje in range(4):
                    vals = [c[eje] for c, _ in caja]
                    r = max(vals) - min(vals)
                    if r > mejor_rango: mejor, mejor_rango, mejor_eje = i, r, eje
            if mejor < 0: break
            caja = sorted(cajas.pop(mejor), key=lambda kv: kv[0][mejor_eje])
            total = sum(n for _, n in caja)
            acc, corte = 0, 1
            for j, (_, n) in enumerate(caja):
                acc += n
                if acc >= total/2: corte = max(1, min(len(caja)-1, j)); break
            cajas.append(caja[:corte]); cajas.append(caja[corte:])
        colores = []
        for caja in cajas:
            tot = sum(n for _, n in caja)
            prom = tuple(round(sum(c[e]*n for c, n in caja)/tot) for e in range(4))
            colores.append(bytes(prom))
    colores = colores[:maxcol]
    # Cada color original se asigna al de la paleta mas cercano. Se cachea
    # porque el numero de colores distintos es muy inferior al de pixeles.
    cache = {}
    def indice(c):
        r = cache.get(c)
        if r is None:
            r = min(range(len(colores)),
                    key=lambda i: sum((colores[i][e]-c[e])**2 for e in range(4)))
            cache[c] = r
        return r
    datos = bytes(indice(px[o:o+4]) for o in range(0, len(px), 4))
    return colores, datos

def escribe(ruta, w, h, colores, datos):
    def trozo(tipo, cuerpo):
        return (struct.pack('>I', len(cuerpo)) + tipo + cuerpo
                + struct.pack('>I', zlib.crc32(tipo + cuerpo) & 0xffffffff))
    plte = b''.join(bytes(c[:3]) for c in colores)
    trns = bytes(c[3] for c in colores)
    crudo = b''.join(b'\x00' + datos[y*w:(y+1)*w] for y in range(h))
    idat = zlib.compress(crudo, 9)
    png = (b'\x89PNG\r\n\x1a\n'
           + trozo(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 3, 0, 0, 0))
           + trozo(b'PLTE', plte)
           + trozo(b'tRNS', trns)
           + trozo(b'IDAT', idat)
           + trozo(b'IEND', b''))
    open(ruta, 'wb').write(png)

for ruta in sys.argv[1:]:
    antes = os.path.getsize(ruta)
    w, h, px = decodifica(ruta)
    w, h, px = recorta(w, h, px)
    colores, datos = paleta(px)
    escribe(ruta, w, h, colores, datos)
    print(f"{os.path.basename(ruta)}: {antes//1024} KB -> {os.path.getsize(ruta)//1024} KB  ({w}x{h}, {len(colores)} colores)")
