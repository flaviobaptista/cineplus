# Cine Plus (HTML + CSS + JS + Markdown)

Projeto de streaming em HTML, CSS e JavaScript puro com:
- layout responsivo
- cards lado a lado
- pagina de detalhes por video
- Minha Lista com localStorage
- Continuar assistindo com progresso salvo
- player customizado para arquivos `.mp4`, `.webm` e `.ogg`
- paginacao no catalogo principal

## Estrutura

- `index.html`: layout principal
- `style.css`: visual e responsividade
- `app.js`: logica de catalogo, detalhes, player, progresso e lista
- `videos.md`: banco de dados dos videos

## Formato do banco (`videos.md`)

Cada video precisa ser um bloco `##`:

```md
## Titulo do Video
- categoria: Acao
- descricao: Resumo do video
- capa: https://link-da-capa.jpg
- video: https://link-do-video.mp4
- ano: 2026
- duracao: 1h 42min
- classificacao: 14
- destaque: sim
- slug: titulo-do-video
```

Campos:
- obrigatorio: `video`
- recomendados: `categoria`, `descricao`, `capa`
- opcionais: `ano`, `duracao`, `classificacao`, `destaque`, `slug`

`video` aceita:
- arquivo direto (`.mp4`, `.webm`, `.ogg`) -> usa player custom
- YouTube / Vimeo / iframe -> abre embed externo no modal

## Recursos

- Carrossel automatico no destaque com navegacao manual
- Busca por titulo, categoria e descricao
- Rota por hash para detalhes (`#video=slug`)
- Minha Lista persistente no navegador
- Continuar assistindo baseado no tempo salvo
- Barra de progresso nos cards
- Paginacao com botoes de pagina + anterior/proximo no catalogo

## Como rodar

Nao abra com `file://`. Rode um servidor local.

Exemplo:

```bash
python -m http.server 5500
```

Abra:

`http://localhost:5500`
