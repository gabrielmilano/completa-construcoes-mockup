/* Completa Construções · prévia. JS sem dependências. */
(() => {
    "use strict";

    const $ = (sel, raiz = document) => raiz.querySelector(sel);
    const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
    const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const obras = Object.fromEntries((window.OBRAS || []).map((o) => [o.id, o]));
    const srcset = (srcs) => Object.entries(srcs).map(([w, s]) => `${s} ${w}w`).join(", ");
    const maior = (srcs) => srcs[Math.max(...Object.keys(srcs).map(Number))];
    const menor = (srcs) => srcs[Math.min(...Object.keys(srcs).map(Number))];

    /* ------------------------------------------------------------ Cabeçalho */
    const topo = $("[data-topo]");
    const atualizarTopo = () => topo.classList.toggle("topo--solido", scrollY > 30 || !$("[data-menu]").hidden);
    atualizarTopo();
    addEventListener("scroll", atualizarTopo, { passive: true });

    /* ------------------------------------------------------------ Menu do celular */
    const menu = $("[data-menu]");
    const botaoMenu = $("[data-abrir-menu]");
    const alternarMenu = (abrir) => {
        botaoMenu.setAttribute("aria-expanded", String(abrir));
        botaoMenu.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
        document.documentElement.style.overflow = abrir ? "hidden" : "";
        if (abrir) {
            menu.hidden = false;
            requestAnimationFrame(() => menu.classList.add("menu--aberto"));
        } else {
            menu.classList.remove("menu--aberto");
            menu.hidden = true;
        }
        atualizarTopo();
    };
    botaoMenu.addEventListener("click", () => alternarMenu(botaoMenu.getAttribute("aria-expanded") !== "true"));
    $$("[data-fechar-menu]", menu).forEach((a) => a.addEventListener("click", () => alternarMenu(false)));
    addEventListener("keydown", (e) => e.key === "Escape" && !menu.hidden && alternarMenu(false));

    /* ------------------------------------------------------------ Revelar ao rolar */
    const observadorRevelar = new IntersectionObserver(
        (entradas) =>
            entradas.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.classList.add("visivel");
                observadorRevelar.unobserve(e.target);
            }),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    $$(".revelar").forEach((el) => observadorRevelar.observe(el));

    /* ------------------------------------------------------------ Contadores */
    const observadorNumeros = new IntersectionObserver(
        (entradas) =>
            entradas.forEach((e) => {
                if (!e.isIntersecting) return;
                observadorNumeros.unobserve(e.target);
                if (reduzMovimento) return;
                const alvo = Number(e.target.dataset.contar);
                const inicio = performance.now();
                const passo = (t) => {
                    const p = Math.min(1, (t - inicio) / 1400);
                    e.target.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
                    if (p < 1) requestAnimationFrame(passo);
                };
                requestAnimationFrame(passo);
            }),
        { threshold: 0.6 }
    );
    $$("[data-contar]").forEach((el) => observadorNumeros.observe(el));

    /* ------------------------------------------------------------ Portfólio: filtros */
    const cards = $$(".card");
    const contagem = $("[data-contagem]");
    const botaoVerMais = $("[data-ver-mais]");
    const indicador = $(".filtros__indicador");
    const LIMITE = matchMedia("(min-width: 640px)").matches ? 9 : 6; // no celular, uma coluna: 6 cards bastam
    let filtroTipo = "todos";
    let filtroCat = null;
    let verTodos = false;

    const posicionarIndicador = () => {
        const ativo = $('[data-filtro-tipo][aria-checked="true"]');
        if (!ativo || !indicador) return;
        indicador.style.setProperty("--x", `${ativo.offsetLeft}px`);
        indicador.style.setProperty("--w", `${ativo.offsetWidth}px`);
    };

    const aplicarFiltros = (animar) => {
        const filtrado = filtroTipo !== "todos" || filtroCat;
        const combinam = cards.filter(
            (c) => (filtroTipo === "todos" || c.dataset.tipo === filtroTipo) && (!filtroCat || c.dataset.categoria === filtroCat)
        );
        const mostrar = filtrado || verTodos ? combinam : combinam.slice(0, LIMITE);
        cards.forEach((c) => (c.hidden = !mostrar.includes(c)));
        if (animar) {
            mostrar.forEach((c, i) => {
                c.classList.remove("card--entrando");
                void c.offsetWidth; // reinicia a animação
                c.style.setProperty("--atraso", `${Math.min(i, 8) * 0.05}s`);
                c.classList.add("card--entrando");
            });
        }
        const n = combinam.length;
        contagem.textContent =
            mostrar.length === n ? `${n} ${n === 1 ? "projeto" : "projetos"}` : `Mostrando ${mostrar.length} de ${n} projetos`;
        botaoVerMais.hidden = mostrar.length === n;
    };

    $$("[data-filtro-tipo]").forEach((b) =>
        b.addEventListener("click", () => {
            $$("[data-filtro-tipo]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
            filtroTipo = b.dataset.filtroTipo;
            posicionarIndicador();
            aplicarFiltros(true);
        })
    );
    $$("[data-filtro-cat]").forEach((b) =>
        b.addEventListener("click", () => {
            const ativo = b.getAttribute("aria-pressed") === "true";
            $$("[data-filtro-cat]").forEach((x) => x.setAttribute("aria-pressed", "false"));
            b.setAttribute("aria-pressed", String(!ativo));
            filtroCat = ativo ? null : b.dataset.filtroCat;
            aplicarFiltros(true);
        })
    );
    botaoVerMais.addEventListener("click", () => {
        verTodos = true;
        const antes = cards.filter((c) => !c.hidden).length;
        aplicarFiltros(false);
        cards.filter((c) => !c.hidden).slice(antes).forEach((c, i) => {
            c.style.setProperty("--atraso", `${Math.min(i, 8) * 0.05}s`);
            c.classList.add("card--entrando");
        });
    });
    posicionarIndicador();
    aplicarFiltros(false);
    addEventListener("resize", posicionarIndicador);
    document.fonts && document.fonts.ready.then(posicionarIndicador);

    /* ------------------------------------------------------------ Galeria (lightbox) */
    const galeria = $("[data-galeria]");
    const trilho = $("[data-galeria-trilho]", galeria);
    const miniaturas = $("[data-galeria-miniaturas]", galeria);
    const contador = $("[data-galeria-contador]", galeria);
    const botaoPar = $("[data-galeria-par]", galeria);
    let obraAberta = null;
    let fotoAtual = 0;

    const marcarFoto = (i) => {
        fotoAtual = i;
        contador.textContent = `${i + 1} / ${obraAberta.fotos.length}`;
        $$("button", miniaturas).forEach((m, k) => {
            m.setAttribute("aria-current", String(k === i));
            if (k === i) m.scrollIntoView({ block: "nearest", inline: "center", behavior: reduzMovimento ? "auto" : "smooth" });
        });
    };

    const irParaFoto = (i, suave = true) => {
        const total = obraAberta.fotos.length;
        const destino = Math.max(0, Math.min(total - 1, i));
        trilho.scrollTo({ left: destino * trilho.clientWidth, behavior: suave && !reduzMovimento ? "smooth" : "auto" });
    };

    const abrirGaleria = (id, inicio = 0) => {
        const o = obras[id];
        if (!o) return;
        obraAberta = o;
        $("[data-galeria-selo]", galeria).textContent = `${o.selo} · ${o.categoriaRotulo}`;
        $("[data-galeria-nome]", galeria).textContent = o.nome;
        trilho.innerHTML = o.fotos
            .map(
                (f, i) =>
                    `<figure class="galeria__slide"><img src="${maior(f.srcs)}" srcset="${srcset(f.srcs)}" sizes="100vw" width="${f.w}" height="${f.h}" alt="${o.nome}: imagem ${i + 1} de ${o.fotos.length}"${Math.abs(i - inicio) > 1 ? ' loading="lazy"' : ""} decoding="async"></figure>`
            )
            .join("");
        miniaturas.innerHTML = o.fotos
            .map((f, i) => `<button type="button" data-ir="${i}" aria-label="Imagem ${i + 1}"><img src="${menor(f.srcs)}" alt="" loading="lazy"></button>`)
            .join("");
        miniaturas.hidden = o.fotos.length < 2;
        const par = o.par && obras[o.par];
        botaoPar.hidden = !par;
        if (par) {
            botaoPar.textContent = par.tipo === "obra" ? (par.selo === "Em execução" ? "Ver a obra em andamento" : "Ver a obra pronta") : "Ver o projeto 3D";
            botaoPar.dataset.alvo = par.id;
        }
        if (!galeria.open) {
            galeria.showModal();
            document.documentElement.style.overflow = "hidden";
        }
        trilho.scrollLeft = inicio * trilho.clientWidth;
        marcarFoto(inicio);
    };

    galeria.addEventListener("close", () => {
        document.documentElement.style.overflow = "";
        trilho.innerHTML = "";
        obraAberta = null;
    });
    $("[data-galeria-fechar]", galeria).addEventListener("click", () => galeria.close());
    $("[data-galeria-ant]", galeria).addEventListener("click", () => irParaFoto(fotoAtual - 1));
    $("[data-galeria-prox]", galeria).addEventListener("click", () => irParaFoto(fotoAtual + 1));
    miniaturas.addEventListener("click", (e) => {
        const b = e.target.closest("[data-ir]");
        if (b) irParaFoto(Number(b.dataset.ir));
    });
    botaoPar.addEventListener("click", () => abrirGaleria(botaoPar.dataset.alvo));
    let quadroGaleria = 0;
    trilho.addEventListener(
        "scroll",
        () => {
            cancelAnimationFrame(quadroGaleria);
            quadroGaleria = requestAnimationFrame(() => {
                if (!obraAberta) return;
                const i = Math.round(trilho.scrollLeft / trilho.clientWidth);
                if (i !== fotoAtual) marcarFoto(i);
            });
        },
        { passive: true }
    );
    galeria.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") irParaFoto(fotoAtual + 1);
        if (e.key === "ArrowLeft") irParaFoto(fotoAtual - 1);
    });
    document.addEventListener("click", (e) => {
        const alvo = e.target.closest("[data-abrir-obra], [data-comp-galeria]");
        if (alvo) abrirGaleria(alvo.dataset.abrirObra || alvo.dataset.compGaleria);
    });

    /* ------------------------------------------------------------ Do projeto à obra (comparador) */
    const COMPARACOES = {
        incar: {
            a: ["com-incar", 1], b: ["obra-incar", 1], rotuloA: "Projeto 3D", rotuloB: "Obra entregue", titulo: "Incar Veículos",
            texto: "Loja de veículos com projeto e execução da Completa: o render virou endereço de referência.", citacao: true, galeria: "obra-incar",
        },
        casa: {
            a: ["obra-casa-placa", 3], b: ["obra-casa-placa", 1], rotuloA: "A placa na obra", rotuloB: "A casa construída", titulo: "Residência",
            texto: "Na placa da obra, o projeto 3D da casa. Na foto seguinte, a mesma casa construída pela Completa.", citacao: false, galeria: "obra-casa-placa",
        },
        ram: {
            a: ["com-trentino-ram", 1], b: ["obra-trentino-ram", 1], rotuloA: "Projeto 3D", rotuloB: "Em construção", titulo: "Trentino RAM",
            texto: "A placa no terreno anuncia a futura instalação da concessionária. O projeto 3D já virou estrutura de pé.", citacao: false, galeria: "obra-trentino-ram",
        },
    };
    const comparador = $("[data-comparador]");
    const imgA = $("[data-img-a]", comparador);
    const imgB = $("[data-img-b]", comparador);
    const fonte = ([id, n], w) => `src/img/obras/${id}/${n}-${w}.webp`;
    const srcsetComp = (ref) => [480, 960, 1080].map((w) => `${fonte(ref, w)} ${w}w`).join(", ");
    let estadoComp = "a";
    let automatico = true;
    let temporizador = 0;

    const mostrarLado = (lado) => {
        estadoComp = lado;
        comparador.dataset.estado = lado;
        $$("[data-ver]", comparador).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ver === lado)));
    };
    const trocarComparacao = (chave) => {
        const c = COMPARACOES[chave];
        comparador.classList.add("comparador--trocando");
        $$("[data-comparacao]", comparador).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.comparacao === chave)));
        setTimeout(() => {
            mostrarLado("a");
            imgA.srcset = srcsetComp(c.a);
            imgA.src = fonte(c.a, 960);
            imgA.alt = `${c.titulo}: ${c.rotuloA}`;
            imgB.srcset = srcsetComp(c.b);
            imgB.src = fonte(c.b, 960);
            imgB.alt = `${c.titulo}: ${c.rotuloB}`;
            $("[data-selo-a]", comparador).textContent = c.rotuloA;
            $("[data-selo-b]", comparador).textContent = c.rotuloB;
            $("[data-rotulo-a]", comparador).textContent = c.rotuloA;
            $("[data-rotulo-b]", comparador).textContent = c.rotuloB;
            $("[data-comp-titulo]", comparador).textContent = c.titulo;
            $("[data-comp-texto]", comparador).textContent = c.texto;
            $("[data-comp-citacao]", comparador).hidden = !c.citacao;
            $("[data-comp-galeria]", comparador).dataset.compGaleria = c.galeria;
            comparador.classList.remove("comparador--trocando");
        }, 320);
    };
    const pararAutomatico = () => {
        automatico = false;
        clearInterval(temporizador);
    };
    $$("[data-comparacao]", comparador).forEach((b) => b.addEventListener("click", () => { pararAutomatico(); trocarComparacao(b.dataset.comparacao); }));
    $$("[data-ver]", comparador).forEach((b) => b.addEventListener("click", () => { pararAutomatico(); mostrarLado(b.dataset.ver); }));
    $("[data-alternar]", comparador).addEventListener("click", () => { pararAutomatico(); mostrarLado(estadoComp === "a" ? "b" : "a"); });
    mostrarLado("a");
    // Alterna sozinho enquanto está na tela, até a pessoa interagir.
    new IntersectionObserver(
        ([e]) => {
            clearInterval(temporizador);
            if (e.isIntersecting && automatico) {
                temporizador = setInterval(() => !document.hidden && mostrarLado(estadoComp === "a" ? "b" : "a"), 3600);
            }
        },
        { threshold: 0.5 }
    ).observe($("[data-alternar]", comparador));

    /* ------------------------------------------------------------ Jornada de serviços e etapas: progresso ao rolar */
    const jornada = $("[data-jornada]");
    const barraJornada = $("[data-jornada-progresso]");
    const passos = $$(".passo", jornada);
    let jornadaVisivel = false;
    let pendente = false;
    const atualizarJornada = () => {
        pendente = false;
        const r = jornada.getBoundingClientRect();
        const referencia = innerHeight * 0.62;
        const p = Math.min(1, Math.max(0, (referencia - r.top) / r.height));
        barraJornada.style.setProperty("--progresso", p.toFixed(3));
        passos.forEach((ps) => ps.classList.toggle("passo--ativo", ps.getBoundingClientRect().top + 24 < referencia));
    };
    new IntersectionObserver(([e]) => {
        jornadaVisivel = e.isIntersecting;
        if (jornadaVisivel) atualizarJornada();
    }).observe(jornada);
    addEventListener(
        "scroll",
        () => {
            if (jornadaVisivel && !pendente) {
                pendente = true;
                requestAnimationFrame(atualizarJornada);
            }
        },
        { passive: true }
    );

    const trilhoEtapas = $("[data-etapas]");
    const barraEtapas = $("[data-etapas-progresso]");
    const atualizarEtapas = () => {
        const max = trilhoEtapas.scrollWidth - trilhoEtapas.clientWidth;
        const visivel = trilhoEtapas.clientWidth / trilhoEtapas.scrollWidth;
        const p = max > 0 ? trilhoEtapas.scrollLeft / max : 1;
        barraEtapas.style.setProperty("--progresso", (visivel + (1 - visivel) * p).toFixed(3));
    };
    trilhoEtapas.addEventListener("scroll", () => requestAnimationFrame(atualizarEtapas), { passive: true });
    addEventListener("resize", atualizarEtapas);
    requestAnimationFrame(atualizarEtapas);

    /* ------------------------------------------------------------ Mapa sob demanda (o Google Maps pesa ~500 KB) */
    $$("[data-mapa]").forEach((botao) =>
        botao.addEventListener("click", () => {
            const iframe = document.createElement("iframe");
            iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(botao.dataset.mapa)}&z=15&output=embed`;
            iframe.title = `Mapa: ${botao.dataset.mapa}`;
            iframe.referrerPolicy = "no-referrer-when-downgrade";
            const caixa = document.createElement("div");
            caixa.className = "mapa";
            caixa.append(iframe);
            botao.replaceWith(caixa);
            iframe.focus();
        }, { once: true })
    );
})();
