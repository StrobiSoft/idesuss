export function userStatusBadges({ role, isVip } = {}) {
  const badges = [];
  if (role === "owner") badges.push({ icon: "👑", label: "Platform Owner" });
  else if (role === "admin") badges.push({ icon: "🛡️", label: "Admin" });
  else if (role === "moderator") badges.push({ icon: "🛡️", label: "Moderátor" });
  if (isVip) badges.push({ icon: "💎", label: "VIP" });
  return badges;
}

export function userStatusSuffix(status) {
  return userStatusBadges(status).map((badge) => badge.icon).join(" ");
}

export function formatUserDisplayName(name, status) {
  const suffix = userStatusSuffix(status);
  return suffix ? `${name} ${suffix}` : name;
}

export async function loadUserBadgeMap(client, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return new Map();

  const { data, error } = await client.rpc("get_user_public_badges", {
    p_user_ids: ids
  });
  if (error) throw error;

  return new Map((data || []).map((item) => [
    item.id,
    { role: item.role, isVip: item.is_vip === true }
  ]));
}
