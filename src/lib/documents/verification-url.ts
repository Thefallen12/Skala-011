export type VerificationDocumentKind =
  | "po"
  | "do"
  | "invoice"
  | "ko"
  | "spk"
  | "bast"
  | "issued";

export function documentVerificationPath(
  kind: VerificationDocumentKind,
  code: string,
): string {
  return `/verify/result/${kind}/${encodeURIComponent(code)}`;
}
