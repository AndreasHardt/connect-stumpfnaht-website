const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = Array.isArray(payload.errors)
      ? payload.errors
      : [payload.error || `Serveranfrage fehlgeschlagen (${response.status}).`];
    throw new Error(messages.join('\n'));
  }
  return payload;
}

async function request(path, payload) {
  return readJson(await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }));
}

export async function loadSecureBootstrap() {
  return readJson(await fetch('./api/bootstrap', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {'Accept': 'application/json'},
  }));
}

export function createRemoteEvaluationService(bootstrap) {
  if (!bootstrap?.config?.criteria?.length) {
    throw new Error('Die geschützte Anwendungskonfiguration ist unvollständig.');
  }
  return {
    config: bootstrap.config,
    evaluatePayload: async payload => {
      const report = payload.report || {};
      const result = await request('./api/evaluate', {...payload, report: {}});
      return {...result, report};
    },
    computeFilletGeometry: payload => request('./api/geometry/fillet', payload),
    computeFilletNominalMeasurements: payload => request('./api/geometry/fillet/nominal', payload),
  };
}

export const GEOMETRY_TOLERANCE_MM = 0.1;
