"""Build do mockup da Completa Construções.

Lê o catálogo do dossiê (../completa-construcoes-mockup/obras.json), converte as imagens
para WebP em tamanhos responsivos e gera:
  - src/img/obras/<projeto>/<n>-<largura>.webp, src/img/etapas, src/img/clientes, src/img/marca
  - src/js/obras-dados.js  (dados das galerias para o lightbox)
  - os cards do portfólio, escritos no index.html entre <!-- OBRAS:INICIO --> e <!-- OBRAS:FIM -->
Rodar de dentro de completa-construcoes/:  python _build/gerar.py
"""
import html
import json
import os
import re

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIE = os.path.join(os.path.dirname(RAIZ), "completa-construcoes-mockup")
IMG = os.path.join(RAIZ, "src", "img")
QUALIDADE = 74

catalogo = json.load(open(os.path.join(DOSSIE, "obras.json"), encoding="utf-8"))
projetos = {p["id"]: p for p in catalogo["projetos"]}

# Ordem do portfólio: começa pelas obras reais e pelos projetos mais fortes.
ORDEM = [
    "obra-incar", "res-casa-piscina", "obra-trentino-ram", "res-casa-telhados-inclinados", "com-zoe",
    "obra-casa-placa", "res-sobrado-escuro", "int-gourmet", "com-coworking", "res-casa-campo",
    "obra-casa-escadaria", "com-infoeletro", "res-sobrado-jardineiras", "int-banheiro", "com-galpao",
    "res-sobrado-piscina", "obra-casa-branca", "com-trentino-ram", "com-incar", "res-casa-meia-agua",
    "com-arena", "res-casa-branca-escadaria", "obra-alvenaria", "res-casa-terrea-varanda", "com-patio",
    "int-closet", "res-casa-encosta", "obra-casa-23", "res-sobrado-classico", "int-suite", "res-casa-ripado",
    "obra-acabamentos", "res-sobrado-tijolo", "int-lavanderia",
]
assert sorted(ORDEM) == sorted(projetos), set(projetos) ^ set(ORDEM)

CATEGORIA = {"residencial": "Residencial", "comercial": "Comercial", "interiores": "Interiores"}


def selo(p):
    if p["tipo"] == "projeto-3d":
        return "Projeto 3D"
    return "Obra entregue" if p.get("status") == "entregue" else "Em execução"


def converter(origem, destino_base, larguras):
    """Gera <destino_base>-<w>.webp para cada largura (sem ampliar). Devolve (srcs, w, h)."""
    im = Image.open(os.path.join(DOSSIE, origem)).convert("RGB")
    os.makedirs(os.path.dirname(destino_base), exist_ok=True)
    saidas = {}
    for w in larguras:
        w_real = min(w, im.width)
        alvo = f"{destino_base}-{w_real}.webp"
        if w_real not in saidas:
            if not os.path.exists(alvo):
                im.resize((w_real, round(im.height * w_real / im.width)), Image.LANCZOS).save(
                    alvo, "WEBP", quality=QUALIDADE, method=6
                )
            saidas[w_real] = os.path.relpath(alvo, RAIZ).replace(os.sep, "/")
    return saidas, im.width, im.height


