# Contributing

All contributions follow the [code of conduct](CODE_OF_CONDUCT.md). Contributions are under the
repository's [MIT license](LICENSE).

The wiki states facts about *Breath of Fire III* (US, PlayStation): file formats, memory layouts and
runtime behavior. A change needs evidence: a game address, bytes, or a cited source from the
[sources page](src/appendix/sources.md). Do not add game data, disc images, extracted assets or game
text. To check a claim yourself, dump your own US disc (Redump-verified CUE sheet and BIN tracks).

## Build the book

You need [mdBook](https://rust-lang.github.io/mdBook/), `mdbook-mermaid` and
[dprint](https://dprint.dev/). CI runs the same commands.

```sh
mdbook-mermaid install .
mdbook build .       # writes book/
dprint check         # Markdown format
dprint fmt           # fix the format
```

## Submit a change

Create a branch and keep each change focused. Use commit subjects such as
`docs(formats): correct the EMI header size`. Describe the evidence in the pull request.
