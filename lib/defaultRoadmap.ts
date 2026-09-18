export type DefaultSession = {
  slug: string;
  title: string;
  objective: string;
  scope: string[];
  outcomes: string[];
  estimatedMinutes?: number;
};

export type DefaultTopic = {
  slug: string;
  title: string;
  track: string;
  order: number;
  summary: string;
  stage: "foundation" | "core" | "advanced";
  mustKnow: string[];
  sessions: DefaultSession[];
};

const s = (slug: string, title: string, objective: string, scope: string[], outcomes: string[], estimatedMinutes = 45): DefaultSession => ({ slug, title, objective, scope, outcomes, estimatedMinutes });

export const defaultRoadmap: DefaultTopic[] = [
  {
    slug: "dsa-foundations", title: "Complexity, arrays & hashing", track: "A · Algorithms & Data Structures", order: 10, stage: "foundation",
    summary: "The baseline reasoning tools behind most coding interview problems.", mustKnow: ["Big-O", "arrays", "strings", "hash maps", "sets"],
    sessions: [
      s("dsa-foundations-complexity", "Complexity as a reasoning tool", "Estimate time and space from code and constraints instead of memorizing labels.", ["Big-O/Theta intuition", "input-size constraints", "amortized cost", "time-space tradeoffs"], ["derive complexity from loops/recursion", "choose a feasible target complexity"]),
      s("dsa-foundations-arrays-strings", "Arrays, strings & indexing", "Build a precise model of contiguous storage and the operations interview problems exploit.", ["indexing", "in-place mutation", "prefix/suffix information", "two-dimensional indexing"], ["spot linear-scan opportunities", "reason about in-place transforms"]),
      s("dsa-foundations-hashing", "Hash maps & sets", "Know when hashing changes the shape of a problem and what tradeoffs it introduces.", ["membership", "frequency maps", "deduplication", "collision intuition", "ordered vs unordered alternatives"], ["replace nested scans with lookup", "explain average vs worst-case behavior"]),
    ],
  },
  {
    slug: "dsa-patterns", title: "Core interview patterns", track: "A · Algorithms & Data Structures", order: 20, stage: "core",
    summary: "Reusable problem-shape recognition for common interview families.", mustKnow: ["two pointers", "sliding window", "binary search", "stack/queue", "heap", "intervals"],
    sessions: [
      s("dsa-patterns-two-pointers-window", "Two pointers & sliding windows", "Distinguish pointer movement invariants from window-maintenance invariants.", ["opposite-direction pointers", "same-direction pointers", "fixed windows", "variable windows"], ["state the invariant before coding", "choose the correct pattern from constraints"]),
      s("dsa-patterns-binary-search", "Binary search beyond exact lookup", "Use monotonicity to search answer spaces and boundaries.", ["lower/upper bound", "first true / last false", "binary search on answer"], ["prove monotonicity", "avoid off-by-one loops"]),
      s("dsa-patterns-stacks-heaps-intervals", "Stacks, heaps & intervals", "Recognize ordering constraints that call for monotonic stacks, priority queues, or interval sweeps.", ["monotonic stack", "top-k", "merge intervals", "event sorting"], ["select the right ordered structure", "explain heap and sweep-line complexity"]),
    ],
  },
  {
    slug: "dsa-graphs-dp", title: "Graphs & dynamic programming", track: "A · Algorithms & Data Structures", order: 30, stage: "advanced",
    summary: "State-space reasoning for connectivity, ordering, paths and optimization.", mustKnow: ["BFS/DFS", "topological sort", "union-find", "shortest paths", "greedy", "DP", "knapsack"],
    sessions: [
      s("dsa-graphs-traversal", "Graph traversal & connectivity", "Model problems as graphs and choose BFS, DFS or DSU intentionally.", ["implicit graphs", "visited state", "components", "cycle detection", "union-find"], ["build a graph model from prose", "justify traversal choice"]),
      s("dsa-graphs-order-path", "Ordering & shortest paths", "Separate DAG ordering from weighted path problems.", ["topological sort", "BFS shortest path", "Dijkstra", "0-1 BFS basics"], ["match edge assumptions to algorithm", "explain correctness constraints"]),
      s("dsa-dp-modeling", "Dynamic programming state design", "Turn brute-force choices into state, transitions and memoization/tabulation.", ["state definition", "transition", "base cases", "memoization", "tabulation", "0/1 knapsack"], ["derive a recurrence", "compress state when safe"]),
    ],
  },
  {
    slug: "csharp-language", title: "C# language model", track: "B · C# / .NET", order: 110, stage: "foundation",
    summary: "Language semantics you should be able to explain while writing production C#.", mustKnow: ["types", "generics", "interfaces", "delegates", "events", "LINQ", "exceptions"],
    sessions: [
      s("csharp-types-generics", "Types, generics & variance", "Build a precise model of value/reference semantics and generic abstraction.", ["value vs reference types", "boxing", "generic constraints", "covariance/contravariance"], ["predict copying/mutation behavior", "design type-safe generic APIs"]),
      s("csharp-abstractions-delegates", "Interfaces, delegates & events", "Understand C# abstraction and callback mechanisms without hand-waving.", ["interfaces", "abstract classes", "delegates", "Func/Action", "events"], ["choose interface vs inheritance", "explain event encapsulation"]),
      s("csharp-linq-errors", "LINQ, enumeration & exceptions", "Reason about deferred execution, enumeration cost and error boundaries.", ["IEnumerable", "deferred execution", "materialization", "exception flow", "using/disposal"], ["spot repeated enumeration", "choose exception-handling boundaries"]),
    ],
  },
  {
    slug: "dotnet-runtime", title: ".NET runtime", track: "B · C# / .NET", order: 120, stage: "core",
    summary: "CLR, compilation, allocation and lifetime management.", mustKnow: ["CLR", "IL", "JIT", "GC", "stack/heap", "boxing", "IDisposable"],
    sessions: [
      s("dotnet-runtime-execution", "From C# to machine code", "Follow a .NET program through compilation, loading and JIT execution.", ["C# compiler", "IL", "assemblies", "CLR", "JIT", "tiered compilation"], ["trace execution end-to-end", "separate compile-time from runtime work"]),
      s("dotnet-runtime-memory", "Managed memory & GC", "Understand allocation, generations and why GC-friendly code matters.", ["managed heap", "generations", "roots", "collection", "LOH", "allocation pressure"], ["explain reachability", "diagnose GC pressure conceptually"]),
      s("dotnet-runtime-resources", "Deterministic resource cleanup", "Separate memory reclamation from external resource lifetime.", ["IDisposable", "using", "finalizers", "SafeHandle"], ["explain why GC is insufficient for handles", "write correct disposal ownership"]),
    ],
  },
  {
    slug: "dotnet-concurrency", title: "Async & concurrency", track: "B · C# / .NET", order: 130, stage: "advanced",
    summary: "Tasks, async I/O, shared-state concurrency and cancellation.", mustKnow: ["Task", "async/await", "ThreadPool", "locks", "SemaphoreSlim", "CancellationToken"],
    sessions: [
      s("dotnet-async-model", "Task and async/await mental model", "Explain what async actually does and what it does not do.", ["Task", "continuations", "I/O completion", "SynchronizationContext", "ConfigureAwait"], ["explain why await does not create a thread", "trace async control flow"]),
      s("dotnet-threading-sync", "Threads, ThreadPool & synchronization", "Reason about shared state and synchronization primitives.", ["threads", "ThreadPool", "lock/Monitor", "SemaphoreSlim", "Concurrent collections"], ["identify races", "choose a synchronization primitive"]),
      s("dotnet-cancellation-deadlocks", "Cancellation, deadlocks & async failure modes", "Handle cooperative cancellation and avoid blocking-over-async traps.", ["CancellationToken", "Task.WhenAll", "deadlocks", "sync-over-async", "exception aggregation"], ["propagate cancellation", "debug common async deadlocks"]),
    ],
  },
  {
    slug: "aspnet-pipeline", title: "Request pipeline", track: "C · ASP.NET Core", order: 210, stage: "foundation",
    summary: "How an HTTP request enters Kestrel, traverses middleware and reaches an endpoint.", mustKnow: ["Kestrel", "middleware", "routing", "controllers", "model binding", "validation"],
    sessions: [
      s("aspnet-request-lifecycle", "Kestrel to endpoint", "Trace one request through ASP.NET Core at interview-level precision.", ["Kestrel", "middleware pipeline", "routing", "endpoint execution", "response"], ["draw the request lifecycle", "explain middleware ordering"]),
      s("aspnet-routing-binding", "Routing & model binding", "Understand how route selection and request data become action parameters/models.", ["attribute/conventional routing", "route values", "FromRoute/Query/Body/Header/Form/Services", "content negotiation"], ["predict binding source", "debug routing ambiguity"]),
      s("aspnet-validation-results", "Validation & action results", "Connect model validation to API responses and MVC results.", ["DataAnnotations", "ModelState", "ApiController behavior", "IActionResult", "ProblemDetails"], ["explain automatic 400 behavior", "choose appropriate result types"]),
    ],
  },
  {
    slug: "aspnet-services", title: "Application services", track: "C · ASP.NET Core", order: 220, stage: "core",
    summary: "DI, configuration, logging and cross-cutting behavior.", mustKnow: ["DI", "configuration", "logging", "filters", "error handling", "HTTP clients"],
    sessions: [
      s("aspnet-di-config", "Dependency injection & configuration", "Reason about service lifetimes and configuration sources.", ["Transient/Scoped/Singleton", "constructor injection", "Options pattern", "environment variables", "user secrets"], ["choose DI lifetime", "avoid captive dependencies"]),
      s("aspnet-cross-cutting", "Filters, errors & logging", "Place cross-cutting concerns at the correct layer.", ["filters", "exception middleware", "structured logging", "correlation IDs"], ["choose middleware vs filter", "design useful logs"]),
      s("aspnet-httpclient", "Outbound HTTP & resilience", "Use HttpClient correctly in long-running services.", ["IHttpClientFactory", "connection pooling", "DNS refresh", "timeouts", "resilience handlers"], ["avoid socket exhaustion", "set timeout/retry boundaries"]),
    ],
  },
  {
    slug: "aspnet-production", title: "Production backend engineering", track: "C · ASP.NET Core", order: 230, stage: "advanced",
    summary: "Security, persistence, performance and operability in production APIs.", mustKnow: ["auth", "authorization", "EF Core", "gRPC", "caching", "rate limiting", "health checks", "OpenTelemetry"],
    sessions: [
      s("aspnet-security", "Authentication & authorization pipeline", "Connect tokens/cookies to ClaimsPrincipal, policies and endpoint authorization.", ["authentication schemes", "JWT bearer", "cookies", "claims", "policies", "roles"], ["trace an authenticated request", "separate authentication from authorization"]),
      s("aspnet-data-rpc", "EF Core & gRPC service boundaries", "Use persistence and RPC intentionally inside backend services.", ["DbContext lifetime", "tracking", "N+1", "transactions", "gRPC contracts", "REST vs gRPC"], ["spot EF query traps", "choose REST vs gRPC"]),
      s("aspnet-operability", "Caching, rate limits & observability", "Design runtime protection and diagnostics around an API.", ["response/distributed caching", "rate limiting", "health checks", "metrics/traces/logs", "OpenTelemetry"], ["choose cache layer", "design readiness and telemetry"]),
    ],
  },
  {
    slug: "db-relational", title: "Relational foundations", track: "D · Databases", order: 310, stage: "foundation",
    summary: "The relational model, SQL operations and physical access basics.", mustKnow: ["SQL", "keys", "normalization", "joins", "indexes"],
    sessions: [
      s("db-relational-model", "Keys, constraints & normalization", "Model data so invariants are explicit and duplication is controlled.", ["primary/foreign keys", "constraints", "1NF-3NF intuition", "denormalization"], ["design a normalized schema", "justify denormalization"]),
      s("db-sql-joins", "SQL joins, grouping & subqueries", "Reason about relational operations rather than memorized syntax.", ["inner/outer joins", "GROUP BY", "HAVING", "subqueries", "CTEs", "window functions basics"], ["predict result cardinality", "write correct aggregation"]),
      s("db-index-basics", "Indexes and access paths", "Understand why indexes help and when they do not.", ["B-tree intuition", "selectivity", "composite indexes", "covering indexes", "write cost"], ["choose index column order", "explain index tradeoffs"]),
    ],
  },
  {
    slug: "db-transactions", title: "Transactions & query execution", track: "D · Databases", order: 320, stage: "core",
    summary: "How databases execute, isolate and recover concurrent work.", mustKnow: ["query plans", "ACID", "isolation", "locking", "MVCC", "deadlocks"],
    sessions: [
      s("db-query-plans", "Query planning & execution", "Read the shape of a query plan and connect it to indexes/data volume.", ["scan types", "joins", "cardinality estimates", "sort/hash", "EXPLAIN"], ["spot likely bottlenecks", "connect bad estimates to plans"]),
      s("db-isolation", "ACID, isolation & anomalies", "Explain which anomalies isolation levels prevent and why.", ["atomicity/durability", "dirty/non-repeatable/phantom reads", "snapshot isolation", "serializable"], ["match anomaly to isolation", "reason about correctness vs concurrency"]),
      s("db-locking-mvcc", "Locks, MVCC & deadlocks", "Understand how concurrency control becomes waits, versions and deadlocks.", ["row/table locks", "MVCC snapshots", "deadlock cycles", "retry"], ["diagnose lock contention", "explain deadlock handling"]),
    ],
  },
  {
    slug: "db-distributed", title: "Distributed data", track: "D · Databases", order: 330, stage: "advanced",
    summary: "Replication, partitioning and consistency under failure.", mustKnow: ["replication", "partitioning", "consistency", "failover", "SQL vs NoSQL"],
    sessions: [
      s("db-replication", "Replication & failover", "Explain primary/replica behavior and the consistency implications of failover.", ["sync/async replication", "replication lag", "read replicas", "failover", "split-brain"], ["reason about stale reads", "explain RPO/RTO implications"]),
      s("db-partitioning", "Partitioning & sharding", "Distribute data intentionally while preserving queryability.", ["range/hash sharding", "partition key", "hot partitions", "rebalancing", "cross-shard queries"], ["choose a partition key", "identify hotspot risks"]),
      s("db-model-choice", "SQL vs NoSQL tradeoffs", "Choose a data model from access patterns and consistency needs.", ["document/key-value/wide-column", "schema flexibility", "transactions", "query patterns"], ["justify a database choice", "avoid category-level myths"]),
    ],
  },
  {
    slug: "networking-request", title: "From URL to server", track: "E · Networking", order: 410, stage: "foundation",
    summary: "A deliberately decomposed request path. Each session is one ChatGPT conversation, not the whole Internet at once.", mustKnow: ["URL", "DNS", "IP", "routing", "ARP/ND", "TCP", "TLS", "HTTP"],
    sessions: [
      s("net-url-browser", "1. URL parsing and browser request setup", "Explain exactly what the client learns from a URL before touching the network.", ["URL components", "scheme/host/port/path/query", "default ports", "browser cache/HSTS at a high level", "request target"], ["parse a URL precisely", "state what information is still missing before connection"]),
      s("net-dns-resolution", "2. DNS resolution path", "Follow hostname resolution from local caches to recursive/authoritative DNS without drifting into transport yet.", ["browser/OS cache", "stub resolver", "recursive resolver", "root/TLD/authoritative servers", "A/AAAA/CNAME", "TTL", "negative caching"], ["draw iterative vs recursive roles", "explain caching and failure cases"]),
      s("net-local-delivery", "3. Local network: interface, subnet and next hop", "Determine whether the destination is local and how the host chooses a gateway.", ["IP address/prefix", "subnet test", "routing table", "default route", "ARP for IPv4 / ND for IPv6", "MAC next hop"], ["decide local vs routed delivery", "explain why remote server MAC is not needed"]),
      s("net-ip-routing", "4. IP forwarding across routers", "Track a packet hop by hop at Layer 3.", ["IP header", "TTL/Hop Limit", "routing-table lookup", "longest-prefix match", "fragmentation/PMTU overview", "ICMP basics"], ["explain hop-by-hop forwarding", "separate L2 next hop from L3 destination"]),
      s("net-nat-firewall", "5. NAT, stateful firewalls and edge translation", "Understand what changes at the network edge and what state middleboxes keep.", ["private/public addresses", "SNAT/PAT", "connection state", "inbound vs outbound", "firewall rules"], ["trace translated tuples", "explain why unsolicited inbound traffic behaves differently"]),
      s("net-tcp-handshake", "6. TCP connection establishment", "Build TCP state from the three-way handshake through initial sequence-space setup.", ["SYN/SYN-ACK/ACK", "sequence numbers", "ports/sockets", "MSS", "window scaling", "SACK/timestamps overview"], ["trace handshake fields", "explain what state each endpoint creates"]),
      s("net-tcp-data", "7. TCP reliable byte stream", "Explain segmentation, ACKs, retransmission and receive-side flow control before congestion control.", ["byte stream", "segments", "sequence/ACK numbers", "retransmission", "RTO", "duplicate ACKs", "rwnd", "out-of-order data"], ["trace bytes and ACKs", "separate reliability from flow control"]),
      s("net-tcp-congestion", "8. TCP congestion control", "Reason about sender-side network protection and recovery from loss.", ["cwnd", "slow start", "congestion avoidance", "ssthresh", "fast retransmit/recovery", "loss signals", "rwnd vs cwnd"], ["explain effective send window", "walk cwnd changes after ACK/loss"]),
      s("net-tls", "9. TLS handshake and certificate validation", "Understand how confidentiality, integrity and server authentication are established over TCP.", ["ClientHello/ServerHello", "certificate chain", "hostname validation", "key agreement", "session keys", "TLS 1.3 high-level flow", "resumption"], ["explain what certificates prove", "trace when application data becomes protected"]),
      s("net-http11", "10. HTTP/1.1 request and response", "Only after the connection is secure, reason about the actual application protocol exchange.", ["request line", "headers", "Host", "cookies", "body", "status code", "content length/chunking", "keep-alive"], ["construct a minimal request", "separate HTTP semantics from TCP mechanics"]),
      s("net-response-browser", "11. Response delivery and browser processing", "Close the loop from response bytes to rendered page and follow-up resource requests.", ["stream delivery", "decompression", "cache headers", "HTML parsing", "subresource discovery", "connection reuse"], ["explain why one page triggers many requests", "identify where caching can short-circuit work"]),
      s("net-url-server-retrieval", "12. Full path reconstruction & adversarial retrieval", "Reconstruct the entire URL-to-server path cold and survive follow-up questions without adding new theory.", ["cross-layer ordering", "failure points", "latency contributors", "DNS/TCP/TLS/HTTP boundaries"], ["give a 2-minute and 10-minute explanation", "debug where a failed request could stop"]),
    ],
  },
  {
    slug: "networking-infra", title: "Network infrastructure", track: "E · Networking", order: 420, stage: "core",
    summary: "Infrastructure components between clients and services, taught as separate operational units.", mustKnow: ["subnets", "NAT", "proxies", "load balancers", "timeouts", "connection pooling"],
    sessions: [
      s("net-infra-subnets", "Subnets, CIDR & routing boundaries", "Become fluent in CIDR and route selection for service networks.", ["CIDR", "subnet masks", "route tables", "public/private networks", "default gateway"], ["calculate ranges", "reason about reachability"]),
      s("net-infra-proxies-lb", "Proxies, reverse proxies & load balancers", "Differentiate forwarding components by who they represent and where decisions happen.", ["forward proxy", "reverse proxy", "L4 vs L7 load balancing", "health checks", "sticky sessions"], ["choose L4 vs L7", "trace client IP/headers"]),
      s("net-infra-connections", "Timeouts, keep-alive & connection pools", "Understand why production networking failures often come from lifetime mismatches rather than protocols.", ["connect/read/request/idle timeouts", "keep-alive", "pool sizing", "DNS changes", "connection reuse"], ["diagnose timeout chains", "avoid pool exhaustion"]),
      s("net-infra-failure", "Retries, partial failure & network debugging", "Debug infrastructure symptoms without retry storms.", ["transient vs permanent failure", "retry budget", "backoff/jitter", "idempotency", "packet vs application symptoms"], ["design safe retries", "form a layered debugging plan"]),
    ],
  },
  {
    slug: "networking-modern", title: "Modern protocols", track: "E · Networking", order: 430, stage: "advanced",
    summary: "HTTP/2, QUIC/HTTP/3 and Internet routing after the classic stack is solid.", mustKnow: ["HTTP/2", "QUIC", "HTTP/3", "BGP basics"],
    sessions: [
      s("net-http2", "HTTP/2 framing and multiplexing", "Understand what HTTP/2 changes above TCP and what it cannot fix below TCP.", ["binary framing", "streams", "multiplexing", "HPACK", "flow control", "TCP head-of-line blocking"], ["compare HTTP/1.1 and HTTP/2", "explain remaining HOL blocking"]),
      s("net-quic", "QUIC transport", "Build a mental model of encrypted UDP-based transport with user-space evolution.", ["UDP substrate", "integrated TLS", "connection IDs", "stream independence", "loss recovery", "migration"], ["explain why QUIC uses UDP", "separate packet loss from stream blocking"]),
      s("net-http3", "HTTP/3 on QUIC", "Connect HTTP semantics to QUIC streams and compare deployment behavior.", ["HTTP/3 mapping", "QPACK", "0/1-RTT", "fallback", "operational tradeoffs"], ["compare H2 vs H3", "trace a modern request setup"]),
      s("net-bgp", "BGP and Internet routing basics", "Know enough inter-domain routing to explain how prefixes become globally reachable.", ["AS", "prefix advertisement", "path selection", "peering/transit", "route leaks at a high level"], ["explain AS-path idea", "distinguish BGP from IGP/local routing"]),
    ],
  },
  {
    slug: "os-foundations", title: "Processes, threads & memory", track: "F · Operating Systems", order: 510, stage: "foundation",
    summary: "Execution, privilege and virtual-memory mechanisms behind applications.", mustKnow: ["process/thread", "user/kernel mode", "syscalls", "virtual memory", "paging"],
    sessions: [
      s("os-process-thread", "Processes, threads & context switching", "Separate resource ownership from schedulable execution.", ["process address space", "threads", "context switch", "scheduler basics"], ["compare process vs thread", "explain context-switch cost"]),
      s("os-kernel-syscalls", "User mode, kernel mode & syscalls", "Explain how applications safely request privileged work.", ["CPU privilege", "system calls", "interrupts/exceptions", "file/socket handles"], ["trace a read syscall", "separate library call from syscall"]),
      s("os-virtual-memory", "Virtual memory & paging", "Understand address translation, page faults and protection.", ["virtual address", "page table", "TLB", "page fault", "demand paging", "copy-on-write"], ["trace address translation", "explain page fault behavior"]),
    ],
  },
  {
    slug: "os-concurrency", title: "Concurrency primitives", track: "F · Operating Systems", order: 520, stage: "core",
    summary: "Races, synchronization, deadlocks and visibility.", mustKnow: ["race conditions", "mutex", "semaphore", "atomics", "deadlocks", "memory visibility"],
    sessions: [
      s("os-races-locks", "Race conditions, mutexes & semaphores", "Recognize unsafe interleavings and select basic synchronization.", ["critical section", "mutex", "semaphore", "condition variable"], ["construct a race", "choose lock vs semaphore"]),
      s("os-deadlocks", "Deadlocks & liveness", "Reason about liveness failures beyond data races.", ["Coffman conditions", "lock ordering", "starvation", "livelock"], ["identify deadlock cycles", "design prevention strategies"]),
      s("os-atomics-memory", "Atomics & memory visibility", "Understand why atomicity and ordering are separate concerns.", ["atomic operations", "memory ordering intuition", "visibility", "false assumptions about volatile"], ["explain atomic increment", "identify visibility hazards"]),
    ],
  },
  {
    slug: "os-performance", title: "Hardware-aware performance", track: "F · Operating Systems", order: 530, stage: "advanced",
    summary: "Caches, locality, false sharing and NUMA-aware execution.", mustKnow: ["CPU caches", "locality", "false sharing", "NUMA basics"],
    sessions: [
      s("os-cache-locality", "CPU caches & locality", "Connect memory access patterns to cache behavior.", ["cache lines", "spatial/temporal locality", "working set", "prefetching"], ["predict cache-friendly traversal", "explain why contiguous data helps"]),
      s("os-false-sharing", "False sharing & synchronization cost", "Recognize performance collapse from cache-line ownership bouncing.", ["coherence intuition", "shared cache lines", "padding", "contention"], ["diagnose false sharing", "separate logical sharing from physical sharing"]),
      s("os-numa", "NUMA basics", "Understand why memory placement matters on multi-socket systems.", ["NUMA nodes", "local/remote memory", "first touch", "thread affinity"], ["explain NUMA latency", "outline NUMA-aware placement"]),
    ],
  },
  {
    slug: "distributed-failures", title: "The distributed-systems problem", track: "G · Distributed Systems", order: 610, stage: "foundation",
    summary: "The failure model that makes distributed systems fundamentally different.", mustKnow: ["latency", "partial failure", "clocks", "duplicates", "independent crashes"],
    sessions: [
      s("dist-partial-failure", "Latency and partial failure", "Internalize that timeout does not reveal whether remote work happened.", ["network delay", "timeouts", "crashes", "partitions", "uncertainty"], ["explain ambiguous outcomes", "design around timeout uncertainty"]),
      s("dist-time-order", "Clocks, ordering & causality", "Separate wall-clock time from event ordering.", ["clock skew", "monotonic clocks", "logical ordering", "causality basics"], ["avoid timestamp assumptions", "reason about happened-before"]),
      s("dist-duplicates", "Retries, duplicates & idempotency", "Handle at-least-once behavior safely.", ["retry", "duplicate delivery", "idempotency keys", "deduplication", "exactly-once skepticism"], ["design idempotent operations", "state delivery guarantees precisely"]),
    ],
  },
  {
    slug: "distributed-core", title: "Replication & consistency", track: "G · Distributed Systems", order: 620, stage: "core",
    summary: "Replication, partitioning and consistency tradeoffs under failure.", mustKnow: ["replication", "partitioning", "CAP", "quorums", "leader/follower"],
    sessions: [
      s("dist-replication", "Leader/follower replication", "Understand write propagation, lag and failover.", ["leader", "followers", "log replication", "sync/async", "failover"], ["reason about stale reads", "explain failover data loss risk"]),
      s("dist-cap-consistency", "CAP and consistency models", "Use CAP narrowly and distinguish consistency guarantees.", ["network partition", "availability", "linearizability", "eventual consistency", "read-your-writes"], ["avoid CAP myths", "describe concrete guarantees"]),
      s("dist-quorums", "Quorums and replicated reads/writes", "Reason about overlap and version conflicts.", ["N/R/W", "quorum overlap", "sloppy quorum overview", "read repair"], ["calculate quorum conditions", "explain limitations"]),
    ],
  },
  {
    slug: "distributed-resilience", title: "Resilience & coordination", track: "G · Distributed Systems", order: 630, stage: "advanced",
    summary: "Safe retries, overload protection and consensus-based coordination.", mustKnow: ["retries", "idempotency", "backoff", "circuit breakers", "consensus", "Raft", "multi-region"],
    sessions: [
      s("dist-resilience-patterns", "Backoff, jitter & circuit breakers", "Prevent failure amplification during dependency trouble.", ["retry budgets", "exponential backoff", "jitter", "circuit breaker", "bulkheads"], ["design safe retry policy", "explain retry storms"]),
      s("dist-consensus", "Consensus and Raft mental model", "Understand why replicated agreement needs terms, leaders and majority commitment.", ["leader election", "term", "log replication", "majority", "commit index"], ["walk a Raft write", "explain leader failover"]),
      s("dist-multiregion", "Multi-region system tradeoffs", "Reason about latency, consistency and failure domains across regions.", ["active-active/active-passive", "geo replication", "data residency", "failover", "conflict resolution"], ["choose topology from requirements", "identify cross-region write costs"]),
    ],
  },
  {
    slug: "design-method", title: "System design method", track: "H · System Design", order: 710, stage: "foundation",
    summary: "A repeatable interview method from ambiguous prompt to defensible architecture.", mustKnow: ["requirements", "scale", "APIs", "data model", "architecture", "bottlenecks"],
    sessions: [
      s("design-requirements", "Requirements and scale envelope", "Turn a vague prompt into explicit functional, non-functional and scale assumptions.", ["functional requirements", "SLOs", "traffic/storage estimates", "constraints"], ["ask high-value questions", "derive rough capacity numbers"]),
      s("design-api-data", "API and data model", "Define interfaces and durable data before drawing boxes.", ["API contracts", "entities", "access patterns", "consistency needs"], ["derive schema from access patterns", "state idempotency requirements"]),
      s("design-architecture", "High-level architecture and bottlenecks", "Build the smallest architecture that satisfies requirements, then pressure-test it.", ["stateless services", "load balancing", "cache", "database", "queue", "failure modes"], ["identify bottlenecks", "explain scaling path"]),
    ],
  },
  {
    slug: "design-services", title: "Classic systems", track: "H · System Design", order: 720, stage: "core",
    summary: "Reusable design patterns through representative services.", mustKnow: ["rate limiter", "notifications", "chat", "file storage", "job scheduler", "metrics"],
    sessions: [
      s("design-rate-notify", "Rate limiter & notification service", "Practice counters, queues and delivery guarantees on bounded designs.", ["token bucket", "distributed counters", "queues", "fan-out", "retry/dead-letter"], ["design a global rate limiter", "design reliable notification delivery"]),
      s("design-chat-files", "Chat & file storage", "Practice stateful connections, fan-out and object metadata/data separation.", ["WebSockets", "presence", "message ordering", "object storage", "metadata DB", "CDN"], ["design message flow", "explain upload/download path"]),
      s("design-jobs-metrics", "Job scheduler & metrics pipeline", "Practice delayed work, partitioning and high-throughput ingestion.", ["scheduler", "leases", "workers", "time buckets", "aggregation", "retention"], ["avoid duplicate jobs", "design scalable metric ingestion"]),
    ],
  },
  {
    slug: "design-microsoft", title: "Cloud-scale Microsoft-style systems", track: "H · System Design", order: 730, stage: "advanced",
    summary: "Large-service patterns around identity, regions, fleets and observability.", mustKnow: ["identity platform", "multi-region", "fleet management", "monitoring platform"],
    sessions: [
      s("design-identity-platform", "Identity platform", "Design token issuance/validation, key rotation and regional availability.", ["auth flow", "token service", "JWKS", "key rotation", "revocation tradeoffs"], ["draw trust boundaries", "reason about global validation"]),
      s("design-fleet", "Fleet management control plane", "Design desired-state coordination across many agents/machines.", ["control plane", "agents", "heartbeats", "desired state", "rollout", "leases"], ["design safe rollout", "handle disconnected agents"]),
      s("design-monitoring", "Monitoring/telemetry platform", "Design ingestion, aggregation, retention and query paths.", ["metrics/logs/traces", "high-cardinality data", "streaming", "tiered storage", "alerting"], ["design ingestion backpressure", "separate hot and cold paths"]),
    ],
  },
  {
    slug: "k8s-model", title: "Desired-state model", track: "I · Kubernetes", order: 810, stage: "foundation",
    summary: "Core objects and reconciliation loops.", mustKnow: ["cluster", "control plane", "node", "Pod", "Deployment", "ReplicaSet"],
    sessions: [
      s("k8s-control-model", "Control plane and reconciliation", "Understand Kubernetes as a distributed desired-state control system.", ["API server", "etcd", "controllers", "scheduler", "watch/reconcile"], ["trace object creation", "explain reconciliation"]),
      s("k8s-workloads", "Pods, ReplicaSets & Deployments", "Separate execution units from replica and rollout controllers.", ["Pod", "ReplicaSet", "Deployment", "labels/selectors", "rolling update"], ["trace deployment ownership", "debug selector mistakes"]),
    ],
  },
  {
    slug: "k8s-platform", title: "Networking, storage & configuration", track: "I · Kubernetes", order: 820, stage: "core",
    summary: "How workloads discover each other, persist data and receive configuration.", mustKnow: ["Service", "DNS", "Ingress", "NetworkPolicy", "ConfigMap", "Secret", "PV/PVC"],
    sessions: [
      s("k8s-networking", "Services, DNS & ingress", "Trace traffic from client to Pod and service discovery inside the cluster.", ["ClusterIP", "Service", "EndpointSlice", "DNS", "Ingress/Gateway", "kube-proxy/CNI at high level"], ["trace service routing", "separate ingress from service"]),
      s("k8s-config-security", "ConfigMaps, Secrets & NetworkPolicy", "Understand runtime configuration and network segmentation.", ["ConfigMap", "Secret", "env/volume injection", "NetworkPolicy", "namespace boundaries"], ["choose config delivery", "reason about allowed flows"]),
      s("k8s-storage", "Persistent volumes and claims", "Understand storage lifecycle independent of Pod lifetime.", ["PV", "PVC", "StorageClass", "dynamic provisioning", "access modes"], ["trace claim binding", "explain StatefulSet storage needs"]),
    ],
  },
  {
    slug: "k8s-operations", title: "Operations & internals", track: "I · Kubernetes", order: 830, stage: "advanced",
    summary: "Health, scheduling, resource control and runtime internals.", mustKnow: ["probes", "requests/limits", "HPA", "rolling updates", "scheduler", "etcd", "kubelet", "CNI"],
    sessions: [
      s("k8s-health-resources", "Probes, requests and limits", "Connect health signaling with scheduling and runtime resource behavior.", ["startup/readiness/liveness", "CPU/memory requests", "limits", "OOM", "throttling"], ["choose probes", "diagnose resource pressure"]),
      s("k8s-scheduling-scaling", "Scheduling, autoscaling & rollout", "Understand placement and scaling decisions.", ["scheduler filters/scores", "taints/tolerations", "affinity", "HPA", "maxSurge/maxUnavailable"], ["explain placement", "debug rollout availability"]),
      s("k8s-node-runtime", "kubelet, CNI, CSI & node path", "Trace what happens on a node after scheduling.", ["kubelet", "container runtime", "CNI", "CSI", "pod sandbox"], ["trace Pod startup", "identify node-level failure domains"]),
    ],
  },
  {
    slug: "identity-foundations", title: "Authentication & authorization", track: "J · Identity & Security", order: 910, stage: "foundation",
    summary: "Identity, sessions and access decisions before protocol details.", mustKnow: ["authentication", "authorization", "sessions", "cookies", "tokens"],
    sessions: [
      s("identity-authn-authz", "Authentication vs authorization", "Separate proving identity from deciding access.", ["principal", "credential", "claims", "roles/policies", "least privilege"], ["trace authn→authz", "avoid terminology confusion"]),
      s("identity-sessions", "Sessions, cookies & tokens", "Understand stateful and token-based session mechanisms.", ["session ID", "cookie flags", "server-side session", "bearer token", "CSRF/XSS implications"], ["compare session vs bearer token", "set secure cookie properties"]),
    ],
  },
  {
    slug: "identity-oauth", title: "OAuth / OIDC / JWT", track: "J · Identity & Security", order: 920, stage: "core",
    summary: "Delegated authorization, identity federation and token validation.", mustKnow: ["access token", "ID token", "refresh token", "authorization code", "PKCE", "client credentials", "JWKS"],
    sessions: [
      s("identity-oauth-flow", "OAuth actors and authorization code + PKCE", "Trace the modern browser/mobile delegated authorization flow precisely.", ["resource owner", "client", "authorization server", "resource server", "authorization code", "PKCE", "redirect URI"], ["draw the flow", "explain PKCE threat model"]),
      s("identity-oidc", "OIDC and ID tokens", "Understand what OIDC adds to OAuth and what an ID token is for.", ["OIDC", "ID token", "nonce", "UserInfo", "client audience"], ["separate ID vs access token", "explain login semantics"]),
      s("identity-jwt-validation", "JWT validation, refresh and key rotation", "Validate tokens and reason about key lifecycle.", ["header/payload/signature", "issuer", "audience", "exp/nbf", "JWKS", "kid", "refresh token rotation"], ["list validation checks", "explain key rotation without downtime"]),
    ],
  },
  {
    slug: "identity-enterprise", title: "Enterprise identity", track: "J · Identity & Security", order: 930, stage: "advanced",
    summary: "Policy models, federation and identity lifecycle in organizations.", mustKnow: ["RBAC", "ABAC", "SAML", "SCIM", "managed identities", "zero trust", "key rotation"],
    sessions: [
      s("identity-rbac-abac", "RBAC, ABAC & policy design", "Model authorization rules that scale beyond hard-coded checks.", ["roles", "permissions", "attributes", "policy evaluation", "least privilege"], ["choose RBAC vs ABAC", "avoid role explosion"]),
      s("identity-federation-provisioning", "SAML, federation & SCIM", "Understand enterprise SSO and account lifecycle provisioning.", ["SAML assertions", "IdP/SP", "federation", "SCIM provisioning/deprovisioning"], ["trace SSO", "separate auth federation from provisioning"]),
      s("identity-workload", "Workload identity & zero trust", "Authenticate services without long-lived shared secrets.", ["managed identities", "service principals", "workload federation", "short-lived credentials", "zero trust"], ["design secretless service auth", "explain continuous authorization assumptions"]),
    ],
  },
  {
    slug: "azure-compute", title: "Compute & orchestration", track: "K · Azure", order: 1010, stage: "foundation",
    summary: "Azure compute choices and operational tradeoffs.", mustKnow: ["VMs", "App Service", "Functions", "AKS"],
    sessions: [
      s("azure-compute-options", "VMs, App Service & Functions", "Choose managed compute from workload shape and operational needs.", ["VMs", "App Service", "Functions", "scale", "cold start", "deployment model"], ["choose compute option", "explain responsibility tradeoff"]),
      s("azure-aks", "AKS mental model", "Connect managed Kubernetes responsibilities to Azure integration.", ["AKS control plane", "node pools", "identity", "networking", "upgrades"], ["state Azure vs user responsibility", "outline production AKS concerns"]),
    ],
  },
  {
    slug: "azure-data", title: "Data & messaging", track: "K · Azure", order: 1020, stage: "core",
    summary: "Managed storage, databases and messaging services.", mustKnow: ["Blob", "Azure SQL", "Cosmos DB", "Service Bus", "Event Hubs"],
    sessions: [
      s("azure-storage-db", "Blob, Azure SQL & Cosmos DB", "Map storage models to access and consistency requirements.", ["Blob Storage", "Azure SQL", "Cosmos DB", "partition key", "consistency"], ["choose data service", "explain Cosmos partitioning"]),
      s("azure-messaging", "Service Bus vs Event Hubs", "Separate work/message brokering from high-throughput event streaming.", ["queues/topics", "dead-letter", "sessions", "Event Hubs partitions", "consumer groups"], ["choose Service Bus vs Event Hubs", "design consumer scaling"]),
    ],
  },
  {
    slug: "azure-platform", title: "Identity, networking & observability", track: "K · Azure", order: 1030, stage: "advanced",
    summary: "Platform primitives that make cloud services secure, reachable and operable.", mustKnow: ["Entra ID", "Managed Identity", "Key Vault", "VNet", "Front Door", "Azure Monitor"],
    sessions: [
      s("azure-identity-secrets", "Entra ID, Managed Identity & Key Vault", "Connect identity-based access to secret/certificate management.", ["Entra ID", "managed identity", "RBAC", "Key Vault", "secret rotation"], ["design secretless access", "trace token-based service auth"]),
      s("azure-networking", "VNets, private access & Front Door", "Understand service exposure from private networks to global edge.", ["VNet/subnet", "NSG", "Private Endpoint", "DNS", "Front Door"], ["design private service access", "explain global ingress"]),
      s("azure-monitor", "Azure Monitor & application observability", "Know the telemetry path from service to dashboards/alerts.", ["metrics", "logs", "Application Insights", "alerts", "distributed tracing"], ["choose signal type", "design actionable alerts"]),
    ],
  },
  {
    slug: "behavioral-stories", title: "STAR(R) story bank", track: "L · Behavioral", order: 1110, stage: "foundation",
    summary: "Reusable evidence for behavioral questions, with concrete outcomes and reflection.", mustKnow: ["challenge", "failure", "conflict", "leadership", "ambiguity", "user impact"],
    sessions: [
      s("behavioral-inventory", "Build the story inventory", "Identify experiences that cover common behavioral dimensions without inventing stories.", ["challenge", "failure", "conflict", "leadership", "ambiguity", "impact"], ["map one story to several competencies", "identify evidence gaps"]),
      s("behavioral-starr", "Turn raw events into STAR(R)", "Structure stories around personal action, measurable result and reflection.", ["Situation", "Task", "Action", "Result", "Reflection"], ["separate team action from your action", "quantify outcome where possible"]),
    ],
  },
  {
    slug: "behavioral-delivery", title: "Concise interview delivery", track: "L · Behavioral", order: 1120, stage: "core",
    summary: "Deliver strong stories under time pressure and follow-up questioning.", mustKnow: ["Situation", "Task", "Action", "Result", "Reflection", "metrics"],
    sessions: [
      s("behavioral-compression", "90-second story delivery", "Compress context and spend most time on decisions/actions.", ["hook", "minimal context", "action detail", "result", "reflection"], ["deliver in 90 seconds", "remove irrelevant setup"]),
      s("behavioral-followups", "Adversarial follow-ups", "Defend tradeoffs, ownership and lessons without sounding scripted.", ["why", "alternatives", "conflict", "failure", "what would you change", "metrics"], ["answer follow-ups directly", "admit uncertainty while preserving ownership"]),
    ],
  },
];
