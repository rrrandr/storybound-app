// ── THE THREE ROUTING DECISIONS, IN ONE PLACE (Roman 2026-11-17) ──────────────────────────────
//
//   story-level spine                                   -> Sol
//   opening + continuation scaffolds, and ordinary prose -> Luna
//   intimacy, ONLY when explicitly routed                -> Grok
//
// WHY THIS FILE EXISTS. The model was chosen at roughly a hundred call sites, and the role labels
// are not operations: one capture showed STRUCTURE_GENERATOR serving mistral-small-latest,
// ministral-8b-2512 AND grok-4.3, while PRIMARY_AUTHOR covered the prose author, the normaliser
// and the synopsis pass. A decision spread that thin cannot be stated, let alone verified. So the
// three decisions live here, keyed on the OPERATION, and the operation is identified from the
// request's OWN CONTENT — never from its role, its request number or its endpoint.
//
// AN ENDPOINT NAME IS NOT A MODEL. /api/sol-scene-test served Luna for the spine. Routing is
// therefore asserted on the resolved {model, endpoint} pair at dispatch, and verified by reading
// the outgoing body.
(function () {
  'use strict';

  // ── THE OPERATION SIGNATURES ───────────────────────────────────────────────────────────────
  // These are the SAME strings the literary runner matches on, so the app and the harness cannot
  // disagree about what a request is. Changing one without the other is the defect this prevents.
  var SIGS = {
    // Present ONLY in the architecture request; the opening planner quotes the spine's OUTPUT and
    // carries neither marker.
    spine:          { all: ['CONTINUITY ARCHITECT', 'GRAVITATIONAL STRUCTURE'] },
    openingScaffold:{ any: ['scene-structure planner for the OPENING scene'] },
    // THE CONTINUATION SCAFFOLD. Taken from the real captured body, not guessed: this marker is
    // present in the scene-2 structure request and ABSENT from the prose request (checked against
    // _ft_deck_act/LATEST/*.json, 1 file vs 0). Without it, "continuation scaffolds go to Luna"
    // was a decision with nothing to apply it to — my first implementation covered only openings.
    contScaffold:   { any: ['Reachability (HARD)'] },
    contSkeleton:   { any: ['Define a narrative skeleton for the next scene:'] },
    prose:          { any: ['SCENE CONTINUATION (HARD', 'PROTAGONIST OPENING BEAT (HARD'] },
    // The closer adaptation is ordinary prose: Luna writes it.
    closer:         { any: ['CLOSER ADAPTATION', 'adapt the mandated closer'] },
    // Intimacy is the ONE operation routed to Grok, and only when the request says so itself.
    intimacy:       { any: ['INTIMACY SPECIALIST', 'EXPLICIT INTIMACY ROUTE'] },
  };

  // ── THE RECEIVING CONTRACT, NOT JUST THE MODEL NAME ──────────────────────────────────────
  // Naming the model is not enough to be accepted. api/chatgpt-proxy.js refuses a request whose
  // ROLE is not allowlisted for the model (api/orchestrator.js ALLOWED_MODELS), and
  // STRUCTURE_GENERATOR appears in that table ZERO times — so the captured scene-2 scaffold,
  // which travels under that role, would have been rejected at the door even with the right
  // model. PRIMARY_AUTHOR is the role that admits both gpt-6-luna and gpt-6.1-sol.
  //
  // Luna and Sol are REASONING models by the proxy's own test, /^(gpt-6|gpt-5|o1|o3|o4)/, so the
  // allowance must travel as `max_completion_tokens`, `temperature` is dropped, and
  // `reasoning_effort` is forwarded. Sending `max_tokens` to a reasoning model gives it no
  // completion budget at all.
  //
  // Production creative calls use the ordinary provider proxies. The isolated
  // sol-scene-test endpoint is localhost-only and is never a production route.
  // chatgpt-proxy reads max_tokens and translates it for reasoning models.
  var ROUTES = {
    sol:  { model: 'gpt-6.1-sol', endpoint: '/api/chatgpt-proxy', label: 'Sol',
            role: 'PRIMARY_AUTHOR', operation: 'story-spine', wireAllowance: 'max_tokens' },
    luna: { model: 'gpt-6-luna',  endpoint: '/api/chatgpt-proxy',  label: 'Luna',
            role: 'PRIMARY_AUTHOR', wireAllowance: 'max_tokens' },
    grok: { model: 'grok-4.3',    endpoint: '/api/proxy',          label: 'Grok',
            role: 'INTIMACY_SPECIALIST', wireAllowance: 'max_tokens' },
  };

  // Shape the body to the receiving contract. Returns the fields that CHANGED, so a caller can
  // report exactly what it had to correct.
  function conform(body, route, op) {
    var changes = [];
    if (op === 'FAMOUS_FATE_TEXT') {
      // Provider adapters use messages, or system+user/prompt. Preserve all text
      // when moving to the OpenAI transport rather than sending an empty request.
      if (!Array.isArray(body.messages)) {
        body.messages = [];
        if (body.system) body.messages.push({role: 'system', content: body.system});
        if (body.user || body.prompt) body.messages.push({role: 'user', content: body.user || body.prompt});
        changes.push('messages=provider text');
      } else if (body.system) {
        body.messages.unshift({role: 'system', content: body.system});
        delete body.system;
        changes.push('moved system into messages');
      }
      // These calls previously budgeted visible tokens for non-reasoning models.
      // Luna's combined allowance must also cover reasoning. Larger task-specific
      // budgets (including the 32k plot plans) remain intact.
      var allowance = Number(body.max_tokens || body.max_completion_tokens) || 0;
      if (allowance < 10000) { body.max_tokens = 10000; changes.push('max_tokens=10000 (reasoning headroom)'); }
      if (!body.reasoning_effort) { body.reasoning_effort = 'medium'; changes.push('reasoning_effort=medium'); }
      if ('preferredModel' in body) { delete body.preferredModel; changes.push('dropped preferredModel'); }
    }
    if (body.model !== route.model) { changes.push('model=' + route.model); body.model = route.model; }
    if (route.role && body.role !== route.role) {
      changes.push('role=' + route.role + ' (was ' + (body.role || '(none)') + ')');
      body.role = route.role;
    }
    if (route.operation && body.operation !== route.operation) {
      body.operation = route.operation;
      changes.push('operation=' + route.operation);
    }
    // THE ALLOWANCE TRAVELS IN THE FIELD THIS ROUTE READS, carrying whatever the call site
    // asked for. It is never dropped and never defaulted here: losing it to a handler default
    // is a silent downgrade of the completion budget.
    var want = route.wireAllowance;
    var other = (want === 'max_completion_tokens') ? 'max_tokens' : 'max_completion_tokens';
    if (body[other] != null) {
      if (body[want] == null) {
        body[want] = body[other];
        changes.push(want + '=' + body[want] + ' (moved from ' + other + ')');
      }
      delete body[other];
      changes.push('dropped ' + other + ' (this route refuses it)');
    }
    // temperature is left alone: each handler decides, and sol-scene-test omits it upstream.
    // THE RESPONSE FORMAT THE CONSUMER NEEDS. A scaffold is parsed as JSON by its consumer, so
    // the structured-output request must survive the reroute; prose must NOT be forced to JSON.
    var wantsJson = (op === 'CONTINUATION_SCAFFOLD' || op === 'CONTINUATION_SKELETON' || op === 'OPENING_SCAFFOLD'
                     || op === 'STORY_SPINE');
    if (wantsJson && !body.response_format) {
      body.response_format = { type: 'json_object' };
      changes.push('response_format=json_object');
    }
    if (op !== 'FAMOUS_FATE_TEXT' && !wantsJson && body.response_format && body.response_format.type === 'json_object') {
      delete body.response_format; changes.push('dropped response_format (prose is not JSON)');
    }
    return changes;
  }

  // operation -> assignment. Order matters: the first match wins, and `intimacy` is tested before
  // `prose` because an intimate scene's request also carries the prose marker.
  var ASSIGNMENT = [
    { op: 'CONTINUATION_SKELETON',  sig: 'contSkeleton',     route: 'luna' },
    { op: 'STORY_SPINE',            sig: 'spine',           route: 'sol'  },
    { op: 'INTIMACY',               sig: 'intimacy',        route: 'grok' },
    { op: 'OPENING_SCAFFOLD',       sig: 'openingScaffold', route: 'luna' },
    { op: 'CONTINUATION_SCAFFOLD',  sig: 'contScaffold',     route: 'luna' },
    { op: 'CLOSER_ADAPTATION',      sig: 'closer',          route: 'luna' },
    { op: 'ORDINARY_PROSE',         sig: 'prose',           route: 'luna' },
  ];

  function bodyText(body) {
    try {
      if (!body) return '';
      if (typeof body === 'string') return body;
      var parts = [];
      if (Array.isArray(body.messages)) {
        body.messages.forEach(function (m) { parts.push(String((m && m.content) || '')); });
      }
      if (body.system) parts.push(String(body.system));
      if (body.user) parts.push(String(body.user));
      if (body.prompt) parts.push(String(body.prompt));
      return parts.join('\n');
    } catch (_) { return ''; }
  }

  function matches(txt, spec) {
    if (!spec) return false;
    if (spec.all) return spec.all.every(function (s) { return txt.indexOf(s) !== -1; });
    if (spec.any) return spec.any.some(function (s) { return txt.indexOf(s) !== -1; });
    return false;
  }

  // Famous Fate supplies its active mode at dispatch. Other stories keep the
  // established operation-specific policy; their utility calls are untouched.
  function resolve(url, body, context) {
    var txt = bodyText(body);
    if (!txt) return null;
    // Famous Fate reader defaults apply to EVERY text operation, including setup,
    // canon extraction, bibles, audits and suggestions. No test configuration is
    // required. The actual story mode, not a stale famousFate object, owns scope.
    if (context && context.fateMode === 'famous_fate') {
      var spine = body.operation === 'story-spine';
      var explicit = body.operation === 'explicit-intimacy'
        || (context.explicitIntimacy === true
          && /^(INTIMACY_SPECIALIST|SD_RENDERER|SD_FALLBACK)$/.test(body.role || ''));
      var key = spine ? 'sol' : (explicit ? 'grok' : 'luna');
      var fr = ROUTES[key];
      return { op: spine ? 'STORY_SPINE' : (explicit ? 'INTIMACY' : 'FAMOUS_FATE_TEXT'),
        model: fr.model, endpoint: fr.endpoint, label: fr.label, role: fr.role,
        route: fr, famousFate: true, wasModel: body.model || body.preferredModel || null,
        wasRole: body.role || null, wasEndpoint: url || null };
    }
    for (var i = 0; i < ASSIGNMENT.length; i++) {
      if (matches(txt, SIGS[ASSIGNMENT[i].sig])) {
        var r = ROUTES[ASSIGNMENT[i].route];
        return { op: ASSIGNMENT[i].op, model: r.model, endpoint: r.endpoint, label: r.label,
                 role: r.role, allowanceField: r.allowanceField, route: r,
                 wasModel: (body && body.model) || null, wasRole: (body && body.role) || null,
                 wasEndpoint: url || null };
      }
    }
    return null;
  }

  window.SB_MODEL_ROUTING = {
    SIGS: SIGS, ROUTES: ROUTES, ASSIGNMENT: ASSIGNMENT,
    bodyText: bodyText, resolve: resolve, conform: conform,
  };
})();
