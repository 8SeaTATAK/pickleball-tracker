// 积分榜统计：从已完成的对局汇总
//   积分 = 胜场 × winPoints + 负场 × lossPoints（俱乐部可配置，默认 3 / 1）
//   排序：积分 → 胜率 → 净胜分 → 场次

function aggregate(matches, settings = {}) {
  const winPoints = settings.winPoints == null ? 3 : settings.winPoints;
  const lossPoints = settings.lossPoints == null ? 1 : settings.lossPoints;
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) {
      rows.set(id, { userId: id, games: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }
    return rows.get(id);
  };

  for (const m of matches) {
    if (m.status !== 'done') continue;
    const sides = [
      [m.teamA, m.scoreA, m.scoreB],
      [m.teamB, m.scoreB, m.scoreA],
    ];
    for (const [team, own, opp] of sides) {
      for (const id of team) {
        const r = row(id);
        r.games++;
        r.pointsFor += own;
        r.pointsAgainst += opp;
        if (own > opp) r.wins++;
        else r.losses++;
      }
    }
  }

  return Array.from(rows.values())
    .map((r) => ({
      ...r,
      diff: r.pointsFor - r.pointsAgainst,
      winRate: r.games ? Math.round((r.wins / r.games) * 1000) / 10 : 0,
      score: r.wins * winPoints + r.losses * lossPoints,
    }))
    .sort(
      (a, b) => b.score - a.score || b.winRate - a.winRate || b.diff - a.diff || b.games - a.games
    )
    .map((r, i) => ({ rank: i + 1, ...r }));
}

module.exports = { aggregate };
