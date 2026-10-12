// Logo AC animado para redes sociais - EffectCraft (modelo de objetos do After Effects).
// Camadas: ../camadas/{traco,lambda,c}.png, recortadas do logo original com a PhotoCraft.
// Duas composicoes: 1080x1080 (feed) e 1080x1920 (Reels/Stories/TikTok), 6 s a 30 fps.
// Correr:  effectcraft-cli script logo-ac.jsx --empty --save-as logo-ac.ecproj

var DIR = "/DATA/shares/workspace/Craft/saida/logo-animado/camadas/";
var WIPE_ANGLE = (typeof $wipeAngle !== "undefined") ? $wipeAngle : 0;     // sentido do "pintar"

// Area util do logo no original: 667 x 820 px. Posicao de cada camada (canto) nessa area.
var BOX = [667, 820];
var LAYERS = {
  traco:  { file: "traco.png",  size: [222, 820], at: [0, 0] },
  lambda: { file: "lambda.png", size: [280, 590], at: [227, 44] },
  c:      { file: "c.png",      size: [190, 255], at: [477, 332] }
};

var footage = {};
for (var k in LAYERS) footage[k] = app.project.importFile(new ImportOptions(new File(DIR + LAYERS[k].file)));

function ease(prop) {
  var e = new KeyframeEase(0, 70);
  for (var i = 1; i <= prop.numKeys; i++) prop.setTemporalEaseAtKey(i, [e], [e]);
}
function ease2(prop) {          // propriedades com 2 dimensoes (posicao)
  var e = new KeyframeEase(0, 70);
  for (var i = 1; i <= prop.numKeys; i++) prop.setTemporalEaseAtKey(i, [e], [e]);
}

function build(name, w, h, boxHeight) {
  var comp = app.project.items.addComp(name, w, h, 1, 6, 30);
  comp.bgColor = [1, 1, 1];
  comp.layers.addSolid([1, 1, 1], "Fundo", w, h, 1);
  var s = boxHeight / BOX[1];
  var ox = (w - BOX[0] * s) / 2, oy = (h - BOX[1] * s) / 2;
  function place(key) {
    var L = LAYERS[key];
    var layer = comp.layers.add(footage[key]);
    var t = layer.property("Transform");
    t.property("Scale").setValue([s * 100, s * 100]);
    var c = [ox + (L.at[0] + L.size[0] / 2) * s, oy + (L.at[1] + L.size[1] / 2) * s];
    t.property("Position").setValue(c);
    return { layer: layer, center: c, s: s };
  }

  // 1. Traco: pinta-se de cima para baixo e depois cintila (madreperola).
  var tr = place("traco");
  var wipe = tr.layer.property("Effects").addProperty("Linear Wipe");
  wipe.property("Wipe Angle").setValue(WIPE_ANGLE);
  wipe.property("Feather").setValue(60 * s);
  var tc = wipe.property("Transition Completion");
  tc.setValueAtTime(0.15, 100); tc.setValueAtTime(1.35, 0); ease(tc);
  var hs = tr.layer.property("Effects").addProperty("Hue/Saturation");
  var hue = hs.property("Master Hue"), sat = hs.property("Master Saturation");
  hue.setValueAtTime(1.4, 0); hue.setValueAtTime(3.6, 35); hue.setValueAtTime(5.8, 0); ease(hue);
  sat.setValueAtTime(1.4, 0); sat.setValueAtTime(3.6, 25); sat.setValueAtTime(5.8, 0); ease(sat);

  // 2. Lambda: desenha-se a partir do vertice, subindo ligeiramente.
  var la = place("lambda");
  var lw = la.layer.property("Effects").addProperty("Linear Wipe");
  lw.property("Wipe Angle").setValue(WIPE_ANGLE);
  lw.property("Feather").setValue(40 * s);
  var lc = lw.property("Transition Completion");
  lc.setValueAtTime(0.8, 100); lc.setValueAtTime(1.8, 0); ease(lc);
  var lp = la.layer.property("Transform").property("Position");
  lp.setValueAtTime(0.8, [la.center[0], la.center[1] + 25 * s]); lp.setValueAtTime(1.8, la.center); ease2(lp);

  // 3. C: entra a deslizar e recebe um reflexo de luz no ouro rosa.
  var cc = place("c");
  var co = cc.layer.property("Transform").property("Opacity");
  co.setValueAtTime(1.5, 0); co.setValueAtTime(2.3, 100); ease(co);
  var cp = cc.layer.property("Transform").property("Position");
  cp.setValueAtTime(1.5, [cc.center[0] + 45 * s, cc.center[1]]); cp.setValueAtTime(2.3, cc.center); ease2(cp);
  var sw = cc.layer.property("Effects").addProperty("CC Light Sweep");
  sw.property("Direction").setValue(-25);
  sw.property("Width").setValue(28);
  sw.property("Sweep Intensity").setValue(55);
  sw.property("Edge Intensity").setValue(30);
  sw.property("Light Color").setValue([1, 0.95, 0.91]);
  var swc = sw.property("Center");          // coordenadas da camada (190 x 255)
  swc.setValueAtTime(2.3, [-80, 128]); swc.setValueAtTime(3.4, [270, 128]); ease2(swc);
  return comp;
}

build("AC quadrado 1080", 1080, 1080, 760);
build("AC vertical 1080x1920", 1080, 1920, 940);
writeLn("composicoes: " + app.project.numItems + " itens no projeto");
