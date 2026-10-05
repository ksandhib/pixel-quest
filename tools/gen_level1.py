"""Generates frontend/levels/world1-1.json. Edit and re-run, or hand-edit the JSON."""
import json
W, GY = 12000, 480
gaps = [(1500, 1580), (2900, 3020), (4300, 4440), (5600, 5760), (7000, 7200), (8400, 8620), (9800, 10000), (10900, 11060)]
g, x = [], 0
for a, b in gaps:
    g.append([x, a]); x = b
g.append([x, W])
L = dict(world="1-1", width=W, time=300, spawn={"x": 100}, ground=g, platforms=[], blocks=[], pipes=[], coins=[],
         enemies=[], movers=[], hazards=[], checkpoints=[3600, 6900, 9500], goal={"x": 11700})
near = lambda x: any(a - 40 < x + 520 and b + 40 > x for a, b in gaps)
def row(x, y, n): L["coins"] += [{"x": x + i * 32, "y": y} for i in range(n)]
def en(t, x, y): L["enemies"].append({"type": t, "x": x, "y": y})
for i in range(22):
    x, k = 500 + i * 500, i % 6
    if k == 0:
        L["blocks"] += [{"x": x+64, "y": 340, "kind": "q", "reward": "coin"}, {"x": x+96, "y": 340, "kind": "brick"},
                        {"x": x+128, "y": 340, "kind": "q", "reward": "crystal" if i == 12 else "coin"}]
        row(x+60, 290, 4)
    elif k == 1 and not near(x):
        L["pipes"].append({"x": x+100, "h": 64 + 32 * (i % 3)}); en("crawler", x+300, 440); row(x+250, 400, 3)
    elif k == 2:
        L["platforms"] += [{"x": x, "y": 400, "w": 128}, {"x": x+180, "y": 330, "w": 128}, {"x": x+360, "y": 260, "w": 128}]
        row(x+30, 360, 3); row(x+210, 290, 3); row(x+390, 220, 3); en("bug", x+150, 230)
    elif k == 3 and not near(x):
        L["blocks"].append({"x": x+100, "y": 340, "kind": "q", "reward": "orb"}); en("armored", x+260, 440); en("crawler", x+400, 440)
    elif k == 4 and not near(x):
        L["pipes"] += [{"x": x+60, "h": 96}, {"x": x+260, "h": 128}]; en("crawler", x+180, 440); en("bug", x+300, 300)
    elif k == 5 and not near(x):
        L["hazards"].append({"x": x+150, "w": 48}); row(x+142, 380, 3); en("crawler", x+350, 440); en("crawler", x+430, 440)
for n, (a, b) in enumerate(gaps):
    if n >= 2:
        L["movers"].append({"x": a + (b-a)//2 - 48, "y": 410, "w": 96, "dx": (b-a-96)//2 if n % 2 == 0 else 0,
                            "dy": 40 if n % 2 else 0, "speed": 1.6})
json.dump(L, open("frontend/levels/world1-1.json", "w"))
