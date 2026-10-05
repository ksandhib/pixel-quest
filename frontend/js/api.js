const API = {
  async scores() { try { const r = await fetch('/api/highscores'); return await r.json(); } catch (e) { return []; } },
  async save(p) { try { await fetch('/api/highscores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); } catch (e) {} },
  async levels() { try { const l = await (await fetch('/api/levels')).json(); return l.length ? l : ['world1-1']; } catch (e) { return ['world1-1']; } }
};
