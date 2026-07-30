const SVG_WIDTH = 520;
const SVG_HEIGHT = 300;
const PLATE_COLOR = '#173d5f';
const WELD_FILL = '#66a4c7';
const WELD_STROKE = '#246b99';
const INNER_WELD_WIDTH_MM = 3;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function point(x, y, scale, originX, originY) {
  return {
    x: originX + x * scale,
    y: originY - y * scale,
  };
}

function pathPoint(value) {
  return `${value.x.toFixed(2)} ${value.y.toFixed(2)}`;
}

export function normalizeButtGeometry(geometry = {}) {
  const t1 = Math.max(0.5, finite(geometry.t1 ?? geometry.t, 8));
  const t2 = Math.max(0.5, finite(geometry.t2 ?? geometry.t, 8));
  const hKV = Math.max(0, finite(geometry.hKV ?? geometry.misalignment_h, 0));
  const bD = Math.max(3, finite(geometry.bD ?? geometry.butt_reinforcement_width_b, 10));
  const hD = Math.max(0, finite(geometry.hD ?? geometry.butt_reinforcement_h, 1));
  const bW = Math.max(3, finite(geometry.bW ?? geometry.root_reinforcement_width_b, 6));
  const hW = Math.max(0, finite(geometry.hW ?? geometry.root_reinforcement_h, 0.8));
  const leftTop = 0;
  const rightTop = hKV;
  const leftBottom = -t1;
  const rightBottom = hKV - t2;
  const zeroY = ((leftTop + leftBottom) / 2 + (rightTop + rightBottom) / 2) / 2;
  return {
    t1, t2, hKV, bD, hD, bW, hW,
    leftTop, rightTop, leftBottom, rightBottom, zeroY,
    innerWidth: INNER_WELD_WIDTH_MM,
  };
}

export function buttGeometrySvg(geometry = {}, accessibility = {face:true, root:true}) {
  const g = normalizeButtGeometry(geometry);
  const plateWidth = Math.max(22, g.bD / 2 + 12, g.bW / 2 + 12);
  const minY = Math.min(g.leftBottom - g.hW - 3, g.rightBottom - g.hW - 3);
  const maxY = Math.max(g.leftTop + g.hD + 3, g.rightTop + g.hD + 3);
  const totalWidth = plateWidth * 2;
  const totalHeight = maxY - minY;
  const scale = Math.min((SVG_WIDTH - 54) / totalWidth, (SVG_HEIGHT - 42) / totalHeight);
  const originX = SVG_WIDTH / 2;
  const originY = 21 + maxY * scale;

  const leftDeck = point(-g.bD / 2, g.leftTop, scale, originX, originY);
  const rightDeck = point(g.bD / 2, g.rightTop, scale, originX, originY);
  const deckBaseAtCenter = (g.leftTop + g.rightTop) / 2;
  const deckApex = point(0, deckBaseAtCenter + g.hD, scale, originX, originY);
  const leftRoot = point(-g.bW / 2, g.leftBottom, scale, originX, originY);
  const rightRoot = point(g.bW / 2, g.rightBottom, scale, originX, originY);
  const rootBaseAtCenter = (g.leftBottom + g.rightBottom) / 2;
  const rootApex = point(0, rootBaseAtCenter - g.hW, scale, originX, originY);
  const leftInner = point(-g.innerWidth / 2, g.zeroY, scale, originX, originY);
  const rightInner = point(g.innerWidth / 2, g.zeroY, scale, originX, originY);

  const leftPlateTop = point(-plateWidth, g.leftTop, scale, originX, originY);
  const leftPlateBottom = point(-plateWidth, g.leftBottom, scale, originX, originY);
  const leftJointBottom = point(0, g.leftBottom, scale, originX, originY);
  const leftJointTop = point(0, g.leftTop, scale, originX, originY);
  const rightJointTop = point(0, g.rightTop, scale, originX, originY);
  const rightPlateTop = point(plateWidth, g.rightTop, scale, originX, originY);
  const rightPlateBottom = point(plateWidth, g.rightBottom, scale, originX, originY);
  const rightJointBottom = point(0, g.rightBottom, scale, originX, originY);

  const weldPath = [
    `M ${pathPoint(leftDeck)}`,
    `Q ${pathPoint(point(-g.bD / 4, deckBaseAtCenter + g.hD, scale, originX, originY))} ${pathPoint(deckApex)}`,
    `Q ${pathPoint(point(g.bD / 4, deckBaseAtCenter + g.hD, scale, originX, originY))} ${pathPoint(rightDeck)}`,
    `L ${pathPoint(rightInner)} L ${pathPoint(rightRoot)}`,
    `Q ${pathPoint(point(g.bW / 4, rootBaseAtCenter - g.hW, scale, originX, originY))} ${pathPoint(rootApex)}`,
    `Q ${pathPoint(point(-g.bW / 4, rootBaseAtCenter - g.hW, scale, originX, originY))} ${pathPoint(leftRoot)}`,
    `L ${pathPoint(leftInner)} Z`,
  ].join(' ');

  const faceMeasured = accessibility.face !== false;
  const rootMeasured = accessibility.root !== false;
  return `<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Dynamische Stumpfnahtdarstellung im I-Stoß" data-joint="butt" data-inner-width-mm="${g.innerWidth.toFixed(1)}">
    <path data-component="1" d="M ${pathPoint(leftPlateTop)} L ${pathPoint(leftJointTop)} L ${pathPoint(leftJointBottom)} L ${pathPoint(leftPlateBottom)} Z" fill="${PLATE_COLOR}" opacity=".96"/>
    <path data-component="2" d="M ${pathPoint(rightJointTop)} L ${pathPoint(rightPlateTop)} L ${pathPoint(rightPlateBottom)} L ${pathPoint(rightJointBottom)} Z" fill="${PLATE_COLOR}" opacity=".96"/>
    <path data-weld-metal="true" d="${weldPath}" fill="${WELD_FILL}" fill-opacity=".58" stroke="${WELD_STROKE}" stroke-width="3" stroke-linejoin="round"/>
    <path data-contour="deck" data-measured="${faceMeasured}" d="M ${pathPoint(leftDeck)} Q ${pathPoint(point(-g.bD / 4, deckBaseAtCenter + g.hD, scale, originX, originY))} ${pathPoint(deckApex)} Q ${pathPoint(point(g.bD / 4, deckBaseAtCenter + g.hD, scale, originX, originY))} ${pathPoint(rightDeck)}" fill="none" stroke="${WELD_STROKE}" stroke-width="3" ${faceMeasured ? '' : 'stroke-dasharray="8 5" opacity=".55"'}/>
    <path data-contour="root" data-measured="${rootMeasured}" d="M ${pathPoint(leftRoot)} Q ${pathPoint(point(-g.bW / 4, rootBaseAtCenter - g.hW, scale, originX, originY))} ${pathPoint(rootApex)} Q ${pathPoint(point(g.bW / 4, rootBaseAtCenter - g.hW, scale, originX, originY))} ${pathPoint(rightRoot)}" fill="none" stroke="${WELD_STROKE}" stroke-width="3" ${rootMeasured ? '' : 'stroke-dasharray="8 5" opacity=".55"'}/>
    <line data-zero-axis="true" x1="${(originX - 5).toFixed(2)}" y1="${point(0, g.zeroY, scale, originX, originY).y.toFixed(2)}" x2="${(originX + 5).toFixed(2)}" y2="${point(0, g.zeroY, scale, originX, originY).y.toFixed(2)}" stroke="#7f8b93" stroke-width="1.5"/>
  </svg>`;
}

export { INNER_WELD_WIDTH_MM };
