/** A JSON-LD node. Values are constrained to what @context allows to appear. */
export type JsonLdValue = string | number | boolean | JsonLdNode | readonly JsonLdValue[];

export interface JsonLdNode {
  readonly [key: string]: JsonLdValue | undefined;
}

export interface BreadcrumbEntry {
  readonly name: string;
  /** Route path beginning with a slash. */
  readonly route: string;
}

export interface HowToStep {
  readonly name: string;
  readonly text: string;
}