def quadrado(origem, destino_base, lados):
    im = Image.open(os.path.join(DOSSIE, origem)).convert("RGB")
    lado = min(im.size)
    im = im.crop(((im.width - lado) // 2, (im.height - lado) // 2, (im.width + lado) // 2, (im.height + lado) // 2))
    os.makedirs(os.path.dirname(destino_base), exist_ok=True)
    for l in lados:
        alvo = f"{destino_base}-{l}.webp"
        if not os.path.exists(alvo):
            im.resize((l, l), Image.LANCZOS).save(alvo, "WEBP", quality=80, method=6)


# ------------------------------------------------------------------ Obras
dados = []
for pid in ORDEM:
    p = projetos[pid]
    fotos = []
    for n, origem in enumerate(p["imagens"], 1):
        srcs, w, h = converter(origem, os.path.join(IMG, "obras", pid, str(n)), [480, 960])
        fotos.append({"srcs": srcs, "w": w, "h": h, "arquivo": os.path.basename(origem)})
    dados.append({
        "id": pid,
        "nome": p["nome"],
        "categoria": p["categoria"],
        "categoriaRotulo": CATEGORIA[p["categoria"]],
        "tipo": "obra" if p["tipo"] == "obra-executada" else "projeto",
        "selo": selo(p),
        "par": p.get("obra_real") or p.get("projeto_3d"),
        "fotos": fotos,
    })

# Hero e comparador usam versões maiores de algumas fotos
EXTRA_GRANDE = {
    "com-incar": 0, "obra-incar": 0, "obra-casa-placa": 2, "obra-casa-placa#0": 0,
    "com-trentino-ram": 0, "obra-trentino-ram": 0,
}
for chave, i in EXTRA_GRANDE.items():
    pid = chave.split("#")[0]
    origem = projetos[pid]["imagens"][i]
    converter(origem, os.path.join(IMG, "obras", pid, str(i + 1)), [1080])

# ------------------------------------------------------------------ Etapas de obra
etapas = []
for n, e in enumerate(catalogo["etapas"], 1):
    srcs, w, h = converter(e["imagens"][0], os.path.join(IMG, "etapas", str(n)), [480, 960])
    etapas.append({"etapa": e["etapa"], "srcs": srcs, "w": w, "h": h})

# ------------------------------------------------------------------ Clientes (depoimentos)
for nome in ["Maicon-e-Tatiana", "Rafael", "Samantha-e-Natan", "Jonathann-e-Manuela", "Sem-Nome", "Ramon-Salvaro"]:
    quadrado(f"imagens/06-depoimentos/{nome}.png", os.path.join(IMG, "clientes", nome.lower()), [96, 192])

# ------------------------------------------------------------------ Marca
os.makedirs(os.path.join(IMG, "marca"), exist_ok=True)
logo = Image.open(os.path.join(DOSSIE, "imagens/01-marca/Logo-Site-1.png")).convert("RGBA")
logo.save(os.path.join(IMG, "marca", "logo-completa.png"), optimize=True)
logo.save(os.path.join(IMG, "marca", "logo-completa.webp"), "WEBP", quality=90, method=6)
simbolo = Image.open(os.path.join(DOSSIE, "imagens/01-marca/flaicone.png")).convert("RGBA")
simbolo.resize((180, 180), Image.LANCZOS).save(os.path.join(IMG, "marca", "favicon-180.png"), optimize=True)
simbolo.resize((48, 48), Image.LANCZOS).save(os.path.join(IMG, "marca", "favicon-48.png"), optimize=True)

# ------------------------------------------------------------------ Dados para o JS
with open(os.path.join(RAIZ, "src", "js", "obras-dados.js"), "w", encoding="utf-8") as f:
    f.write("// Gerado por _build/gerar.py a partir do catálogo do dossiê. Não editar à mão.\n")
    f.write("window.OBRAS = " + json.dumps(dados, ensure_ascii=False, separators=(",", ":")) + ";\n")
    f.write("window.ETAPAS = " + json.dumps(etapas, ensure_ascii=False, separators=(",", ":")) + ";\n")

# ------------------------------------------------------------------ Cards do portfólio no HTML
VISIVEIS = 9


def card(p, n):
    capa = p["fotos"][0]
    s = p["fotos"][0]["srcs"]
    srcset = ", ".join(f"{src} {w}w" for w, src in sorted(s.items()))
    menor = s[min(s)]
    ratio = f"{capa['w']} / {capa['h']}"
    par = '<span class="card__par">Projeto + obra</span>' if p["par"] else ""
    oculto = " hidden" if n >= VISIVEIS else ""
    qtd = len(p["fotos"])
    return f"""<li class="card card--{p['tipo']}{' card--destaque' if n == 0 else ''}" data-tipo="{p['tipo']}" data-categoria="{p['categoria']}" data-ordem="{n}"{oculto}>
  <button type="button" class="card__botao" data-abrir-obra="{p['id']}">
    <span class="card__foto"><img src="{menor}" srcset="{srcset}" sizes="(min-width: 1024px) {'62vw' if n == 0 else '31vw'}, (min-width: 640px) 48vw, 92vw" width="{capa['w']}" height="{capa['h']}" alt="" loading="{'eager' if n < 2 else 'lazy'}" decoding="async" style="aspect-ratio:{ratio}"></span>
    <span class="card__selo">{p['selo']}</span>{par}
    <span class="card__info">
      <span class="card__meta">{p['categoriaRotulo']} · {qtd} {'imagem' if qtd == 1 else 'imagens'}</span>
      <span class="card__nome">{html.escape(p['nome'])}</span><span class="sr-only"> (abrir galeria)</span>
    </span>
    <span class="card__seta" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span>
  </button>
</li>"""


cards = "\n".join(card(p, n) for n, p in enumerate(dados))
caminho_index = os.path.join(RAIZ, "index.html")
if os.path.exists(caminho_index):
    texto = open(caminho_index, encoding="utf-8").read()
    novo = re.sub(r"(<!-- OBRAS:INICIO -->).*?(<!-- OBRAS:FIM -->)", lambda m: f"{m.group(1)}\n{cards}\n{m.group(2)}", texto, flags=re.S)
    novo = re.sub(r'data-total-obras="\d+"', f'data-total-obras="{len(dados)}"', novo)
    html_etapas = "\n".join(
        f"""<li class="etapa"><figure><img src="{e['srcs'][min(e['srcs'])]}" srcset="{', '.join(f'{s} {w}w' for w, s in sorted(e['srcs'].items()))}" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 44vw, 78vw" width="{e['w']}" height="{e['h']}" alt="{html.escape(e['etapa'])}" loading="lazy" decoding="async"></figure><span class="etapa__num">Etapa {n:02d}</span><h3>{html.escape(e['etapa'])}</h3></li>"""
        for n, e in enumerate(etapas, 1)
    )
    novo = re.sub(r"(<!-- ETAPAS:INICIO -->).*?(<!-- ETAPAS:FIM -->)", lambda m: f"{m.group(1)}\n{html_etapas}\n{m.group(2)}", novo, flags=re.S)
    open(caminho_index, "w", encoding="utf-8").write(novo)

total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(IMG) for f in fs)
print(f"{len(dados)} projetos, {sum(len(p['fotos']) for p in dados)} fotos, {len(etapas)} etapas; src/img = {total / 1024 / 1024:.1f} MB")
