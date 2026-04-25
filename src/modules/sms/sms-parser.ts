import type { ParsedSmsTransaction } from "./sms.schemas.js";
import { normalizeSmsText, stripBalanceText } from "./sms-normalizer.js";

function parseAmount(input: string): number | null {
  const match = input.match(/(?:ksh|kes)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  return Number(match[1].replaceAll(",", ""));
}

function parseReference(input: string): string | null {
  const match = input.match(/\b([A-Z0-9]{8,16})\b/);
  return match?.[1] ?? null;
}

function parsePhone(input: string): string | null {
  const match = input.match(/\b(?:\+254|254|0)?7\d{8}\b/);
  return match?.[0] ?? null;
}

function parseTransactionDate(input: string): string | null {
  const match = input.match(/\bon (\d{1,2}\/\d{1,2}\/\d{2,4}) at (\d{1,2}:\d{2} (?:AM|PM))\b/i);
  if (!match) return null;
  return `${match[1]} ${match[2]}`;
}

function detectProvider(input: string): ParsedSmsTransaction["provider"] {
  if (/m-pesa|mpesa|safaricom/i.test(input)) return "mpesa";
  if (/bank|equity|kcb|coop|absa|stanbic/i.test(input)) return "bank";
  return "unknown";
}

function detectTransactionType(input: string): ParsedSmsTransaction["transactionType"] {
  if (/reversal/i.test(input)) return "reversal";
  if (/received|sent to you|deposit/i.test(input)) return "income";
  if (/paid to|pay bill|bought|spent|purchase/i.test(input)) return "expense";
  if (/sent to|withdraw|transfer/i.test(input)) return "transfer";
  return "unknown";
}

function parseMerchant(input: string): string | null {
  const patterns = [
    /paid to\s+([^.,]+?)(?:\s+on|\s+for|\.|,|$)/i,
    /from\s+([^.,]+?)(?:\s+on|\s+for|\.|,|$)/i,
    /at\s+([^.,]+?)(?:\s+on|\s+for|\.|,|$)/i,
    /to\s+([^.,]+?)(?:\s+on|\s+for|\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function buildDescription(
  transactionType: ParsedSmsTransaction["transactionType"],
  merchantName: string | null,
  input: string,
) {
  if (merchantName) {
    if (transactionType === "expense") return `Payment to ${merchantName}`;
    if (transactionType === "income") return `Received from ${merchantName}`;
    if (transactionType === "transfer") return `Transfer involving ${merchantName}`;
  }
  return normalizeSmsText(input);
}

export function parseSmsTransaction(message: string): ParsedSmsTransaction {
  const normalizedMessage = normalizeSmsText(message);
  const { cleanText, removedBalanceText } = stripBalanceText(normalizedMessage);
  const provider = detectProvider(cleanText);
  const transactionType = detectTransactionType(cleanText);
  const merchantName = parseMerchant(cleanText);
  const amount = parseAmount(cleanText);
  const reference = parseReference(cleanText);
  const counterpartyPhone = parsePhone(cleanText);
  const transactionDate = parseTransactionDate(cleanText);

  let confidence = 0.45;
  if (provider !== "unknown") confidence += 0.15;
  if (transactionType !== "unknown") confidence += 0.15;
  if (amount !== null) confidence += 0.1;
  if (merchantName) confidence += 0.1;
  if (removedBalanceText) confidence += 0.05;

  return {
    provider,
    transactionType,
    amount,
    currency: "KES",
    merchantName,
    counterpartyPhone,
    reference,
    transactionDate,
    cleanDescription: buildDescription(transactionType, merchantName, cleanText),
    removedBalanceText,
    confidence: Math.min(0.98, Number(confidence.toFixed(2))),
  };
}
