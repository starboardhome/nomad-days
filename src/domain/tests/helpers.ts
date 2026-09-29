import { jurisdictionById } from '../../rules';
import type { Jurisdiction, RuleKind, RuleOf } from '../../rules/schema';
import { toDayNum } from '../days';
import type { Stay } from '../presence';

export const day = toDayNum;

export const stay = (country: string, entry: string, exit?: string): Stay => ({ country, entry, exit });

export const bundled = (id: string): Jurisdiction => {
  const j = jurisdictionById(id);
  if (!j) throw new Error(`missing bundled jurisdiction "${id}"`);
  return j;
};

export const ruleOf = <K extends RuleKind>(jurisdictionId: string, ruleId: string, kind: K): RuleOf<K> => {
  const rule = bundled(jurisdictionId).rules.find((r) => r.id === ruleId);
  if (!rule || rule.kind !== kind) throw new Error(`missing ${kind} rule "${ruleId}"`);
  return rule as RuleOf<K>;
};
