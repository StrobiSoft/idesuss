export const PRESENCE_POLICY = Object.freeze({
  heartbeatRpc: "heartbeat_my_presence",
  offlineRpc: "set_my_presence_offline",
  listRpc: "list_online_users",
  heartbeatIntervalMs: 15000,
  staleAfterMs: 30000,
  pageField: "p_page",
  anonymousWeb: Object.freeze({
    heartbeatIntervalMs: 15000,
    staleAfterMs: 30000,
    tabTtlMs: 45000,
    tabPrefix: "idesuss_online_tab_"
  })
});
