import { computeFilletNominalMeasurements } from './geometry.js?v=efeb2ab95e9b';

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function renderGeometry(geometry) {
  if (!geometry?.points) return null;
  const gamma = finiteNumber(geometry.gamma);
  const gammaRad = finiteNumber(geometry.gammaRad) ?? (gamma === null ? null : gamma * Math.PI / 180);
  const z1 = finiteNumber(geometry.z1);
  const z2 = finiteNumber(geometry.z2);
  const m = finiteNumber(geometry.m);
  const valid = geometry.valid ?? geometry.calculation_valid;
  if (!valid || gamma === null || gammaRad === null || z1 === null || z2 === null || m === null) return null;
  return {points: geometry.points, gamma, gammaRad, z1, z2, m};
}

export const FILLET_WELD_PENETRATION_MM = 1;

function cubicControlsThrough(start, inner1, inner2, end) {
  const firstRight = {
    x: 27 * inner1.x - 8 * start.x - end.x,
    y: 27 * inner1.y - 8 * start.y - end.y,
  };
  const secondRight = {
    x: 27 * inner2.x - start.x - 8 * end.x,
    y: 27 * inner2.y - start.y - 8 * end.y,
  };
  return {
    control1: {
      x: (2 * firstRight.x - secondRight.x) / 18,
      y: (2 * firstRight.y - secondRight.y) / 18,
    },
    control2: {
      x: (2 * secondRight.x - firstRight.x) / 18,
      y: (2 * secondRight.y - firstRight.y) / 18,
    },
  };
}

export function computeFilletPenetrationCurve(geometry, penetration = FILLET_WELD_PENETRATION_MM) {
  const model = renderGeometry(geometry);
  const depth = finiteNumber(penetration);
  if (!model || depth === null || depth < 0) return null;

  const start = model.points.transition1;
  const end = model.points.transition2;
  const inner1 = {x: 0, y: -depth};
  const inner2 = {
    x: -depth * Math.sin(model.gammaRad),
    y: depth * Math.cos(model.gammaRad),
  };
  return {
    depth,
    start,
    inner1,
    inner2,
    end,
    ...cubicControlsThrough(start, inner1, inner2, end),
  };
}

export function filletGeometrySvg(geometry, nominalA, geometryStatus = 'incomplete') {
  const model = renderGeometry(geometry);
  if (!model) return '';

  const {root, transition1, transition2, middle, control} = model.points;
  const nominalGeometry = computeFilletNominalMeasurements(nominalA, model.gamma);
  const targetLeg = nominalGeometry.valid ? nominalGeometry.z1 : null;
  const target1 = targetLeg === null ? null : {x: targetLeg / Math.sin(model.gammaRad), y: 0};
  const target2 = targetLeg === null ? null : {x: targetLeg / Math.tan(model.gammaRad), y: targetLeg};
  const penetrationCurve = computeFilletPenetrationCurve(geometry);

  const relevantSize = Math.max(model.z1, model.z2, model.m, nominalGeometry.valid ? nominalGeometry.a : 0);
  const overrun = Math.max(5, relevantSize * 0.2);
  const component1Length = Math.max(transition1.x, target1?.x || 0) + overrun;
  const component2Length = Math.max(
    Math.hypot(transition2.x, transition2.y),
    target2 ? Math.hypot(target2.x, target2.y) : 0,
  ) + overrun;
  const component1End = {x: component1Length, y: 0};
  const component2End = {
    x: component2Length * Math.cos(model.gammaRad),
    y: component2Length * Math.sin(model.gammaRad),
  };

  const fitPoints = [
    root, transition1, transition2, middle, control,
    component1End, component2End,
    ...(penetrationCurve
      ? [penetrationCurve.inner1, penetrationCurve.inner2, penetrationCurve.control1, penetrationCurve.control2]
      : []),
    ...(target1 && target2 ? [target1, target2] : []),
  ];
  const xs = fitPoints.map(point => point.x);
  const ys = fitPoints.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(260 / width, 140 / height);
  const offsetX = 20 + (260 - width * scale) / 2 - minX * scale;
  const offsetY = 20 + (140 - height * scale) / 2 + maxY * scale;
  const map = point => ({
    x: offsetX + point.x * scale,
    y: offsetY - point.y * scale,
  });
  const svgPoint = point => {
    const mapped = map(point);
    return `${mapped.x.toFixed(1)} ${mapped.y.toFixed(1)}`;
  };

  const rootSvg = svgPoint(root);
  const transition1Svg = svgPoint(transition1);
  const transition2Svg = svgPoint(transition2);
  const controlSvg = svgPoint(control);
  const component1EndSvg = svgPoint(component1End);
  const component2EndSvg = svgPoint(component2End);
  const targetPath = target1 && target2
    ? `<path data-contour="target" d="M ${svgPoint(target1)} L ${svgPoint(target2)}" fill="none" stroke="#7f8b93" stroke-width="7" stroke-linecap="round"/>`
    : '';
  const penetrationFill = penetrationCurve
    ? `C ${svgPoint(penetrationCurve.control2)} ${svgPoint(penetrationCurve.control1)} ${transition1Svg}`
    : `L ${rootSvg} L ${transition1Svg}`;
  const penetrationPath = penetrationCurve
    ? `<path data-contour="measured-lower" data-penetration-mm="${penetrationCurve.depth.toFixed(1)}" d="M ${transition1Svg} C ${svgPoint(penetrationCurve.control1)} ${svgPoint(penetrationCurve.control2)} ${transition2Svg}" fill="none" stroke="#101820" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`
    : '';
  const normalizedStatus = ['pass', 'fail'].includes(geometryStatus) ? geometryStatus : 'incomplete';
  const statusColor = {pass:'#1f7a4d', fail:'#b33a3a', incomplete:'#7f8b93'}[normalizedStatus];
  const geometryStatusPath = `<path data-geometry-status="${normalizedStatus}" d="M ${rootSvg} L ${svgPoint(middle)}" fill="none" stroke="${statusColor}" stroke-width="4" stroke-linecap="round"/>`;

  return `<svg viewBox="0 0 300 180" role="img" aria-label="Plausibilitätsdarstellung der Kehlnaht">
    <path data-component="1" d="M ${rootSvg} L ${component1EndSvg}" fill="none" stroke="#173d5f" stroke-width="10" stroke-linecap="square"/>
    <path data-component="2" d="M ${rootSvg} L ${component2EndSvg}" fill="none" stroke="#173d5f" stroke-width="10" stroke-linecap="square"/>
    ${targetPath}
    <path data-weld-fill="true" d="M ${transition1Svg} Q ${controlSvg} ${transition2Svg} ${penetrationFill} Z" fill="#d7e4eb" opacity=".7"/>
    ${geometryStatusPath}
    <path data-contour="measured-upper" d="M ${transition1Svg} Q ${controlSvg} ${transition2Svg}" fill="none" stroke="#101820" stroke-width="3.5" stroke-linecap="round"/>
    ${penetrationPath}
  </svg>`;
}

