# Cine Plus (HTML + CSS + JS + Markdown)

Projeto de streaming em HTML, CSS e JavaScript puro com:
- layout responsivo
- paginas separadas (inicio, catalogo e detalhes)
- filmes e series em bancos markdown diferentes
- Minha Lista com localStorage
- Continuar assistindo com progresso salvo
- player customizado para arquivos `.mp4`, `.webm` e `.ogg`
- selecao de temporada/episodio e botao de proximo episodio
- paginacao no catalogo principal

## Estrutura

- `index.html`: home com destaque, filmes, series, continuar e minha lista
- `catalogo.html`: catalogo completo com busca, filtros e paginacao
- `detalhes.html`: pagina de detalhes, temporadas e episodios
- `style.css`: visual e responsividade
- `app.js`: logica da aplicacao, parser markdown, player e progresso
- `videos.md`: banco de filmes
- `series.md`: banco de series

## Banco de filmes (`videos.md`)

Cada filme precisa ser um bloco `##`:

```md
## Titulo do Filme
- categoria: Acao
- descricao: Resumo do filme
- capa: https://link-da-capa.jpg
- video: https://link-do-video.mp4
- ano: 2026
- duracao: 1h 42min
- classificacao: 14
- destaque: sim
- slug: titulo-do-filme
```

Campos:
- obrigatorio: `video`
- recomendados: `categoria`, `descricao`, `capa`
- opcionais: `ano`, `duracao`, `classificacao`, `destaque`, `slug`
- opcional para multi-audio (fallback no player web): `audio`

Exemplo de multi-audio em filme:

```md
## Meu Filme
- video: https://cdn.exemplo.com/filme-pt.mp4
- audio: Portugues | https://cdn.exemplo.com/filme-pt.mp4
- audio: Ingles | https://cdn.exemplo.com/filme-en.mp4
```

## Banco de series (`series.md`)

```md
## Nome da Serie
- tipo: serie
- categoria: Drama
- descricao: Sinopse da serie
- capa: https://link-da-capa.jpg
- ano: 2026
- classificacao: 14
- destaque: sim
- slug: nome-da-serie

### Temporada 1
- episodio: 1 | Piloto | 45min | https://link-ep1.mp4 | https://link-capa-ep1.jpg | descricao do episodio
- episodio: 2 | Episodio 2 | 47min | https://link-ep2.mp4 | https://link-capa-ep2.jpg | descricao do episodio

### Temporada 2
- episodio: 1 | Reencontro | 44min | https://link-s2e1.mp4 | https://link-capa-s2e1.jpg | descricao do episodio
```

Formato do campo `episodio`:
- `numero | titulo | duracao | video | capa(opcional) | descricao(opcional)`

Multi-audio em episodio (logo abaixo do `episodio`):

```md
- episodio: 1 | Episodio - 1 | 45min | https://cdn.exemplo.com/s1e1-pt.mp4
- audio: Portugues | https://cdn.exemplo.com/s1e1-pt.mp4
- audio: Ingles | https://cdn.exemplo.com/s1e1-en.mp4
```

## Como rodar

Nao abra com `file://`. Rode um servidor local.

Exemplo:

```bash
python -m http.server 5500
```

Abra:

`http://localhost:5500`
