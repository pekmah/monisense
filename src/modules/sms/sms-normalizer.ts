const balancePatterns = [
  /new m-pesa balance is[^.]*\.?/i,
  /m-pesa balance is[^.]*\.?/i,
  /available balance[^.]*\.?/i,
  /remaining balance[^.]*\.?/i,
  /balance is[^.]*\.?/i,
];

export function normalizeSmsText(message: string) {
  return message.replace(/\s+/g, " ").trim();
}

export function stripBalanceText(message: string) {
  let cleanText = normalizeSmsText(message);
  const removed: string[] = [];

  for (const pattern of balancePatterns) {
    const match = cleanText.match(pattern);
    if (!match) continue;
    removed.push(match[0].trim());
    cleanText = cleanText.replace(pattern, " ").replace(/\s+/g, " ").trim();
  }

  return {
    cleanText,
    removedBalanceText: removed.length > 0 ? removed.join(" ") : null,
  };
}
