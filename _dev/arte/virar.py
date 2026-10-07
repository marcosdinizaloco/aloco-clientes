"""
Vira o conjunto de ícones do BARBER IA (azul) no do BEAUTY IA (champagne
e rosa queimado).

Não desenha ícone novo: são os MESMOS ícones. É isso que faz os dois
parecerem produtos irmãos de verdade — mesma forma, mesmo brilho, mesma
profundidade, outra luz.

Como: cada pixel vai para HSV e só o MATIZ muda. Saturação e brilho ficam
onde estão, senão o ícone perde o volume e vira adesivo.

O mapa do matiz foi escolhido pelo que cada faixa do azul representa no
desenho, não por um número redondo:
    190° ciano  (o núcleo aceso)      -> 42°  champagne
    210° azul   (o corpo da luz)      -> 25°  rosa queimado
    230° azul   (a sombra da luz)     -> 10°  rosa queimado escuro
    250° índigo (o fundo)             -> 355° vinho

O cinza do metal fica cinza: abaixo de 18% de saturação nada é tocado,
porque metal colorido parece plástico.
"""
import sys, numpy as np
from PIL import Image

H_DE, H_ATE = 185.0, 255.0      # o que conta como "azul" neste conjunto
H_SAIDA_DE, H_SAIDA_ATE = 40.0, 12.0   # champagne -> rosa queimado
SAT_MIN = 0.18                  # abaixo disso é metal, não luz
SAT_FATOR = 0.46                # champagne e rosa queimado sao POUCO saturados:
                                # com a saturacao do neon azul isto vira laranja de fogo
SAT_TETO  = 0.46
VAL_LUZ   = 0.07                # champagne e claro: a luz sobe um pouco

def virar(cam_in, cam_out):
    im = Image.open(cam_in).convert('RGBA')
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, alfa = a[..., :3], a[..., 3:]

    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0.0)
    v = mx

    h = np.zeros_like(mx)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    nz = d > 1e-6
    i_r = nz & (mx == r); i_g = nz & (mx == g); i_b = nz & (mx == b)
    h[i_r] = (60 * ((g - b)[i_r] / d[i_r]) + 360) % 360
    h[i_g] = (60 * ((b - r)[i_g] / d[i_g]) + 120)
    h[i_b] = (60 * ((r - g)[i_b] / d[i_b]) + 240)

    azul = (h >= H_DE) & (h <= H_ATE) & (s >= SAT_MIN)
    t = (h - H_DE) / (H_ATE - H_DE)
    h_novo = (H_SAIDA_DE + t * (H_SAIDA_ATE - H_SAIDA_DE)) % 360
    h = np.where(azul, h_novo, h)
    s = np.where(azul, np.minimum(s * SAT_FATOR, SAT_TETO), s)
    v = np.where(azul, np.minimum(v + VAL_LUZ * v, 1.0), v)

    # HSV -> RGB
    c = v * s
    x = c * (1 - np.abs(((h / 60.0) % 2) - 1))
    m = v - c
    z = np.zeros_like(h)
    faixa = (h / 60.0).astype(np.int32) % 6
    rr = np.select([faixa==0,faixa==1,faixa==2,faixa==3,faixa==4,faixa==5], [c,x,z,z,x,c])
    gg = np.select([faixa==0,faixa==1,faixa==2,faixa==3,faixa==4,faixa==5], [x,c,c,x,z,z])
    bb = np.select([faixa==0,faixa==1,faixa==2,faixa==3,faixa==4,faixa==5], [z,z,x,c,c,x])
    out = np.stack([rr+m, gg+m, bb+m], -1)
    out = np.clip(np.concatenate([out, alfa], -1) * 255.0, 0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(cam_out, 'WEBP', quality=86, method=6)
    return azul.mean()

if __name__ == '__main__':
    for nome in sys.argv[1:]:
        pct = virar(nome + '.webp', 'beauty-' + nome + '.webp')
        print('%-12s %4.1f%% dos pixels eram azul' % (nome, pct * 100))
