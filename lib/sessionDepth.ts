export type DepthSessionInput = {
  title?: string;
  objective?: string;
  scope?: string[];
  outcomes?: string[];
  track?: string;
};

function normaliseTrack(track = "") {
  return track.trim().toLowerCase();
}

function trackMechanismLens(track = "") {
  const t = normaliseTrack(track);
  if (t.includes("network")) {
    return "Mechanism lens — account for the packet/frame path, headers and identifiers, device-local tables/caches, timers/state, and exactly what changes at each hop when those are relevant.";
  }
  if (t.includes("operating") || t === "os") {
    return "Mechanism lens — connect the user-visible behavior to kernel/runtime state: process or thread states, queues, syscalls, page tables, buffers, locks, scheduling or memory-management structures as relevant.";
  }
  if (t.includes("c#") || t.includes("asp.net") || t.includes("dotnet") || t.includes(".net")) {
    return "Mechanism lens — connect the API/language behavior to the CLR and ASP.NET execution model: generated state machines, JIT/runtime behavior, allocation/GC, thread-pool work, middleware/DI lifetime and request state as relevant.";
  }
  if (t.includes("database")) {
    return "Mechanism lens — connect the logical operation to physical execution: indexes/pages, buffer cache, query planning/execution, locks or MVCC visibility, WAL/recovery and storage I/O as relevant.";
  }
  if (t.includes("distributed")) {
    return "Mechanism lens — make the failure model explicit and trace messages plus state transitions under delay, duplication, retry, reordering, partition and crash; state what is durable and what is merely assumed.";
  }
  if (t.includes("azure")) {
    return "Mechanism lens — separate Azure control plane from data plane, then trace identity, network path, resource state, scaling/failure boundaries and the telemetry you would actually inspect.";
  }
  if (t.includes("cloud")) {
    return "Mechanism lens — separate control plane from data plane and reason about placement, network path, identity, elasticity, failure domains, quotas and observability rather than treating the service as a black box.";
  }
  if (t.includes("identity") || t.includes("security")) {
    return "Mechanism lens — identify principals, credentials/tokens/keys, trust boundaries, validation points and attacker capabilities; trace the protocol or authorization decision message by message when relevant.";
  }
  return "Mechanism lens — go below the definition/API level and identify the concrete state, data structures, control flow and invariants that make the behavior work.";
}

export function buildDepthGuide(input: DepthSessionInput) {
  const title = input.title?.trim() || "this session";
  const objective = input.objective?.trim();
  const scope = (input.scope || []).filter(Boolean);
  const focus = scope.slice(0, 4).join(", ");
  const outcome = (input.outcomes || []).find(Boolean);

  return [
    `First principles — explain what problem “${title}” solves, why the mechanism exists, and which invariant or constraint it is protecting.${objective ? ` Tie this back to the stated objective: ${objective}` : ""}`,
    `Concrete trace — work one realistic example end to end without skipping transitions${focus ? `; explicitly account for ${focus}` : ""}. Be precise about what state exists before, what changes, and what state exists after.`,
    trackMechanismLens(input.track),
    `Failure/debugging — derive at least two realistic failure or edge cases from the mechanism itself. For each one, predict the externally visible symptom and the concrete logs, counters, packets, process state, query plan or other evidence that would distinguish it.`,
    `Tradeoff boundary — explain the important performance, reliability, security or complexity tradeoff inside this exact scope, including when the normal/default approach stops being a good choice.${outcome ? ` You should still be able to satisfy the original exit criterion: ${outcome}` : ""}`,
  ];
}

export function deepObjective(input: DepthSessionInput) {
  const objective = input.objective?.trim() || `Understand ${input.title || "this session"}.`;
  return `${objective} Depth means being able to derive the behavior from the mechanism, trace a concrete case, predict failures, and debug from evidence — without expanding into adjacent roadmap sessions.`;
}
