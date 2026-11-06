"""Bundle src/*.js into src/template.html and write the playable game to index.html."""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
order = ['core', 'data', 'fx', 'combat', 'enemies', 'player', 'render', 'art', 'game', 'ui']
js = '\n'.join((root / 'src' / f'{n}.js').read_text() for n in order)
out = (root / 'src' / 'template.html').read_text().replace('/*__JS__*/', js)
(root / 'index.html').write_text(out)
print('built index.html', len(out) // 1024, 'KB')
