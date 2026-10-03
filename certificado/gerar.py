# -*- coding: utf-8 -*-
"""
ALOCO - Certificado de Reconhecimento com o nome do cliente.

Composicao deterministica: abre a arte base, limpa a faixa onde fica o nome e
escreve o nome do cliente por cima, com o mesmo acabamento (gradiente, sombra,
contorno). Nao usa IA: o resultado e identico a cada execucao.

Uso:
    python3 gerar.py barber "Marcos Barber" saida.png
    python3 gerar.py beauty "Andreia Hair"  saida.png
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE = os.path.join(AQUI, 'Poppins-Bold.ttf')

# Gradientes: escuro em cima, claro no meio, escuro embaixo. Mesma leitura do
# ouro da arte original, para o nome novo nao destoar do titulo.
OURO = [(0.00, (142, 96, 28)), (0.18, (214, 170, 78)), (0.42, (255, 236, 170)),
        (0.52, (246, 214, 122)), (0.72, (201, 150, 48)), (1.00, (120, 76, 20))]
ROSA = [(0.00, (142, 18, 70)), (0.18, (226, 58, 132)), (0.42, (255, 170, 214)),
        (0.52, (250, 120, 182)), (0.72, (214, 40, 118)), (1.00, (118, 12, 58))]
# Azul tirado do proprio logo ALOCO da arte: rgb(0,144,254) e rgb(0,188,254).
AZUL = [(0.00, (4, 46, 112)), (0.18, (0, 118, 226)), (0.42, (168, 232, 255)),
        (0.52, (64, 190, 255)), (0.72, (0, 132, 232)), (1.00, (2, 40, 96))]

# As duas artes tem geometrias diferentes. Os numeros abaixo foram medidos em
# cada uma: onde o nome antigo comeca e termina, ate onde da para limpar sem
# invadir outro elemento (no Beauty a flor entra pela direita em x=1244).
ARTES = {
    'barber': dict(
        base='base-barber.png',
        faixa=(362, 480),            # y da faixa limpa
        larg=(120, 1370),            # x da faixa limpa
        pena=(130, 130, 10),         # desvanecimento: esquerda, direita, vertical
        fundo=(6, 6, 8),             # cor de fundo da arte
        centro=748,
        base_linha=450,              # pe das letras
        altura=58,                   # altura das maiusculas
        largura_max=760,
        contorno=(4, 14, 34),
        paleta=AZUL),
    'beauty': dict(
        base='base-beauty.png',
        faixa=(352, 466),
        larg=(140, 1232),
        pena=(110, 68, 10),
        fundo=(8, 5, 8),
        centro=748,
        base_linha=437,
        altura=58,
        largura_max=760,
        contorno=(34, 4, 18),
        paleta=ROSA),
}


def gradiente(paradas, w, h):
    g = Image.new('RGB', (1, h))
    d = g.load()
    for y in range(h):
        t = y / (h - 1) if h > 1 else 0
        for i in range(len(paradas) - 1):
            a, ca = paradas[i]
            b, cb = paradas[i + 1]
            if a <= t <= b:
                u = (t - a) / (b - a) if b > a else 0
                d[0, y] = tuple(int(ca[j] + (cb[j] - ca[j]) * u) for j in range(3))
                break
    return g.resize((w, h))


def limpar(im, cfg):
    """Pinta a faixa do nome com a cor de fundo, desvanecendo as bordas.

    Interpolar o fundo deixava rastro do texto antigo. Cor chapada nao deixa.
    O desvanecimento cai sobre area ja limpa, entao nao marca emenda.
    """
    y0, y1 = cfg['faixa']
    x0, x1 = cfg['larg']
    fe, fd, fv = cfg['pena']
    orig = im.copy()
    im = im.copy()
    px, po = im.load(), orig.load()
    cor = cfg['fundo']
    for x in range(x0, x1):
        fx = max(0.0, min(1.0, (x - x0) / fe, (x1 - 1 - x) / fd))
        for y in range(y0, y1):
            fy = max(0.0, min(1.0, (y - y0) / fv, (y1 - 1 - y) / fv))
            a = fx * fy
            o = po[x, y]
            px[x, y] = tuple(int(o[i] + (cor[i] - o[i]) * a) for i in range(3))
    return im


def ajustar(nome, cfg):
    """Diminui a fonte ate o nome caber. Nome longo nao pode estourar a moldura."""
    medidor = ImageDraw.Draw(Image.new('L', (10, 10)))
    tam = 110
    while tam > 18:
        f = ImageFont.truetype(FONTE, tam)
        bb = medidor.textbbox((0, 0), nome, font=f)
        if (bb[2] - bb[0]) <= cfg['largura_max'] and (bb[3] - bb[1]) <= cfg['altura']:
            return f, bb
        tam -= 2
    f = ImageFont.truetype(FONTE, 18)
    return f, medidor.textbbox((0, 0), nome, font=f)


def escrever(im, nome, cfg):
    nome = ' '.join(nome.upper().split())
    f, bb = ajustar(nome, cfg)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    x = cfg['centro'] - w // 2 - bb[0]
    y = cfg['base_linha'] - h - bb[1]

    mascara = Image.new('L', im.size, 0)
    ImageDraw.Draw(mascara).text((x, y), nome, font=f, fill=255)

    cx = im.convert('RGB')
    sombra = mascara.filter(ImageFilter.GaussianBlur(5))
    cx.paste(Image.new('RGB', im.size, (0, 0, 0)), (0, 4),
             sombra.point(lambda v: int(v * 0.70)))
    cx.paste(Image.new('RGB', im.size, cfg.get('contorno', (26, 18, 6))), (0, 0),
             mascara.filter(ImageFilter.MaxFilter(3)))
    tinta = Image.new('RGB', im.size)
    tinta.paste(gradiente(cfg['paleta'], im.size[0], h + 8), (0, y + bb[1] - 4))
    cx.paste(tinta, (0, 0), mascara)
    return cx


def gerar(segmento, nome, saida):
    cfg = ARTES.get(str(segmento).lower().strip(), ARTES['barber'])
    im = Image.open(os.path.join(AQUI, cfg['base'])).convert('RGB')
    im = escrever(limpar(im, cfg), nome, cfg)
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    # A arte e fotografica: JPEG entrega o mesmo olho com um decimo do peso.
    # O WhatsApp busca o arquivo por URL, entao peso vira tempo de entrega.
    if saida.lower().endswith(('.jpg', '.jpeg')):
        im.save(saida, 'JPEG', quality=92, optimize=True, progressive=True)
    else:
        im.save(saida, 'PNG', optimize=True)
    return saida


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('uso: gerar.py <barber|beauty> "<nome>" <saida.jpg>')
        raise SystemExit(2)
    print('gerado:', gerar(sys.argv[1], sys.argv[2], sys.argv[3]))
